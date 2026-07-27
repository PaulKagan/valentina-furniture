/**
 * Shared table cell for admin list tables (dashboard, orders) — the same
 * `px-4 py-3` + muted/ink color pattern was copy-pasted across both.
 */
import type { CSSProperties, ReactNode } from "react";

export function Td({
  children,
  className = "",
  muted = false,
  dir,
  colSpan,
  style,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  dir?: "ltr" | "rtl";
  colSpan?: number;
  style?: CSSProperties;
}) {
  return (
    <td
      className={`px-4 py-3 ${className}`}
      style={{ color: muted ? "var(--muted)" : "var(--ink)", ...style }}
      dir={dir}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}
