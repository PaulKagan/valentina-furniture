"use client";

/**
 * ProductForm — create/edit a product in admin.
 * Name and description have three language tabs (Hebrew required, en/ru
 * optional — the store falls back to whatever is filled). Category select
 * shows the tree with indentation. All labels come from next-intl.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { imageUrl } from "@/lib/images";
import { COLORS } from "@/lib/colors";

type Category = { id: number; name: string; slug: string; parentId: number | null };
type Lang = "he" | "en" | "ru";

type ProductData = {
  id?: number;
  name: string;
  nameEn: string;
  nameRu: string;
  description: string;
  descriptionEn: string;
  descriptionRu: string;
  price: string;
  categoryId: number | null;
  colors: string[];
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
  const t = useTranslations("admin.productForm");
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<ProductData>({
    name: "",
    nameEn: "",
    nameRu: "",
    description: "",
    descriptionEn: "",
    descriptionRu: "",
    price: "",
    categoryId: null,
    colors: [],
    inStock: true,
    featured: false,
    imageUrl: null,
    imagePublicId: null,
    ...initial,
  });

  const [lang, setLang] = useState<Lang>("he");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Flatten the category tree into indented <option>s (depth-first)
  const categoryOptions = useMemo(() => {
    const childrenOf = new Map<number | null, Category[]>();
    for (const c of categories) {
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c);
      childrenOf.set(c.parentId, list);
    }
    const out: { id: number; label: string }[] = [];
    const walk = (parentId: number | null, depth: number) => {
      for (const c of childrenOf.get(parentId) ?? []) {
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [categories]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setForm((f) => ({ ...f, imageUrl: data.url, imagePublicId: data.publicId }));
    } else {
      setError(t("uploadError"));
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      nameEn: form.nameEn || null,
      nameRu: form.nameRu || null,
      description: form.description || null,
      descriptionEn: form.descriptionEn || null,
      descriptionRu: form.descriptionRu || null,
    };
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch("/api/admin/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { id: initial!.id, ...payload } : payload),
    });

    if (!res.ok) {
      setError(t("saveError"));
    } else {
      router.push("/admin/products");
      router.refresh();
    }
    setSaving(false);
  }

  const inputClass = "h-11 px-4 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-full";
  const inputStyle = { borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" };

  // Per-language field bindings for the tabbed name/description inputs
  const nameField: Record<Lang, keyof ProductData> = { he: "name", en: "nameEn", ru: "nameRu" };
  const descField: Record<Lang, keyof ProductData> = { he: "description", en: "descriptionEn", ru: "descriptionRu" };
  const LANGS: { key: Lang; label: string }[] = [
    { key: "he", label: "עברית" },
    { key: "en", label: "English" },
    { key: "ru", label: "Русский" },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-xl flex flex-col gap-5">
      {/* Language tabs for name + description */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--surface)" }} role="tablist">
        {LANGS.map((l) => (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={lang === l.key}
            onClick={() => setLang(l.key)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: lang === l.key ? "var(--bg)" : "transparent",
              color: lang === l.key ? "var(--ink)" : "var(--muted)",
              boxShadow: lang === l.key ? "0 1px 3px oklch(0.18 0.012 32 / 0.1)" : "none",
            }}
          >
            {l.label}
            {/* mark filled languages so it's obvious what's translated */}
            {(form[nameField[l.key]] as string) && <span aria-hidden="true"> •</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {t("nameLabel")} {lang === "he" && "*"}
        </label>
        <input
          className={inputClass}
          style={inputStyle}
          dir={lang === "he" ? "rtl" : "ltr"}
          required={lang === "he"}
          value={form[nameField[lang]] as string}
          onChange={(e) => setForm({ ...form, [nameField[lang]]: e.target.value })}
        />
        {lang !== "he" && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>{t("langFallbackHint")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("descLabel")}</label>
        <textarea
          rows={3}
          dir={lang === "he" ? "rtl" : "ltr"}
          className="px-4 py-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm resize-none"
          style={inputStyle}
          value={form[descField[lang]] as string}
          onChange={(e) => setForm({ ...form, [descField[lang]]: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("priceLabel")} *</label>
        <input type="number" min="0" step="0.01" className={inputClass} style={inputStyle} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("categoryLabel")}</label>
        <select
          className={inputClass}
          style={inputStyle}
          value={form.categoryId ?? ""}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value) : null })}
        >
          <option value="">{t("noCategoryOption")}</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Colors — fixed palette, multi-select swatch chips */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("colorsLabel")}</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const selected = form.colors.includes(c.key);
            return (
              <label
                key={c.key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border-2 text-xs font-medium cursor-pointer transition-colors"
                style={{
                  borderColor: selected ? "var(--primary)" : "var(--border)",
                  color: selected ? "var(--primary)" : "var(--muted)",
                }}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      colors: e.target.checked
                        ? [...form.colors, c.key]
                        : form.colors.filter((k) => k !== c.key),
                    })
                  }
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border inline-block"
                  style={{ backgroundColor: c.swatch, borderColor: "var(--border)" }}
                  aria-hidden="true"
                />
                {c.he}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} />
          {t("inStockLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          {t("featuredLabel")}
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("imageLabel")}</label>
        {form.imageUrl && (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden">
            <Image src={imageUrl(form.imageUrl, "thumb") ?? form.imageUrl} alt="" fill className="object-cover" sizes="128px" />
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="text-sm" style={{ color: "var(--muted)" }} />
        {uploading && <p className="text-xs" style={{ color: "var(--muted)" }}>{t("uploading")}</p>}
      </div>

      {error && <p className="text-sm" style={{ color: "oklch(0.45 0.15 25)" }}>{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.97]"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-lg font-semibold text-sm border"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
