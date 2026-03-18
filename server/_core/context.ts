import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const cookies = opts.req.headers.cookie
    ? Object.fromEntries(opts.req.headers.cookie.split('; ').map(c => c.split('=')))
    : {};
  const sessionCookie = cookies[COOKIE_NAME];

  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(sessionCookie, secret, {
        algorithms: ['HS256'],
      });
      const { sub: openId } = payload as { sub?: string };
      if (openId) {
        const existingUser = await db.getUserByOpenId(openId);
        if (existingUser) {
          user = existingUser;
          await db.upsertUser({ openId, lastSignedIn: new Date() });
        }
      }
    } catch (error) {
      console.warn('[Auth] Session verification failed', String(error));
    }
  }

  return { req: opts.req, res: opts.res, user };
}
