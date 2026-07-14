"use client";

/**
 * ImportProducts — the bulk Excel import flow.
 *
 * Step 1: pick the filled template (.xlsx) + the product photos.
 * Step 2: "preview" — server validates every row, we render a green/red
 *         table with row-level reasons. Nothing is written yet.
 * Step 3: "commit" — the same files are sent again with mode=commit;
 *         server creates categories, uploads photos, upserts products.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type PreviewRow = {
  rowNumber: number;
  name: string;
  categoryPath: string[];
  price: string;
  imageFile: string | null;
  errors: string[];
  warnings: string[];
};

type Preview = {
  rows: PreviewRow[];
  summary: { total: number; valid: number; invalid: number; updates: number; imagesProvided: number };
};

type CommitResult = {
  summary: { created: number; updated: number; failed: number; skipped: number };
};

export default function ImportProducts() {
  const t = useTranslations("admin.import");
  const router = useRouter();
  const [excel, setExcel] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState("");

  function buildForm(mode: "preview" | "commit") {
    const fd = new FormData();
    fd.append("mode", mode);
    fd.append("excel", excel!);
    for (const img of images) fd.append("images", img);
    return fd;
  }

  async function run(mode: "preview" | "commit") {
    if (!excel) return;
    setBusy(mode);
    setError("");
    try {
      const res = await fetch("/api/admin/products/import", { method: "POST", body: buildForm(mode) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "empty" ? t("errorEmpty") : t("errorGeneric"));
      } else if (mode === "preview") {
        setPreview(data);
        setResult(null);
      } else {
        setResult(data);
        setPreview(null);
        router.refresh();
      }
    } catch {
      setError(t("errorGeneric"));
    }
    setBusy(null);
  }

  /** Translate a row error/warning code (some carry a ":detail" suffix). */
  function reason(code: string): string {
    const [key, detail] = code.split(":");
    // Dynamic key — bypass next-intl's strict typing for this lookup
    return (t as unknown as (k: string, v?: Record<string, string>) => string)(
      `reasons.${key}`,
      { detail: detail ?? "" }
    );
  }

  const fileBtn =
    "inline-block px-4 py-2.5 rounded-lg text-sm font-semibold border cursor-pointer transition-colors hover:bg-[oklch(0.974_0_0)]";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Step 1 — files */}
      <div className="flex flex-col sm:flex-row gap-4">
        <label className={fileBtn} style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
          {excel ? `📄 ${excel.name}` : t("chooseExcel")}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(e) => {
              setExcel(e.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
          />
        </label>
        <label className={fileBtn} style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
          {images.length > 0 ? t("imagesChosen", { count: images.length }) : t("chooseImages")}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              setImages(Array.from(e.target.files ?? []));
              setPreview(null);
            }}
          />
        </label>
        <button
          type="button"
          disabled={!excel || busy !== null}
          onClick={() => run("preview")}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {busy === "preview" ? t("checking") : t("check")}
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "oklch(0.45 0.15 25)" }}>{error}</p>}

      {/* Step 2 — preview table */}
      {preview && (
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--ink)" }}>
            {t("previewSummary", {
              total: preview.summary.total,
              valid: preview.summary.valid,
              invalid: preview.summary.invalid,
              updates: preview.summary.updates,
            })}
          </p>

          <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--surface)" }}>
                <tr>
                  {[t("colRow"), t("colName"), t("colCategory"), t("colPrice"), t("colImage"), t("colStatus")].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-start font-medium" style={{ color: "var(--muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const bad = r.errors.length > 0;
                  return (
                    <tr key={r.rowNumber} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{r.rowNumber}</td>
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--ink)" }}>{r.name || "—"}</td>
                      <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{r.categoryPath.join(" / ") || "—"}</td>
                      <td className="px-3 py-2" style={{ color: "var(--ink)" }}>₪{r.price}</td>
                      <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{r.imageFile ?? "—"}</td>
                      <td className="px-3 py-2">
                        {bad ? (
                          <span className="text-xs font-medium" style={{ color: "oklch(0.45 0.15 25)" }}>
                            ✗ {r.errors.map(reason).join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs font-medium" style={{ color: "oklch(0.45 0.12 150)" }}>
                            ✓ {r.warnings.length > 0 ? r.warnings.map(reason).join(", ") : t("reasons.ok")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {preview.summary.valid > 0 && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("commit")}
              className="self-start px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {busy === "commit" ? t("importing") : t("confirmImport", { count: preview.summary.valid })}
            </button>
          )}
        </div>
      )}

      {/* Step 3 — result */}
      {result && (
        <div
          className="p-4 rounded-xl border text-sm"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--ink)" }}
          role="status"
        >
          {t("resultSummary", {
            created: result.summary.created,
            updated: result.summary.updated,
            failed: result.summary.failed,
            skipped: result.summary.skipped,
          })}
        </div>
      )}
    </div>
  );
}
