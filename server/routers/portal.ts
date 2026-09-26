import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { categories, comments, contactMessages, events, galleryImages, news } from "../../drizzle/schema";
import {
  getAdminComments, getAdminMessages, getAdminNews, getAdminSummary, getAllCategories,
  getApprovedComments, getGallery, getHomeData, getNewsBySlug, getPublishedEvents, listNews,
  getDb, isDesignatedAdmin, writeAudit,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { consumeRateLimit } from "../_core/rateLimit";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!(await isDesignatedAdmin(ctx.user))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à administração." });
  }
  return next({ ctx });
});

const cleanText = (value: string) => value.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim();
const slugify = (value: string) => cleanText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const imagePath = z.string().max(1024).refine(value => value.startsWith("/manus-storage/") || /^https:\/\//.test(value), "Use uma URL HTTPS ou uma imagem armazenada no portal.");

const newsInput = z.object({
  id: z.number().optional(),
  title: z.string().min(6).max(220),
  excerpt: z.string().min(20).max(1000),
  content: z.string().min(40).max(20000),
  coverImage: imagePath.nullable().optional(),
  categoryId: z.number().nullable().optional(),
  status: z.enum(["draft", "published"]),
  featured: z.boolean().default(false),
});

export const portalRouter = router({
  home: publicProcedure.query(getHomeData),
  categories: publicProcedure.query(getAllCategories),
  news: publicProcedure.input(z.object({ search: z.string().max(100).optional(), category: z.string().max(100).optional() }).optional()).query(({ input }) => listNews(input?.search, input?.category)),
  newsBySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(240) })).query(({ input }) => getNewsBySlug(input.slug)),
  events: publicProcedure.query(getPublishedEvents),
  gallery: publicProcedure.input(z.object({ category: z.string().max(100).optional() }).optional()).query(({ input }) => getGallery(input?.category)),
  comments: publicProcedure.input(z.object({ newsId: z.number() })).query(({ input }) => getApprovedComments(input.newsId)),
  addComment: publicProcedure.input(z.object({ newsId: z.number(), authorName: z.string().min(2).max(100), content: z.string().min(4).max(800) })).mutation(async ({ input, ctx }) => {
    const rate = consumeRateLimit(ctx.req, "comment", 5, 10 * 60_000);
    if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde alguns minutos." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const authorName = cleanText(input.authorName);
    const content = cleanText(input.content);
    if (authorName.length < 2 || content.length < 4) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe nome e comentário válidos." });
    const fingerprint = `${input.newsId}:${authorName.toLowerCase()}:${content.toLowerCase()}`.slice(0, 64);
    const duplicate = await db.select().from(comments).where(eq(comments.fingerprint, fingerprint)).limit(1);
    if (duplicate.length) throw new TRPCError({ code: "CONFLICT", message: "Este comentário já foi enviado." });
    const recent = await db.select().from(comments).where(and(eq(comments.newsId, input.newsId), eq(comments.authorName, authorName))).orderBy(desc(comments.createdAt)).limit(5);
    const hasRecent = recent.some(row => Date.now() - row.createdAt.getTime() < 60_000);
    if (hasRecent) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Aguarde um momento antes de comentar novamente." });
    await db.insert(comments).values({ newsId: input.newsId, authorName, content, fingerprint, status: "pending" });
    return { success: true, message: "Comentário recebido e aguardando moderação." };
  }),
  contact: publicProcedure.input(z.object({ name: z.string().min(2).max(120), email: z.string().email().max(320), subject: z.string().min(3).max(180), message: z.string().min(10).max(2500) })).mutation(async ({ input, ctx }) => {
    const rate = consumeRateLimit(ctx.req, "contact", 3, 10 * 60_000);
    if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas mensagens. Aguarde alguns minutos." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(contactMessages).values({ name: cleanText(input.name), email: input.email.trim().toLowerCase(), subject: cleanText(input.subject), message: cleanText(input.message) });
    return { success: true };
  }),
  admin: router({
    summary: adminProcedure.query(getAdminSummary),
    news: adminProcedure.query(getAdminNews),
    comments: adminProcedure.query(getAdminComments),
    messages: adminProcedure.query(getAdminMessages),
    saveNews: adminProcedure.input(newsInput).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const title = cleanText(input.title);
      const excerpt = cleanText(input.excerpt);
      const content = cleanText(input.content);
      const baseSlug = slugify(title) || `noticia-${Date.now()}`;
      const values = { title, slug: input.id ? baseSlug : `${baseSlug}-${Date.now().toString().slice(-5)}`, excerpt, content, coverImage: input.coverImage ?? null, categoryId: input.categoryId ?? null, status: input.status, featured: input.featured, authorId: ctx.user.id, authorName: ctx.user.name || "ACORJUVE", publishedAt: input.status === "published" ? new Date() : null };
      if (input.id) {
        await db.update(news).set(values).where(eq(news.id, input.id));
        await writeAudit(ctx.user.id, "update", "news", String(input.id), title);
        return { id: input.id };
      }
      const result = await db.insert(news).values(values);
      const id = Number(result[0].insertId);
      await writeAudit(ctx.user.id, "create", "news", String(id), title);
      return { id };
    }),
    deleteNews: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(news).where(eq(news.id, input.id)); await writeAudit(ctx.user.id, "delete", "news", String(input.id)); return { success: true };
    }),
    saveEvent: adminProcedure.input(z.object({ id: z.number().optional(), title: z.string().min(4).max(220), description: z.string().min(20).max(4000), location: z.string().min(3).max(220), startAt: z.date(), endAt: z.date().nullable().optional(), imageUrl: imagePath.nullable().optional(), status: z.enum(["draft", "published"]) })).mutation(async ({ input, ctx }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const values = { ...input, title: cleanText(input.title), description: cleanText(input.description), location: cleanText(input.location), imageUrl: input.imageUrl ?? null, endAt: input.endAt ?? null, createdBy: ctx.user.id };
      if (input.id) { await db.update(events).set(values).where(eq(events.id, input.id)); await writeAudit(ctx.user.id, "update", "event", String(input.id), values.title); return { id: input.id }; }
      const result = await db.insert(events).values(values); const id = Number(result[0].insertId); await writeAudit(ctx.user.id, "create", "event", String(id), values.title); return { id };
    }),
    deleteEvent: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.delete(events).where(eq(events.id, input.id)); await writeAudit(ctx.user.id, "delete", "event", String(input.id)); return { success: true }; }),
    saveGallery: adminProcedure.input(z.object({ title: z.string().min(3).max(180), altText: z.string().min(5).max(240), category: z.string().min(2).max(100), imageUrl: imagePath, featured: z.boolean().default(false) })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const result = await db.insert(galleryImages).values({ ...input, title: cleanText(input.title), altText: cleanText(input.altText), category: cleanText(input.category), uploadedBy: ctx.user.id }); const id = Number(result[0].insertId); await writeAudit(ctx.user.id, "create", "gallery", String(id), input.title); return { id }; }),
    deleteGallery: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.delete(galleryImages).where(eq(galleryImages.id, input.id)); await writeAudit(ctx.user.id, "delete", "gallery", String(input.id)); return { success: true }; }),
    saveCategory: adminProcedure.input(z.object({ name: z.string().min(2).max(80) })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const name = cleanText(input.name); await db.insert(categories).values({ name, slug: `${slugify(name)}-${Date.now().toString().slice(-4)}` }); await writeAudit(ctx.user.id, "create", "category", undefined, name); return { success: true }; }),
    moderateComment: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["pending", "approved", "hidden", "blocked"]) })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(comments).set({ status: input.status }).where(eq(comments.id, input.id)); await writeAudit(ctx.user.id, input.status, "comment", String(input.id)); return { success: true }; }),
    deleteComment: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.delete(comments).where(eq(comments.id, input.id)); await writeAudit(ctx.user.id, "delete", "comment", String(input.id)); return { success: true }; }),
    markMessage: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["new", "read", "archived"]) })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(contactMessages).set({ status: input.status }).where(eq(contactMessages.id, input.id)); await writeAudit(ctx.user.id, input.status, "message", String(input.id)); return { success: true }; }),
    uploadImage: adminProcedure.input(z.object({ filename: z.string().min(1).max(160), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(20).max(7_000_000) })).mutation(async ({ input, ctx }) => {
      const raw = Buffer.from(input.base64, "base64");
      if (raw.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A imagem deve ter no máximo 5 MB." });
      const valid = (input.mimeType === "image/jpeg" && raw[0] === 0xff && raw[1] === 0xd8) || (input.mimeType === "image/png" && raw.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) || (input.mimeType === "image/webp" && raw.subarray(0, 4).toString() === "RIFF" && raw.subarray(8, 12).toString() === "WEBP");
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "O arquivo de imagem não é válido." });
      const extension = input.mimeType.split("/")[1] === "jpeg" ? "jpg" : input.mimeType.split("/")[1];
      const basename = cleanText(input.filename).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 90) || "imagem";
      const safeName = `${Date.now()}-${basename}.${extension}`;
      const stored = await storagePut(`acorjuve/${ctx.user.id}/${safeName}`, raw, input.mimeType);
      await writeAudit(ctx.user.id, "upload", "image", stored.key, safeName);
      return { url: stored.url, key: stored.key };
    }),
  }),
});
