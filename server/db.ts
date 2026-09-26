import { and, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAuditLogs,
  siteSettings,
  categories,
  comments,
  contactMessages,
  events,
  galleryImages,
  InsertUser,
  User,
  news,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const DESIGNATED_ADMIN_EMAIL = (process.env.ACORJUVE_ADMIN_EMAIL ?? "guerreiroedimilton@gmail.com").trim().toLowerCase();

export function isDesignatedAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === DESIGNATED_ADMIN_EMAIL;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  // Only change the role when the caller supplied a trusted, current role or
  // when the OAuth identity includes an email that we can use for the initial
  // administrator bootstrap. In particular, a later session refresh often
  // contains only openId + lastSignedIn; it must NEVER downgrade an existing
  // administrator to "user" just because the email is absent.
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.email !== undefined) {
    values.role = isDesignatedAdminEmail(user.email) ? "admin" : "user";
    updateSet.role = values.role;
  }

  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  if (values.role === "admin") {
    // The designated OAuth identity is the only account allowed to claim the
    // administrator role. Once claimed, persist the immutable openId so future
    // authorization checks do not depend on a mutable display/email field.
    const lockedOpenId = await getSiteSetting("admin_open_id");
    if (!lockedOpenId) {
      await setSiteSetting("admin_open_id", user.openId);
    }
    await db.update(users).set({ role: "user" }).where(ne(users.openId, user.openId));
  }
}

export async function getSiteSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result[0]?.value;
}

export async function setSiteSetting(key: string, value: string, updatedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(siteSettings).values({ key, value, updatedBy: updatedBy ?? null }).onDuplicateKeyUpdate({
    set: { value, updatedBy: updatedBy ?? null, updatedAt: new Date() },
  });
}

export async function isDesignatedAdmin(user: Pick<User, "openId" | "email" | "role">) {
  if (user.role !== "admin") return false;
  const lockedOpenId = ENV.acorjuveAdminOpenId.trim();
  if (lockedOpenId) return user.openId === lockedOpenId;

  const persistedOpenId = await getSiteSetting("admin_open_id");
  if (persistedOpenId) return user.openId === persistedOpenId;

  // Bootstrap only: the first authenticated account matching the configured
  // admin email can claim the admin identity. After that, the openId is locked
  // in siteSettings and the email alone is no longer sufficient.
  return isDesignatedAdminEmail(user.email);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getHomeData() {
  const db = await getDb();
  if (!db) return { news: [], events: [], gallery: [] };
  const [publishedNews, publishedEvents, featuredGallery] = await Promise.all([
    db
      .select({
        id: news.id, title: news.title, slug: news.slug, excerpt: news.excerpt, coverImage: news.coverImage,
        publishedAt: news.publishedAt, authorName: news.authorName, category: categories.name,
      })
      .from(news)
      .leftJoin(categories, eq(news.categoryId, categories.id))
      .where(eq(news.status, "published"))
      .orderBy(desc(news.publishedAt))
      .limit(3),
    db.select().from(events).where(and(eq(events.status, "published"), sql`${events.startAt} >= NOW()`)).orderBy(events.startAt).limit(3),
    db.select().from(galleryImages).orderBy(desc(galleryImages.featured), desc(galleryImages.createdAt)).limit(6),
  ]);
  return { news: publishedNews, events: publishedEvents, gallery: featuredGallery };
}

export async function listNews(search?: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(news.status, "published")];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    filters.push(or(like(news.title, term), like(news.excerpt, term))!);
  }
  if (category && category !== "all") filters.push(eq(categories.slug, category));
  return db
    .select({
      id: news.id, title: news.title, slug: news.slug, excerpt: news.excerpt, content: news.content, coverImage: news.coverImage,
      publishedAt: news.publishedAt, authorName: news.authorName, category: categories.name, categorySlug: categories.slug,
    })
    .from(news)
    .leftJoin(categories, eq(news.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(desc(news.publishedAt));
}

export async function getNewsBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const item = await db
    .select({
      id: news.id, title: news.title, slug: news.slug, excerpt: news.excerpt, content: news.content, coverImage: news.coverImage,
      publishedAt: news.publishedAt, authorName: news.authorName, category: categories.name,
    })
    .from(news)
    .leftJoin(categories, eq(news.categoryId, categories.id))
    .where(and(eq(news.slug, slug), eq(news.status, "published")))
    .limit(1);
  return item[0];
}

export async function getApprovedComments(newsId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(and(eq(comments.newsId, newsId), eq(comments.status, "approved"))).orderBy(desc(comments.createdAt));
}

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.name);
}

export async function getPublishedEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.status, "published")).orderBy(events.startAt);
}

export async function getGallery(category?: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(galleryImages).where(category && category !== "all" ? eq(galleryImages.category, category) : undefined).orderBy(desc(galleryImages.createdAt));
}

export async function writeAudit(adminId: number, action: string, entityType: string, entityId?: string, details?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditLogs).values({ adminId, action, entityType, entityId, details });
}

export async function getAdminSummary() {
  const db = await getDb();
  if (!db) return { news: 0, events: 0, gallery: 0, comments: 0, messages: 0 };
  const count = async (table: typeof news | typeof events | typeof galleryImages | typeof comments | typeof contactMessages) => {
    const result = await db.select({ count: sql<number>`count(*)` }).from(table);
    return Number(result[0]?.count ?? 0);
  };
  const [newsCount, eventCount, galleryCount, commentCount, messageCount] = await Promise.all([count(news), count(events), count(galleryImages), count(comments), count(contactMessages)]);
  return { news: newsCount, events: eventCount, gallery: galleryCount, comments: commentCount, messages: messageCount };
}

export async function getAdminNews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(news).orderBy(desc(news.updatedAt));
}

export async function getAdminComments() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: comments.id, authorName: comments.authorName, content: comments.content, status: comments.status, createdAt: comments.createdAt, newsTitle: news.title })
    .from(comments).leftJoin(news, eq(comments.newsId, news.id)).orderBy(desc(comments.createdAt));
}

export async function getAdminMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
}
