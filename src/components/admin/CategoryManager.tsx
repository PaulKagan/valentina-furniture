"use client";

/**
 * CategoryManager — the admin's category control center.
 *
 * Renders the category tree with per-node controls:
 *   - expand/collapse subtrees
 *   - status badges: hidden, scheduled (future), expired, promoted
 *   - reorder within siblings (up/down)
 *   - edit / add-child / delete
 * A side panel form covers everything: names in 3 languages, slug, parent,
 * visibility, schedule window (temporary categories), promotion, tile image.
 *
 * All data flows through /api/admin/categories; after each mutation we
 * re-fetch the flat list and rebuild the tree client-side.
 */
import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Clock,
  Star,
} from "lucide-react";
import { imageUrl } from "@/lib/images";

type Category = {
  id: number;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  slug: string;
  parentId: number | null;
  visible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  promoted: boolean;
  sortOrder: number;
  imageUrl: string | null;
  imagePublicId: string | null;
};

type FormState = {
  id: number | null;
  name: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  parentId: number | null;
  visible: boolean;
  startsAt: string; // datetime-local strings; "" = unset
  endsAt: string;
  promoted: boolean;
  imageUrl: string | null;
  imagePublicId: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  nameEn: "",
  nameRu: "",
  slug: "",
  parentId: null,
  visible: true,
  startsAt: "",
  endsAt: "",
  promoted: false,
  imageUrl: null,
  imagePublicId: null,
};

/** ISO string → value usable by <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CategoryManager({ initial }: { initial: Category[] }) {
  const t = useTranslations("admin.categories");
  const [cats, setCats] = useState<Category[]>(initial);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setCats(await res.json());
  }, []);

  // Children lookup, sorted like the storefront: promoted first, then sortOrder
  const childrenOf = useMemo(() => {
    const map = new Map<number | null, Category[]>();
    for (const c of cats) {
      const key = c.parentId;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(b.promoted) - Number(a.promoted) || a.sortOrder - b.sortOrder || a.id - b.id);
    }
    return map;
  }, [cats]);

  /* ── mutations ── */

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    const payload = {
      id: form.id ?? undefined,
      name: form.name,
      nameEn: form.nameEn || null,
      nameRu: form.nameRu || null,
      slug: form.slug,
      parentId: form.parentId,
      visible: form.visible,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      promoted: form.promoted,
      sortOrder: form.id != null ? cats.find((c) => c.id === form.id)?.sortOrder ?? 0 : (childrenOf.get(form.parentId)?.length ?? 0),
      imageUrl: form.imageUrl,
      imagePublicId: form.imagePublicId,
    };
    const res = await fetch("/api/admin/categories", {
      method: form.id != null ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Slug already exists" ? t("errorSlug") : t("errorSave"));
    } else {
      setForm(null);
      await refresh();
    }
    setSaving(false);
  }

  async function remove(cat: Category) {
    if (!confirm(t("deleteConfirm", { name: cat.name }))) return;
    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id }),
    });
    if (res.ok) await refresh();
  }

  /** Swap sortOrder with the previous/next sibling. */
  async function move(cat: Category, dir: -1 | 1) {
    const siblings = childrenOf.get(cat.parentId) ?? [];
    const idx = siblings.findIndex((c) => c.id === cat.id);
    const other = siblings[idx + dir];
    if (!other) return;
    // Persist both swapped orders; normalize so the swap is deterministic
    const a = { ...cat, sortOrder: idx + dir };
    const b = { ...other, sortOrder: idx };
    await Promise.all(
      [a, b].map((c) =>
        fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        })
      )
    );
    await refresh();
  }

  async function uploadTile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setForm({ ...form, imageUrl: data.url, imagePublicId: data.publicId });
    }
    setUploading(false);
  }

  /* ── status helpers ── */

  function scheduleState(cat: Category): "future" | "expired" | "activeWindow" | null {
    const now = new Date();
    if (cat.startsAt && now < new Date(cat.startsAt)) return "future";
    if (cat.endsAt && now > new Date(cat.endsAt)) return "expired";
    if (cat.startsAt || cat.endsAt) return "activeWindow";
    return null;
  }

  /* ── render ── */

  const badge = (text: string, icon: React.ReactNode, tone: "muted" | "warn" | "promo") => (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: tone === "promo" ? "oklch(0.95 0.03 32)" : "var(--surface)",
        color: tone === "promo" ? "var(--primary)" : tone === "warn" ? "oklch(0.55 0.12 60)" : "var(--muted)",
      }}
    >
      {icon}
      {text}
    </span>
  );

  function renderNode(cat: Category, depth: number): React.ReactNode {
    const children = childrenOf.get(cat.id) ?? [];
    const isCollapsed = collapsed.has(cat.id);
    const sched = scheduleState(cat);
    const siblings = childrenOf.get(cat.parentId) ?? [];
    const idx = siblings.findIndex((c) => c.id === cat.id);

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-3 rounded-lg border mb-1.5 group"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg)",
            marginInlineStart: depth * 24,
            opacity: cat.visible ? 1 : 0.6,
          }}
        >
          {/* expand/collapse */}
          <button
            type="button"
            onClick={() =>
              setCollapsed((s) => {
                const next = new Set(s);
                if (next.has(cat.id)) next.delete(cat.id);
                else next.add(cat.id);
                return next;
              })
            }
            className="p-0.5 rounded"
            style={{ color: "var(--muted)", visibility: children.length ? "visible" : "hidden" }}
            aria-label={isCollapsed ? t("expand") : t("collapse")}
          >
            {isCollapsed ? <ChevronLeft size={16} className="rtl:rotate-0 ltr:rotate-180" /> : <ChevronDown size={16} />}
          </button>

          <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>
            {cat.name}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            /{cat.slug}
          </span>
          {children.length > 0 && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              ({children.length})
            </span>
          )}

          <span className="flex items-center gap-1.5 ms-2">
            {cat.promoted && badge(t("badgePromoted"), <Star size={11} />, "promo")}
            {!cat.visible && badge(t("badgeHidden"), <EyeOff size={11} />, "muted")}
            {sched === "future" && badge(t("badgeScheduled"), <Clock size={11} />, "warn")}
            {sched === "expired" && badge(t("badgeExpired"), <Clock size={11} />, "warn")}
            {sched === "activeWindow" && badge(t("badgeTemporary"), <Clock size={11} />, "muted")}
          </span>

          {/* actions */}
          <span className="ms-auto flex items-center gap-1">
            <button type="button" onClick={() => move(cat, -1)} disabled={idx <= 0} className="p-1.5 rounded disabled:opacity-25 hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }} aria-label={t("moveUp")}>
              <ArrowUp size={14} />
            </button>
            <button type="button" onClick={() => move(cat, 1)} disabled={idx >= siblings.length - 1} className="p-1.5 rounded disabled:opacity-25 hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }} aria-label={t("moveDown")}>
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...EMPTY_FORM, parentId: cat.id })}
              className="p-1.5 rounded hover:bg-[oklch(0.974_0_0)]"
              style={{ color: "var(--muted)" }}
              aria-label={t("addChild")}
              title={t("addChild")}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({
                  id: cat.id,
                  name: cat.name,
                  nameEn: cat.nameEn ?? "",
                  nameRu: cat.nameRu ?? "",
                  slug: cat.slug,
                  parentId: cat.parentId,
                  visible: cat.visible,
                  startsAt: toLocalInput(cat.startsAt),
                  endsAt: toLocalInput(cat.endsAt),
                  promoted: cat.promoted,
                  imageUrl: cat.imageUrl,
                  imagePublicId: cat.imagePublicId,
                })
              }
              className="p-1.5 rounded hover:bg-[oklch(0.974_0_0)]"
              style={{ color: "var(--muted)" }}
              aria-label={t("edit")}
            >
              <Pencil size={14} />
            </button>
            <button type="button" onClick={() => remove(cat)} className="p-1.5 rounded hover:bg-[oklch(0.974_0_0)]" style={{ color: "oklch(0.5 0.15 25)" }} aria-label={t("delete")}>
              <Trash2 size={14} />
            </button>
          </span>
        </div>
        {!isCollapsed && children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  const inputClass = "h-10 px-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-full";
  const inputStyle = { borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" };
  const roots = childrenOf.get(null) ?? [];

  // Valid parent options for the form — exclude self and own descendants (no cycles)
  const parentOptions = useMemo(() => {
    if (!form) return [];
    const blocked = new Set<number>();
    if (form.id != null) {
      const walk = (id: number) => {
        blocked.add(id);
        for (const c of cats) if (c.parentId === id) walk(c.id);
      };
      walk(form.id);
    }
    return cats.filter((c) => !blocked.has(c.id));
  }, [form, cats]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* ── Tree ── */}
      <div className="flex-1 min-w-0 w-full">
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY_FORM })}
          className="mb-4 px-4 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          + {t("new")}
        </button>

        {roots.length === 0 ? (
          <p className="text-sm py-8" style={{ color: "var(--muted)" }}>
            {t("empty")}
          </p>
        ) : (
          roots.map((c) => renderNode(c, 0))
        )}
      </div>

      {/* ── Edit / create panel ── */}
      {form && (
        <form
          onSubmit={submitForm}
          className="w-full lg:w-96 flex-shrink-0 p-5 rounded-xl border flex flex-col gap-4 lg:sticky lg:top-4"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
        >
          <h2 className="font-bold" style={{ color: "var(--ink)" }}>
            {form.id != null ? t("editTitle") : t("newTitle")}
          </h2>

          {/* names ×3 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("nameHe")} *</label>
            <input dir="rtl" className={inputClass} style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("nameEn")}</label>
            <input dir="ltr" className={inputClass} style={inputStyle} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("nameRu")}</label>
            <input dir="ltr" className={inputClass} style={inputStyle} value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("slug")}</label>
            <input dir="ltr" className={inputClass} style={inputStyle} value={form.slug} placeholder={t("slugHint")} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("parent")}</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.parentId ?? ""}
              onChange={(e) => setForm({ ...form, parentId: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">{t("noParent")}</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
            {t("visibleLabel")}
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={form.promoted} onChange={(e) => setForm({ ...form, promoted: e.target.checked })} />
            {t("promotedLabel")}
          </label>
          <p className="text-xs -mt-2" style={{ color: "var(--muted)" }}>{t("promotedHint")}</p>

          {/* schedule window */}
          <fieldset className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: "var(--surface)" }}>
            <legend className="text-sm font-medium px-1" style={{ color: "var(--ink)" }}>{t("scheduleLegend")}</legend>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{t("scheduleHint")}</p>
            <label className="text-xs font-medium" style={{ color: "var(--ink)" }}>
              {t("startsAt")}
              <input type="datetime-local" className={`${inputClass} mt-1`} style={inputStyle} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--ink)" }}>
              {t("endsAt")}
              <input type="datetime-local" className={`${inputClass} mt-1`} style={inputStyle} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </label>
          </fieldset>

          {/* tile image */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("tileImage")}</label>
            {form.imageUrl && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                <Image src={imageUrl(form.imageUrl, "tile") ?? form.imageUrl} alt="" fill className="object-cover" sizes="384px" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={uploadTile} disabled={uploading} className="text-sm" style={{ color: "var(--muted)" }} />
            {uploading && <p className="text-xs" style={{ color: "var(--muted)" }}>{t("uploading")}</p>}
          </div>

          {error && <p className="text-sm" style={{ color: "oklch(0.45 0.15 25)" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 active:scale-[0.97]" style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}>
              {saving ? t("saving") : t("save")}
            </button>
            <button type="button" onClick={() => { setForm(null); setError(""); }} className="px-5 py-2.5 rounded-lg font-semibold text-sm border" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
