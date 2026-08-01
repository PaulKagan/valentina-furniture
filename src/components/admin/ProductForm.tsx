"use client";

/**
 * ProductForm — create/edit a product in admin.
 * Name and description have three language tabs (Hebrew required, en/ru
 * optional — the store falls back to whatever is filled). Category select
 * shows the tree with indentation. All labels come from next-intl.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Star, X, ArrowLeft, ArrowRight, ImagePlus, Upload, Plus } from "lucide-react";
import { imageUrl } from "@/lib/images";
import { COLORS } from "@/lib/colors";
import { applyDiscount, categoryDiscount, saleSource, isApproximatePercent } from "@/lib/pricing";
import FocalPointPicker from "./FocalPointPicker";
import ImageDropzone from "./ImageDropzone";

const MAX_GALLERY = 8;

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
  imageWidth: number | null;
  imageHeight: number | null;
  focalX: number | null;
  focalY: number | null;
  galleryUrls: string[];
  galleryPublicIds: string[];
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
    imageWidth: null,
    imageHeight: null,
    focalX: null,
    focalY: null,
    galleryUrls: [],
    galleryPublicIds: [],
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

  // Warn before losing a half-filled form — this is a long, multi-language
  // form and a stray back-button tap shouldn't silently discard it.
  const [initialSnapshot] = useState(() => JSON.stringify(form));
  const dirty = !saving && JSON.stringify(form) !== initialSnapshot;
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleCancel() {
    if (dirty && !confirm(t("unsavedChangesConfirm"))) return;
    router.back();
  }

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

  async function uploadOne(file: File): Promise<{ url: string; publicId: string; width: number; height: number } | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    return res.json();
  }

  async function handlePrimaryUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    const uploaded = await uploadOne(file);
    if (uploaded) {
      // A brand new primary photo has no focal point of its own yet —
      // clearing it beats silently reusing a point that made sense on a
      // completely different picture.
      setForm((f) => ({
        ...f,
        imageUrl: uploaded.url,
        imagePublicId: uploaded.publicId,
        imageWidth: uploaded.width,
        imageHeight: uploaded.height,
        focalX: null,
        focalY: null,
      }));
    } else {
      setError(t("uploadError"));
    }
    setUploading(false);
  }

  async function handleGalleryUpload(files: File[]) {
    if (files.length === 0) return;
    const room = MAX_GALLERY - form.galleryUrls.length;
    if (room <= 0) {
      setError(t("galleryFull", { max: MAX_GALLERY }));
      return;
    }
    setUploading(true);
    const results = await Promise.all(files.slice(0, room).map(uploadOne));
    const ok = results.filter((r): r is { url: string; publicId: string; width: number; height: number } => r !== null);
    if (ok.length < results.length) setError(t("uploadError"));
    setForm((f) => ({
      ...f,
      galleryUrls: [...f.galleryUrls, ...ok.map((r) => r.url)],
      galleryPublicIds: [...f.galleryPublicIds, ...ok.map((r) => r.publicId)],
    }));
    setUploading(false);
  }

  /** Swap a gallery photo into the primary slot — the old primary joins the gallery in its place. */
  function makeGalleryPrimary(index: number) {
    setForm((f) => {
      const nextGalleryUrls = [...f.galleryUrls];
      const nextGalleryPublicIds = [...f.galleryPublicIds];
      const newPrimaryUrl = nextGalleryUrls[index];
      const newPrimaryPublicId = nextGalleryPublicIds[index];
      if (f.imageUrl && f.imagePublicId) {
        nextGalleryUrls[index] = f.imageUrl;
        nextGalleryPublicIds[index] = f.imagePublicId;
      } else {
        nextGalleryUrls.splice(index, 1);
        nextGalleryPublicIds.splice(index, 1);
      }
      return {
        ...f,
        imageUrl: newPrimaryUrl,
        imagePublicId: newPrimaryPublicId,
        // The previous focal point (and the dimensions it was measured
        // against) was chosen for the old photo — doesn't transfer to a
        // different one. Gallery uploads never captured their own pixel
        // size, so this can't be recovered until the photo is re-uploaded.
        imageWidth: null,
        imageHeight: null,
        focalX: null,
        focalY: null,
        galleryUrls: nextGalleryUrls,
        galleryPublicIds: nextGalleryPublicIds,
      };
    });
  }

  function removeGalleryImage(index: number) {
    setForm((f) => ({
      ...f,
      galleryUrls: f.galleryUrls.filter((_, i) => i !== index),
      galleryPublicIds: f.galleryPublicIds.filter((_, i) => i !== index),
    }));
  }

  function moveGalleryImage(index: number, dir: -1 | 1) {
    setForm((f) => {
      const target = index + dir;
      if (target < 0 || target >= f.galleryUrls.length) return f;
      const urls = [...f.galleryUrls];
      const ids = [...f.galleryPublicIds];
      [urls[index], urls[target]] = [urls[target], urls[index]];
      [ids[index], ids[target]] = [ids[target], ids[index]];
      return { ...f, galleryUrls: urls, galleryPublicIds: ids };
    });
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

  // The percentage the store will actually print, derived from the price.
  // Flagged "approximate" when the rounded price (nearest ₪10) doesn't land
  // on the exact percentage she typed — so "~20%" never overstates precision.
  const effectivePercent =
    form.onSale && saleFilled && listValid && saleNum < listNum
      ? Math.round((1 - saleNum / listNum) * 100)
      : null;
  const percentIsApproximate = isApproximatePercent(
    { price: form.price, salePrice: form.salePrice, onSale: form.onSale },
    0
  );

  // Discount inherited from the chosen category branch (0 = none). Shown as a
  // note so she knows why the box ticked itself, and what happens if she
  // leaves the sale price blank.
  const inheritedPercent = categoryDiscount(form.categoryId, categories);
  const inheritedFrom = useMemo(
    () => saleSource(form.categoryId, categories)?.name ?? null,
    [form.categoryId, categories]
  );

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
                {percentIsApproximate
                  ? t("discountPreviewApprox", { percent: effectivePercent })
                  : t("discountPreview", { percent: effectivePercent })}
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
        {form.imageUrl ? (
          <>
            <FocalPointPicker
              src={imageUrl(form.imageUrl, "gallery") ?? form.imageUrl}
              value={form.focalX != null && form.focalY != null ? { x: form.focalX, y: form.focalY } : null}
              onChange={(p) => setForm((f) => ({ ...f, focalX: p?.x ?? null, focalY: p?.y ?? null }))}
              label={t("focalPointLabel")}
              hint={t("focalPointHint")}
              resetLabel={t("focalPointReset")}
              naturalWidth={form.imageWidth}
              naturalHeight={form.imageHeight}
            />
            <ImageDropzone
              onFiles={handlePrimaryUpload}
              disabled={uploading}
              className="w-full max-w-xs flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2"
            >
              <Upload size={14} style={{ color: "var(--muted)" }} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>{uploading ? t("uploading") : t("replaceImage")}</span>
            </ImageDropzone>
          </>
        ) : (
          <ImageDropzone
            onFiles={handlePrimaryUpload}
            disabled={uploading}
            className="w-full max-w-xs aspect-[4/3] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-center px-4"
          >
            <ImagePlus size={28} style={{ color: "var(--muted)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>
              {uploading ? t("uploading") : t("dropImageHint")}
            </span>
            {!uploading && (
              <span className="text-xs px-3 py-1.5 rounded-md border" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
                {t("chooseFile")}
              </span>
            )}
          </ImageDropzone>
        )}
      </div>

      {/* Gallery — additional photos shown as a thumbnail strip on the
          product page. Any of these can be promoted to primary; the photo
          it replaces slots back into the gallery, nothing is lost. */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {t("galleryLabel")} ({form.galleryUrls.length}/{MAX_GALLERY})
        </label>
        <div className="flex flex-wrap gap-3">
          {form.galleryUrls.map((url, i) => (
            <div key={form.galleryPublicIds[i] ?? url} className="relative w-24 h-24 rounded-lg overflow-hidden border group" style={{ borderColor: "var(--border)" }}>
              <Image src={imageUrl(url, "thumb") ?? url} alt="" fill className="object-cover" sizes="96px" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => makeGalleryPrimary(i)} title={t("makePrimary")} className="p-1 rounded bg-white/90 hover:bg-white">
                  <Star size={14} />
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveGalleryImage(i, -1)} disabled={i === 0} title={t("moveEarlier")} className="p-1 rounded bg-white/90 hover:bg-white disabled:opacity-40">
                    <ArrowRight size={12} className="rtl:hidden" />
                    <ArrowLeft size={12} className="hidden rtl:block" />
                  </button>
                  <button type="button" onClick={() => moveGalleryImage(i, 1)} disabled={i === form.galleryUrls.length - 1} title={t("moveLater")} className="p-1 rounded bg-white/90 hover:bg-white disabled:opacity-40">
                    <ArrowLeft size={12} className="rtl:hidden" />
                    <ArrowRight size={12} className="hidden rtl:block" />
                  </button>
                </div>
                <button type="button" onClick={() => removeGalleryImage(i)} title={t("removePhoto")} className="p-1 rounded bg-white/90 hover:bg-white">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          {form.galleryUrls.length < MAX_GALLERY && (
            <ImageDropzone
              multiple
              onFiles={handleGalleryUpload}
              disabled={uploading}
              className="w-24 h-24 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1 text-center"
            >
              <Plus size={18} style={{ color: "var(--muted)" }} />
              <span className="text-[10px] leading-tight px-1" style={{ color: "var(--muted)" }}>
                {uploading ? t("uploading") : t("dropGalleryHint")}
              </span>
            </ImageDropzone>
          )}
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: "oklch(0.45 0.15 25)" }}>{error}</p>}

      {/* Sticky so Save/Cancel stay reachable without scrolling back down
          through a long multi-language form, especially on mobile. */}
      <div
        className="sticky bottom-0 py-3 flex gap-3 border-t backdrop-blur-sm"
        style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in oklch, var(--surface) 92%, transparent)" }}
      >
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
          onClick={handleCancel}
          className="px-6 py-3 rounded-lg font-semibold text-sm border"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
