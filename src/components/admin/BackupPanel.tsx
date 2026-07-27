"use client";

/**
 * BackupPanel — download a full-database backup, or restore from one.
 *
 * Restore is destructive (it replaces every category/product/order), so it
 * gets its own explicit confirmation with the file name spelled out, on top
 * of the server's own confirm:true requirement — two people would have to
 * be careless in the same direction to trigger this by accident.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function BackupPanel() {
  const t = useTranslations("admin.backup");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    if (!confirm(t("restoreConfirm", { file: file.name }))) return;

    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? t("restoreError") });
      } else {
        setMessage({
          kind: "ok",
          text: t("restoreSuccess", {
            categories: data.restored.categories,
            products: data.restored.products,
            orders: data.restored.orders,
          }),
        });
        router.refresh();
      }
    } catch {
      setMessage({ kind: "error", text: t("restoreError") });
    }
    setRestoring(false);
  }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div className="p-5 rounded-xl border flex flex-col gap-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <h2 className="font-bold" style={{ color: "var(--ink)" }}>{t("downloadTitle")}</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{t("downloadHint")}</p>
        <a
          href="/api/admin/backup"
          download
          className="self-start px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {t("downloadButton")}
        </a>
      </div>

      <div className="p-5 rounded-xl border flex flex-col gap-3" style={{ borderColor: "oklch(0.75 0.12 40)", backgroundColor: "var(--bg)" }}>
        <h2 className="font-bold" style={{ color: "var(--ink)" }}>{t("restoreTitle")}</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{t("restoreHint")}</p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={restoring}
          className="self-start px-5 py-2.5 rounded-lg font-semibold text-sm border-2 transition-colors disabled:opacity-60"
          style={{ borderColor: "oklch(0.5 0.15 25)", color: "oklch(0.5 0.15 25)" }}
        >
          {restoring ? t("restoring") : t("restoreButton")}
        </button>
        <input ref={fileInput} type="file" accept="application/json" onChange={handleRestore} className="hidden" />
      </div>

      {message && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{
            backgroundColor: message.kind === "ok" ? "oklch(0.95 0.05 145)" : "oklch(0.95 0.05 25)",
            color: message.kind === "ok" ? "oklch(0.4 0.1 145)" : "oklch(0.45 0.15 25)",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
