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
import { applyDiscount, categoryDiscount } from "@/lib/pricing";

type Category = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  isSaleCategory: boolean;
  discountPercent: number;
};
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
  onSale: boolean;
  salePrice: string;
  categoryId: number | null;
  colors: string[];
  widthCm: string;
  depthCm: string;
  heightCm: string;
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
    onSale: false,
    salePrice: "",
    categoryId: null,
    colors: [],
    widthCm: "",
    depthCm: "",
    heightCm: "",
    inStock: true,
    featured: false,
    imageUrl: null,
    imagePublicId: null,
    ...initial,
  });

  const [lang, setLang] = useState<Lang>("he");
  // The percent field is its own state: it's a typing aid for the sale price,
  // not a stored column. Only the sale price is ever persisted, so there's
  // no way for a saved percentage and a saved price to drift apart.
  const [percentInput, setPercentInput] = useState(() => {
    const p = parseFloat(initial?.price ?? "");
    const s = parseFloat(initial?.salePrice ?? "");
    return Number.isFinite(p) && p > 0 && Number.isFinite(s) && s > 0 && s < p
      ? String(Math.round((1 - s / p) * 100))
      : "";
  });
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
        // Sale categories are flagged in the dropdown so the auto-tick that
        // follows is never a surprise
        const sale = c.isSaleCategory && c.discountPercent > 0 ? `  🔥 -${c.discountPercent}%` : "";
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}${sale}` });
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

    const num = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));
    const payload = {
      ...form,
      // No sale price with the box ticked is valid: the product then follows
      // whatever its sale category grants, and follows it as it changes.
      salePrice: form.onSale && form.salePrice.trim() !== "" ? form.salePrice : null,
      widthCm: num(form.widthCm),
      depthCm: num(form.depthCm),
      heightCm: num(form.heightCm),
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

  /* ── Sale: percent ⇄ price, bound both ways ──────────────────────────────
     Typing a percentage fills the price (rounded to a real price tag);
     typing a price recomputes the percentage. Because the price is rounded,
     the percentage it implies is usually a hair off what she typed — so the
     percent field keeps HER number while she's in it, and the store always
     shows a whole number derived from the price that's actually charged. */
  const listNum = parseFloat(form.price);
  const listValid = Number.isFinite(listNum) && listNum > 0;
  const saleNum = parseFloat(form.salePrice);
  const saleFilled = form.salePrice.trim() !== "" && Number.isFinite(saleNum);
  const saleInvalid = form.onSale && saleFilled && listValid && saleNum >= listNum;

  /** % typed → fill the sale price. Empty percent clears the price, not the box. */
  function onPercentChange(raw: string) {
    setPercentInput(raw);
    if (raw.trim() === "") return setForm((f) => ({ ...f, salePrice: "" }));
    const pct = parseInt(raw, 10);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100 || !listValid) return;
    setForm((f) => ({ ...f, salePrice: String(applyDiscount(listNum, pct)) }));
  }

  /** Price typed → recompute the percentage, whole numbers only. */
  function onSalePriceChange(raw: string) {
    setForm((f) => ({ ...f, salePrice: raw }));
    const n = parseFloat(raw);
    if (raw.trim() === "" || !Number.isFinite(n) || !listValid || n >= listNum) return setPercentInput("");
    setPercentInput(String(Math.round((1 - n / listNum) * 100)));
  }

  // The percentage the store will actually print, derived from the price
  const effectivePercent =
    form.onSale && saleFilled && listValid && saleNum < listNum
      ? Math.round((1 - saleNum / listNum) * 100)
      : null;

  // Discount inherited from the chosen category branch (0 = none). Shown as a
  // note so she knows why the box ticked itself, and what happens if she
  // leaves the sale price blank.
  const inheritedPercent = categoryDiscount(form.categoryId, categories);
  const inheritedFrom = useMemo(() => {
    if (!inheritedPercent || form.categoryId == null) return null;
    const byId = new Map(categories.map((c) => [c.id, c]));
    let cur = byId.get(form.categoryId);
    for (let i = 0; cur && i <= categories.length; i++) {
      if (cur.isSaleCategory && cur.discountPercent > 0) return cur.name;
      cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
    }
    return null;
  }, [form.categoryId, categories, inheritedPercent]);

  /** Category changed — a sale branch ticks the box for her (never unticks). */
  function onCategoryChange(categoryId: number | null) {
    const pct = categoryDiscount(categoryId, categories);
    setForm((f) => ({ ...f, categoryId, onSale: f.onSale || pct > 0 }));
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

      {/* Sale — ticking the box reveals the discount % and the sale price,
          bound to each other. Unticking clears the price, so a product can
          never keep a stale sale price it isn't showing. */}
      <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface)" }}>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: "var(--ink)" }}>
          <input
            type="checkbox"
            checked={form.onSale}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm({ ...form, onSale: checked, salePrice: checked ? form.salePrice : "" });
              if (!checked) setPercentInput("");
            }}
          />
          {t("onSaleLabel")}
        </label>

        {form.onSale && (
          <>
            <div className="flex gap-3">
              <label className="flex-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                {t("discountPercentLabel")}
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  dir="ltr"
                  className={`${inputClass} mt-1`}
                  style={inputStyle}
                  value={percentInput}
                  onChange={(e) => onPercentChange(e.target.value)}
                />
              </label>
              <label className="flex-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                {t("salePriceLabel")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  className={`${inputClass} mt-1`}
                  style={inputStyle}
                  value={form.salePrice}
                  onChange={(e) => onSalePriceChange(e.target.value)}
                />
              </label>
            </div>

            {effectivePercent !== null && (
              <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>
                {t("discountPreview", { percent: effectivePercent })}
              </p>
            )}
            {saleInvalid && (
              <p className="text-xs" style={{ color: "oklch(0.45 0.15 25)" }}>{t("salePriceTooHigh")}</p>
            )}
            {/* Blank sale price + a sale category = follow the category, live */}
            {!saleFilled && inheritedPercent > 0 && inheritedFrom && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t("inheritedHint", { category: inheritedFrom, percent: inheritedPercent })}
              </p>
            )}
            {!saleFilled && inheritedPercent === 0 && (
              <p className="text-xs" style={{ color: "oklch(0.55 0.12 60)" }}>{t("saleNeedsPrice")}</p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("categoryLabel")}</label>
        <select
          className={inputClass}
          style={inputStyle}
          value={form.categoryId ?? ""}
          onChange={(e) => onCategoryChange(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">{t("noCategoryOption")}</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {inheritedPercent > 0 && inheritedFrom && (
          <p className="text-xs" style={{ color: "var(--primary)" }}>
            {t("categoryIsSaleHint", { category: inheritedFrom, percent: inheritedPercent })}
          </p>
        )}
      </div>

      {/* Dimensions — drive the "fits my space" filter and sorting */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("dimensionsLabel")}</span>
        <div className="flex gap-3">
          {([
            { key: "widthCm" as const, label: t("widthLabel") },
            { key: "depthCm" as const, label: t("depthLabel") },
            { key: "heightCm" as const, label: t("heightLabel") },
          ]).map((d) => (
            <label key={d.key} className="flex-1 text-xs" style={{ color: "var(--muted)" }}>
              {d.label}
              <input
                type="number"
                min="0"
                className={`${inputClass} mt-1`}
                style={inputStyle}
                value={form[d.key]}
                onChange={(e) => setForm({ ...form, [d.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
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
          disabled={saving || saleInvalid}
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
