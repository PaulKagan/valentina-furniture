"use client";

/**
 * CategoryProductPicker — "add existing products to this category" modal.
 *
 * Opened from CategoryManager's edit panel for an already-saved category.
 * Lists every product with a checkbox; products whose PRIMARY category is
 * already this one are always checked and locked (change the primary
 * category on the product itself to move those). Everything else toggles
 * membership in additionalCategoryIds via PUT /api/admin/categories/[id]/products.
 *
 * Mounted only while open (the caller conditions it on its own open state),
 * so every open is a fresh mount — no reset-on-reopen effect needed.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

type Product = { id: number; name: string; categoryId: number | null; additionalCategoryIds: number[] };

export default function CategoryProductPicker({
  categoryId,
  categoryName,
  onClose,
  onSaved,
}: {
  categoryId: number;
  categoryName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("admin.categories");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Product[]) => {
        setProducts(data);
        setSelected(
          new Set(
            data
              .filter((p) => p.categoryId === categoryId || p.additionalCategoryIds.includes(categoryId))
              .map((p) => p.id)
          )
        );
      });
  }, [categoryId]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => p.name.toLowerCase().includes(needle));
  }, [products, query]);

  function toggle(id: number, isPrimary: boolean) {
    if (isPrimary) return;
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(false);
    const res = await fetch(`/api/admin/categories/${categoryId}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: [...selected] }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError(true);
  }

  const inputClass = "h-10 px-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-full";
  const inputStyle = { borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" };

  return (
    <Modal open onClose={onClose} title={t("manageProductsTitle", { name: categoryName })} closeLabel={t("cancel")}>
      <input
        type="search"
        className={`${inputClass} mb-3`}
        style={inputStyle}
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!products ? (
        <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>{t("saving")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>{t("noProductsFound")}</p>
      ) : (
        <ul className="max-h-96 overflow-y-auto flex flex-col gap-1 mb-4">
          {filtered.map((p) => {
            const isPrimary = p.categoryId === categoryId;
            return (
              <li key={p.id}>
                <label
                  className="flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-lg cursor-pointer"
                  style={{ color: "var(--ink)", opacity: isPrimary ? 0.6 : 1 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    disabled={isPrimary}
                    onChange={() => toggle(p.id, isPrimary)}
                  />
                  {p.name}
                  {isPrimary && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      ({t("primaryBadge")})
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-sm mb-3" style={{ color: "oklch(0.45 0.15 25)" }}>{t("errorSave")}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !products}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 active:scale-[0.97]"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm border"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          {t("cancel")}
        </button>
      </div>
    </Modal>
  );
}
