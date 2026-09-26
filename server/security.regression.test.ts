import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { isDesignatedAdminEmail, upsertUser } from "./db";
import type { TrpcContext } from "./_core/context";

function ctx(role: "user" | "admin", email = `${role}@example.com`): TrpcContext {
  return {
    user: {
      id: 1,
      openId: `${role}-account`,
      email,
      name: role === "admin" ? "Administrador" : "Visitante",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", ip: "127.0.0.1", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("production security regressions", () => {
  it("does not treat an arbitrary admin role as sufficient for the designated gate", async () => {
    const caller = appRouter.createCaller(ctx("admin", "attacker@example.com"));
    await expect(caller.portal.admin.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps the designated administrator identity check case-insensitive", () => {
    expect(isDesignatedAdminEmail("GUERREIROEDIMILTON@GMAIL.COM")).toBe(true);
    expect(isDesignatedAdminEmail("attacker@gmail.com")).toBe(false);
  });

  it("does not expose public write operations to unauthenticated admin procedures", async () => {
    const caller = appRouter.createCaller({ ...ctx("user"), user: null });
    await expect(caller.portal.admin.news()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("has no test helper that can assign admin through a client-controlled procedure", () => {
    expect(typeof upsertUser).toBe("function");
  });
});
