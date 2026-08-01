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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronsDown,
  ChevronsUp,
  Move,
  EyeOff,
  Clock,
  Star,
  Flame,
  GripVertical,
  Undo2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { imageUrl } from "@/lib/images";
import FocalPointPicker from "./FocalPointPicker";
import CategoryTreeRow, { type DropPosition } from "./CategoryTreeRow";

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
  isSaleCategory: boolean;
  discountPercent: number;
  sortOrder: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  focalX: number | null;
  focalY: number | null;
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
  isSaleCategory: boolean;
  discountPercent: string; // "" is allowed while typing; sent as 0
  imageUrl: string | null;
  imagePublicId: string | null;
  focalX: number | null;
  focalY: number | null;
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
  isSaleCategory: false,
  discountPercent: "",
  imageUrl: null,
  imagePublicId: null,
  focalX: null,
  focalY: null,
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
  const [deleteError, setDeleteError] = useState(false);
  const [rearrangeMode, setRearrangeMode] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: DropPosition } | null>(null);
  const [reorderError, setReorderError] = useState(false);
  const [activeDragCat, setActiveDragCat] = useState<Category | null>(null);
  // Snapshot of whatever a drag-drop just changed, so it can be reverted.
  // Cleared automatically after UNDO_WINDOW_MS.
  const [undo, setUndo] = useState<{ label: string; restore: Category[] } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A row currently being dragged (or one of its descendants) can never be a
  // valid drop target — dropping a category "inside" its own child would
  // create a cycle. Recomputed fresh per drag rather than kept in state.
  const blockedDropIdsRef = useRef<Set<number>>(new Set());
  // Real cursor Y during a drag — dnd-kit's active.rect.translated tracks the
  // whole dragged row's box, which is offset from the actual pointer by
  // wherever on the row the grip handle happens to sit, so it's not accurate
  // enough for the before/inside/after zone math below.
  const pointerYRef = useRef(0);
  // id of whatever's currently being dragged, or null — lets the pointermove
  // handler below know when to actually recompute the hover indicator.
  const draggingIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rearrangeMode) return;
    const onMove = (e: PointerEvent) => {
      pointerYRef.current = e.clientY;
      if (draggingIdRef.current == null) return;
      // The visual "before/inside/after" indicator is computed straight from
      // the live pointer position via elementFromPoint, not from dnd-kit's
      // own onDragOver — dnd-kit throttles/coalesces that event during fast
      // continuous movement, which was leaving the indicator a step behind
      // (flickering or never catching up to "inside") even though the drop
      // itself always resolved correctly at release. This has zero lag since
      // it runs on every real pointermove.
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-cat-id]");
      if (!hit) {
        setDropTarget(null);
        return;
      }
      const overId = Number(hit.dataset.catId);
      if (blockedDropIdsRef.current.has(overId)) {
        setDropTarget(null);
        return;
      }
      const rect = hit.getBoundingClientRect();
      const EDGE_PX = 10;
      const position: DropPosition =
        e.clientY - rect.top < EDGE_PX ? "before" : rect.bottom - e.clientY < EDGE_PX ? "after" : "inside";
      setDropTarget({ id: overId, position });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [rearrangeMode]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

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
      isSaleCategory: form.isSaleCategory,
      // Empty field means 0, never null — the pricing helpers treat it as
      // "no discount" and can keep doing plain arithmetic
      discountPercent: form.discountPercent.trim() === "" ? 0 : parseInt(form.discountPercent, 10) || 0,
      sortOrder: form.id != null ? cats.find((c) => c.id === form.id)?.sortOrder ?? 0 : (childrenOf.get(form.parentId)?.length ?? 0),
      imageUrl: form.imageUrl,
      imagePublicId: form.imagePublicId,
      focalX: form.focalX,
      focalY: form.focalY,
    };
    const res = await fetch("/api/admin/categories", {
      method: form.id != null ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "Slug already exists"
          ? t("errorSlug")
          : data.error === "A sale category needs a discount above 0%"
            ? t("errorSaleDiscount")
            : t("errorSave")
      );
    } else {
      setForm(null);
      await refresh();
    }
    setSaving(false);
  }

  async function remove(cat: Category) {
    if (!confirm(t("deleteConfirm", { name: cat.name }))) return;
    setDeleteError(false);
    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id }),
    });
    if (res.ok) await refresh();
    else setDeleteError(true);
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

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    setCollapsed(new Set(cats.filter((c) => (childrenOf.get(c.id)?.length ?? 0) > 0).map((c) => c.id)));
  }

  const UNDO_WINDOW_MS = 60_000;

  /**
   * Persist a full list of (already reordered/reparented) categories.
   * When `undoInfo` is given and the save succeeds, arms a 60s undo window
   * that restores exactly those rows to their pre-drop values.
   */
  async function persistAll(updated: Category[], undoInfo?: { label: string; restore: Category[] }) {
    setReorderError(false);
    const results = await Promise.all(
      updated.map((c) =>
        fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        })
      )
    );
    if (results.some((r) => !r.ok)) {
      setReorderError(true);
    } else if (undoInfo) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndo(undoInfo);
      undoTimerRef.current = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
    }
    await refresh();
  }

  async function undoLastMove() {
    if (!undo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const restore = undo.restore;
    setUndo(null);
    await persistAll(restore);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = Number(event.active.id);
    draggingIdRef.current = id;
    setActiveDragCat(cats.find((c) => c.id === id) ?? null);
    const blocked = new Set<number>([id]);
    const walk = (parentId: number) => {
      for (const c of cats) {
        if (c.parentId === parentId) {
          blocked.add(c.id);
          walk(c.id);
        }
      }
    };
    walk(id);
    blockedDropIdsRef.current = blocked;
  }

  /**
   * Resolve dnd-kit's drag-end event into {id, position}, or null when
   * there's no valid target. Used only for the actual mutation — reads
   * dnd-kit's own event.over directly instead of trusting React state,
   * which can still be a render or two behind at the instant the pointer
   * is released. (The visual hover indicator is computed separately, see
   * the pointermove handler above — driving it from this same dnd-kit event
   * left it a step behind during fast continuous movement.)
   */
  function resolveDropTarget(
    over: DragOverEvent["over"],
    fallbackToInside = false
  ): { id: number; position: DropPosition } | null {
    if (!over || blockedDropIdsRef.current.has(Number(over.id))) return null;
    const overRect = over.rect;
    if (!overRect) {
      // A remeasure race can leave the rect briefly unset right at drop
      // time even though we know exactly which row the pointer is over —
      // fall back to "inside" rather than silently dropping the action.
      return fallbackToInside ? { id: Number(over.id), position: "inside" } : null;
    }
    // Nesting is the primary gesture here (that's the whole point of this
    // feature), so it gets almost the entire row as its target — only a
    // thin strip at the very top/bottom edge means "insert here instead".
    // A percentage-based split (e.g. top/bottom 30%) turns out too small to
    // reliably land on for a ~40px row; fixed pixel edges don't shrink with
    // row height.
    const EDGE_PX = 10;
    const y = pointerYRef.current;
    const position: DropPosition =
      y - overRect.top < EDGE_PX ? "before" : overRect.top + overRect.height - y < EDGE_PX ? "after" : "inside";
    return { id: Number(over.id), position };
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = Number(event.active.id);
    const target = resolveDropTarget(event.over, true);
    draggingIdRef.current = null;
    setDropTarget(null);
    setActiveDragCat(null);
    blockedDropIdsRef.current = new Set();
    if (!target) return;

    const dragged = cats.find((c) => c.id === activeId);
    const overCat = cats.find((c) => c.id === target.id);
    if (!dragged || !overCat) return;

    if (target.position === "inside") {
      // dragged into a different parent than it already had — a no-op drop
      // (e.g. releasing over its own existing parent) shouldn't arm undo
      // for nothing changing.
      if (dragged.parentId === overCat.id) return;
      const newSiblings = childrenOf.get(overCat.id) ?? [];
      await persistAll(
        [{ ...dragged, parentId: overCat.id, sortOrder: newSiblings.length }],
        { label: t("categoryMoved", { name: dragged.name }), restore: [dragged] }
      );
      return;
    }

    // before/after — same parent as the target, rebuild that sibling order
    // with the dragged item inserted, then renumber everyone so sortOrder
    // stays a clean 0..n sequence (same scheme move() already relies on).
    const newParentId = overCat.parentId;
    const currentSiblings = (childrenOf.get(newParentId) ?? []).filter((c) => c.id !== activeId);
    const overIdx = currentSiblings.findIndex((c) => c.id === overCat.id);
    const insertAt = target.position === "before" ? overIdx : overIdx + 1;
    const reordered = [...currentSiblings];
    reordered.splice(insertAt, 0, dragged);
    // Snapshot of every affected row's pre-drop values, for undo — captured
    // before the sortOrder/parentId overwrite below.
    const originals = reordered;
    await persistAll(
      reordered.map((c, i) => ({ ...c, parentId: newParentId, sortOrder: i })),
      { label: t("categoryMoved", { name: dragged.name }), restore: originals }
    );
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
      // A new photo has no focal point of its own — an old one wouldn't
      // point at anything meaningful on a different image.
      setForm({ ...form, imageUrl: data.url, imagePublicId: data.publicId, focalX: null, focalY: null });
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

  const rowLabels = {
    expand: t("expand"),
    collapse: t("collapse"),
    moveUp: t("moveUp"),
    moveDown: t("moveDown"),
    addChild: t("addChild"),
    edit: t("edit"),
    delete: t("delete"),
    dragHandle: t("dragHandle"),
  };

  function openEditForm(cat: Category) {
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
      isSaleCategory: cat.isSaleCategory,
      discountPercent: cat.discountPercent ? String(cat.discountPercent) : "",
      imageUrl: cat.imageUrl,
      imagePublicId: cat.imagePublicId,
      focalX: cat.focalX,
      focalY: cat.focalY,
    });
  }

  function renderNode(cat: Category, depth: number): React.ReactNode {
    const children = childrenOf.get(cat.id) ?? [];
    const isCollapsed = collapsed.has(cat.id);
    const sched = scheduleState(cat);
    const siblings = childrenOf.get(cat.parentId) ?? [];
    const idx = siblings.findIndex((c) => c.id === cat.id);

    return (
      <div key={cat.id}>
        <CategoryTreeRow
          cat={cat}
          depth={depth}
          childrenCount={children.length}
          isCollapsed={isCollapsed}
          idx={idx}
          siblingsLength={siblings.length}
          rearrangeMode={rearrangeMode}
          dropPosition={dropTarget?.id === cat.id ? dropTarget.position : null}
          labels={rowLabels}
          badges={
            <>
              {cat.isSaleCategory && cat.discountPercent > 0 &&
                badge(t("badgeSale", { percent: cat.discountPercent }), <Flame size={11} />, "promo")}
              {cat.promoted && badge(t("badgePromoted"), <Star size={11} />, "promo")}
              {!cat.visible && badge(t("badgeHidden"), <EyeOff size={11} />, "muted")}
              {sched === "future" && badge(t("badgeScheduled"), <Clock size={11} />, "warn")}
              {sched === "expired" && badge(t("badgeExpired"), <Clock size={11} />, "warn")}
              {sched === "activeWindow" && badge(t("badgeTemporary"), <Clock size={11} />, "muted")}
            </>
          }
          onToggleCollapse={() =>
            setCollapsed((s) => {
              const next = new Set(s);
              if (next.has(cat.id)) next.delete(cat.id);
              else next.add(cat.id);
              return next;
            })
          }
          onMoveUp={() => move(cat, -1)}
          onMoveDown={() => move(cat, 1)}
          onAddChild={() => setForm({ ...EMPTY_FORM, parentId: cat.id })}
          onEdit={() => openEditForm(cat)}
          onDelete={() => remove(cat)}
        />
        {children.length > 0 && (
          // Pure-CSS collapse animation (grid-rows 0fr↔1fr) — children stay
          // mounted so it can actually animate, rather than popping in/out
          // instantly the way a plain conditional render would.
          <div style={{ display: "grid", gridTemplateRows: isCollapsed ? "0fr" : "1fr", transition: "grid-template-rows 200ms ease" }}>
            <div style={{ overflow: "hidden", minHeight: 0 }}>{children.map((c) => renderNode(c, depth + 1))}</div>
          </div>
        )}
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            + {t("new")}
          </button>
          <button
            type="button"
            onClick={collapsed.size > 0 ? expandAll : collapseAll}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg font-medium text-sm border transition-colors hover:bg-[oklch(0.974_0_0)]"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {collapsed.size > 0 ? (
              <>
                <ChevronsDown size={15} /> {t("expandAll")}
              </>
            ) : (
              <>
                <ChevronsUp size={15} /> {t("collapseAll")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRearrangeMode((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg font-medium text-sm border transition-colors"
            style={{
              borderColor: rearrangeMode ? "var(--primary)" : "var(--border)",
              color: rearrangeMode ? "var(--primary)" : "var(--ink)",
              backgroundColor: rearrangeMode ? "oklch(0.95 0.03 32)" : undefined,
            }}
            aria-pressed={rearrangeMode}
          >
            <Move size={15} /> {rearrangeMode ? t("rearrangeModeOn") : t("rearrangeMode")}
          </button>
        </div>
        {rearrangeMode && (
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            {t("rearrangeHint")}
          </p>
        )}
        {deleteError && (
          <p role="status" className="text-sm mb-4" style={{ color: "oklch(0.45 0.15 25)" }}>
            {t("deleteError")}
          </p>
        )}
        {reorderError && (
          <p role="status" className="text-sm mb-4" style={{ color: "oklch(0.45 0.15 25)" }}>
            {t("reorderError")}
          </p>
        )}
        {undo && (
          <div
            role="status"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm mb-4"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}
          >
            <span>{undo.label}</span>
            <button
              type="button"
              onClick={undoLastMove}
              className="inline-flex items-center gap-1 font-semibold hover:opacity-70 transition-opacity"
              style={{ color: "var(--primary)" }}
            >
              <Undo2 size={14} /> {t("undo")}
            </button>
          </div>
        )}

        {roots.length === 0 ? (
          <p className="text-sm py-8" style={{ color: "var(--muted)" }}>
            {t("empty")}
          </p>
        ) : (
          <DndContext
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              draggingIdRef.current = null;
              setDropTarget(null);
              setActiveDragCat(null);
              blockedDropIdsRef.current = new Set();
            }}
          >
            {roots.map((c) => renderNode(c, 0))}
            <DragOverlay dropAnimation={null} style={{ pointerEvents: "none" }}>
              {activeDragCat && (
                <div
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 shadow-lg"
                  style={{
                    borderColor: "var(--primary)",
                    backgroundColor: "var(--bg)",
                    opacity: 0.85,
                    cursor: "grabbing",
                    // Must not intercept hit-testing — the hover indicator
                    // (elementFromPoint, see the pointermove handler above)
                    // needs to see straight through to the row underneath,
                    // not hit this floating clone.
                    pointerEvents: "none",
                  }}
                >
                  <GripVertical size={16} style={{ color: "var(--muted)" }} />
                  <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>
                    {activeDragCat.name}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
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

          {/* sale category — the discount applies to this branch and every
              subcategory under it. Nothing is written to the products'
              prices: the percentage is applied live, so ending the sale
              (or letting the schedule expire) restores full price by itself. */}
          <fieldset className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: "var(--surface)" }}>
            <legend className="text-sm font-medium px-1" style={{ color: "var(--ink)" }}>{t("saleLegend")}</legend>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={form.isSaleCategory}
                onChange={(e) => setForm({ ...form, isSaleCategory: e.target.checked })}
              />
              {t("isSaleCategoryLabel")}
            </label>
            {form.isSaleCategory && (
              <>
                <label className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                  {t("discountPercentLabel")}
                  <input
                    type="number"
                    min="1"
                    max="95"
                    step="1"
                    dir="ltr"
                    className={`${inputClass} mt-1`}
                    style={inputStyle}
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  />
                </label>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{t("saleHint")}</p>
              </>
            )}
          </fieldset>

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
              <FocalPointPicker
                src={imageUrl(form.imageUrl, "card") ?? form.imageUrl}
                value={form.focalX != null && form.focalY != null ? { x: form.focalX, y: form.focalY } : null}
                onChange={(p) => setForm({ ...form, focalX: p?.x ?? null, focalY: p?.y ?? null })}
                label={t("focalPointLabel")}
                hint={t("focalPointHint")}
                resetLabel={t("focalPointReset")}
              />
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
