import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const adminEmail = process.env.ADMIN_EMAIL!;
        const adminHash = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD!;

        if (email !== adminEmail) return null;

        // ponytail: no user table — single admin via env vars only
        const valid = adminHash.startsWith("$2")
          ? await bcrypt.compare(password, adminHash)
          : password === adminHash;

        if (!valid) return null;
        return { id: "1", email, name: "Admin" };
      },
    }),
  ],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
});
