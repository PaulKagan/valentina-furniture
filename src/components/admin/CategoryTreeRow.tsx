"use client";

/**
 * A single row in the admin category tree — extracted from CategoryManager
 * so it can be a real component (useDraggable/useDroppable need one row =
 * one hook instance; the old inline renderNode() was a plain recursive
 * function call, which would have broken the rules of hooks).
 */
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChevronDown, Pencil, Trash2, Plus, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export type DropPosition = "before" | "inside" | "after";

export type CategoryRowData = {
  id: number;
  name: string;
  slug: string;
  visible: boolean;
};

export default function CategoryTreeRow({
  cat,
  depth,
  childrenCount,
  isCollapsed,
  badges,
  idx,
  siblingsLength,
  rearrangeMode,
  dropPosition,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  onAddChild,
  onEdit,
  onDelete,
  labels,
}: {
  cat: CategoryRowData;
  depth: number;
  childrenCount: number;
  isCollapsed: boolean;
  badges: ReactNode;
  idx: number;
  siblingsLength: number;
  rearrangeMode: boolean;
  /** Set only when this row is the current drag-over target. */
  dropPosition: DropPosition | null;
  onToggleCollapse: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  labels: {
    expand: string;
    collapse: string;
    moveUp: string;
    moveDown: string;
    addChild: string;
    edit: string;
    delete: string;
    dragHandle: string;
  };
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: cat.id,
    disabled: !rearrangeMode,
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: cat.id, disabled: !rearrangeMode });

  return (
    <div ref={setDropRef} className="relative">
      {dropPosition === "before" && (
        <div
          className="absolute top-0 h-1 rounded-full -mt-2 z-10"
          style={{ insetInlineStart: depth * 24, insetInlineEnd: 0, backgroundColor: "var(--primary)" }}
        />
      )}
      <div
        ref={setDragRef}
        className="flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 mb-1.5 group transition-colors"
        style={{
          borderColor: dropPosition === "inside" ? "var(--primary)" : "transparent",
          backgroundColor: dropPosition === "inside" ? "oklch(0.95 0.03 32)" : "var(--bg)",
          boxShadow: dropPosition !== "inside" ? "0 0 0 1px var(--border)" : undefined,
          marginInlineStart: depth * 24,
          opacity: isDragging ? 0.4 : cat.visible ? 1 : 0.6,
        }}
      >
        {rearrangeMode && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-0.5 rounded touch-none cursor-grab active:cursor-grabbing"
            style={{ color: "var(--muted)" }}
            aria-label={labels.dragHandle}
            title={labels.dragHandle}
          >
            <GripVertical size={16} />
          </button>
        )}

        {/* expand/collapse */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-0.5 rounded"
          style={{ color: "var(--muted)", visibility: childrenCount ? "visible" : "hidden" }}
          aria-label={isCollapsed ? labels.expand : labels.collapse}
          title={isCollapsed ? labels.expand : labels.collapse}
        >
          {isCollapsed ? <ChevronDown size={16} className="-rotate-90 rtl:rotate-90" /> : <ChevronDown size={16} />}
        </button>

        <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>
          {cat.name}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          /{cat.slug}
        </span>
        {childrenCount > 0 && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            ({childrenCount})
          </span>
        )}

        <span className="flex items-center gap-1.5 ms-2">{badges}</span>

        {/* actions — up/down replaced by the drag handle in rearrange mode */}
        <span className="ms-auto flex items-center gap-1">
          {!rearrangeMode && (
            <>
              <button type="button" onClick={onMoveUp} disabled={idx <= 0} className="p-1.5 rounded disabled:opacity-25 hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }} aria-label={labels.moveUp} title={labels.moveUp}>
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={onMoveDown} disabled={idx >= siblingsLength - 1} className="p-1.5 rounded disabled:opacity-25 hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }} aria-label={labels.moveDown} title={labels.moveDown}>
                <ArrowDown size={14} />
              </button>
            </>
          )}
          <button type="button" onClick={onAddChild} className="p-1.5 rounded hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }} aria-label={labels.addChild} title={labels.addChild}>
            <Plus size={14} />
          </button>
          <button type="button" onClick={onEdit} className="p-1.5 rounded hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }} aria-label={labels.edit} title={labels.edit}>
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDelete} className="p-1.5 rounded hover:bg-[oklch(0.974_0_0)]" style={{ color: "oklch(0.5 0.15 25)" }} aria-label={labels.delete} title={labels.delete}>
            <Trash2 size={14} />
          </button>
        </span>
      </div>
      {dropPosition === "after" && (
        <div
          className="absolute bottom-0 h-1 rounded-full -mb-2 z-10"
          style={{ insetInlineStart: depth * 24, insetInlineEnd: 0, backgroundColor: "var(--primary)" }}
        />
      )}
    </div>
  );
}
