"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", { ...form, redirect: false });
    if (res?.error) {
      setError("פרטי כניסה שגויים.");
    } else {
      router.push("/admin/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--surface)" }}>
      <div className="w-full max-w-sm p-8 rounded-2xl shadow-sm border" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          כניסה לניהול
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="אימייל"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11 px-4 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm"
            style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
          />
          <input
            type="password"
            placeholder="סיסמה"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-11 px-4 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm"
            style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
