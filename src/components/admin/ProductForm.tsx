"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Category = { id: number; name: string; slug: string };
type ProductData = {
  id?: number;
  name: string;
  description: string;
  price: string;
  categoryId: number | null;
  inStock: boolean;
  featured: boolean;
  imageUrl: string | null;
  imagePublicId: string | null;
};

export default function ProductForm({
  initial,
  categories,
}: {
  initial?: Partial<ProductData>;
  categories: Category[];
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<ProductData>({
    name: "",
    description: "",
    price: "",
    categoryId: null,
    inStock: true,
    featured: false,
    imageUrl: null,
    imagePublicId: null,
    ...initial,
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setForm((f) => ({ ...f, imageUrl: data.url, imagePublicId: data.publicId }));
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = { ...form, price: form.price };
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch("/api/admin/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { id: initial!.id, ...payload } : payload),
    });

    if (!res.ok) {
      setError("שגיאה בשמירה.");
    } else {
      router.push("/admin/products");
      router.refresh();
    }
    setSaving(false);
  }

  const inputClass = "h-11 px-4 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-full";
  const inputStyle = { borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>שם המוצר *</label>
        <input className={inputClass} style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>תיאור</label>
        <textarea
          rows={3}
          className="px-4 py-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm resize-none"
          style={inputStyle}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>מחיר (₪) *</label>
        <input type="number" min="0" step="0.01" className={inputClass} style={inputStyle} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>קטגוריה</label>
        <select
          className={inputClass}
          style={inputStyle}
          value={form.categoryId ?? ""}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value) : null })}
        >
          <option value="">ללא קטגוריה</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} />
          במלאי
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          מומלץ בדף הבית
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>תמונה</label>
        {form.imageUrl && (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden">
            <Image src={form.imageUrl} alt="תצוגה מקדימה" fill className="object-cover" sizes="128px" />
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="text-sm" style={{ color: "var(--muted)" }} />
        {uploading && <p className="text-xs" style={{ color: "var(--muted)" }}>מעלה תמונה...</p>}
      </div>

      {error && <p className="text-sm" style={{ color: "oklch(0.45 0.15 25)" }}>{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור מוצר"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-lg font-semibold text-sm border"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
