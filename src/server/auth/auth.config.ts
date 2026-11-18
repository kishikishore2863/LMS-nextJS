import type { NextAuthConfig } from "next-auth";
import type { Role } from "./roles";

/**
 * Edge-safe Auth.js config shared by proxy.ts and the full auth instance.
 * Must not import Prisma or bcrypt.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "LEARNER";
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.role === "string") session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
