import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { isDesignatedAdminEmail } from "./db";
import type { TrpcContext } from "./_core/context";

function context(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: `${role}-account`,
      email: `${role}@example.com`,
      name: role === "admin" ? "Administrador" : "Visitante",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function designatedAdminContext(): TrpcContext {
  return { ...context("admin"), user: { ...context("admin").user!, email: "guerreiroedimilton@gmail.com" } };
}

describe("ACORJUVE administrator access", () => {
  it("recognizes only the designated administrator email", () => {
    expect(isDesignatedAdminEmail("guerreiroedimilton@gmail.com")).toBe(true);
    expect(isDesignatedAdminEmail("edimiltoxavier008@gmail.com")).toBe(false);
  });

  it("rejects a signed-in non-administrator before reaching content controls", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.portal.admin.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the designated email to pass the administrator gate", async () => {
    const caller = appRouter.createCaller(designatedAdminContext());
    await expect(caller.portal.admin.summary()).resolves.toMatchObject({ news: expect.any(Number), events: expect.any(Number), gallery: expect.any(Number), comments: expect.any(Number), messages: expect.any(Number) });
  });

  it("keeps public home content available without authentication", async () => {
    const caller = appRouter.createCaller({ ...context("user"), user: null });
    await expect(caller.portal.home()).resolves.toMatchObject({ news: [], events: [], gallery: [] });
  });
});
