/**
 * Excel import/export — one place that defines the spreadsheet format,
 * so the template, the export, and the import parser can never drift apart.
 *
 * Format (Hebrew headers, one product per row):
 *   שם בעברית* | שם באנגלית | שם ברוסית | קטגוריה | תיאור בעברית |
 *   תיאור באנגלית | תיאור ברוסית | מחיר* | צבעים | במלאי | מומלץ | קובץ תמונה
 *
 * - קטגוריה is a path: "סלון / ספות" (missing levels are created on import)
 * - צבעים is comma-separated palette names in any supported language
 * - במלאי/מומלץ accept כן/לא, yes/no, true/false, 1/0 (empty = כן / לא resp.)
 *
 * Server-only (imports xlsx).
 */
import * as XLSX from "xlsx";
import { colorKeyFromName, colorLabel, COLORS } from "@/lib/colors";
import type { Category, Product } from "@/lib/catalog";

export const HEADERS = [
  "שם בעברית",
  "שם באנגלית",
  "שם ברוסית",
  "קטגוריה",
  "תיאור בעברית",
  "תיאור באנגלית",
  "תיאור ברוסית",
  "מחיר",
  "צבעים",
  "במלאי",
  "מומלץ",
  "קובץ תמונה",
] as const;

export type ImportRow = {
  rowNumber: number; // 1-based Excel row (header = 1)
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  categoryPath: string[]; // ["סלון", "ספות"] — empty = no category
  description: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  price: string;
  colors: string[]; // palette keys
  inStock: boolean;
  featured: boolean;
  imageFile: string | null;
  errors: string[]; // empty = valid
  warnings: string[]; // row still imports, admin should know
};

/* ── Template ─────────────────────────────────────────────────── */

export function buildTemplate(): Buffer {
  const example = {
    "שם בעברית": "ספה תלת מושבית אפורה",
    "שם באנגלית": "Gray 3-Seat Sofa",
    "שם ברוסית": "Серый трёхместный диван",
    "קטגוריה": "סלון / ספות",
    "תיאור בעברית": "ספה נוחה במיוחד עם ריפוד בד רחיץ",
    "תיאור באנגלית": "",
    "תיאור ברוסית": "",
    "מחיר": 4990,
    "צבעים": "אפור, בז'",
    "במלאי": "כן",
    "מומלץ": "לא",
    "קובץ תמונה": "sofa-gray.jpg",
  };
  const sheet = XLSX.utils.json_to_sheet([example], { header: [...HEADERS] });
  sheet["!cols"] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  const instructions = [
    ["הוראות מילוי"],
    [""],
    ["• כל שורה = מוצר אחד. השורה הראשונה בגיליון 'מוצרים' היא דוגמה — מחקו אותה לפני הייבוא."],
    ["• חובה: שם בעברית ומחיר. כל השאר אופציונלי."],
    ["• קטגוריה: שם הקטגוריה, ולתת-קטגוריה השתמשו ב-/ למשל: סלון / ספות. קטגוריות חדשות ייווצרו אוטומטית."],
    ["• צבעים: מופרדים בפסיק, מתוך הרשימה:"],
    [COLORS.map((c) => c.he).join(", ")],
    ["• במלאי / מומלץ: כן או לא."],
    ["• קובץ תמונה: שם הקובץ בדיוק כפי שהוא אצלכם במחשב (למשל sofa1.jpg). בעת הייבוא בוחרים גם את קובצי התמונות."],
    ["• אם קיים כבר מוצר עם אותו שם בעברית — הנתונים שלו יעודכנו במקום ליצור כפילות."],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instructions);
  instrSheet["!cols"] = [{ wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "מוצרים");
  XLSX.utils.book_append_sheet(wb, instrSheet, "הוראות");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/* ── Export ───────────────────────────────────────────────────── */

export function buildExport(products: Product[], categories: Category[]): Buffer {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pathOf = (id: number | null): string => {
    if (id == null) return "";
    const parts: string[] = [];
    let cur = byId.get(id);
    for (let i = 0; cur && i < categories.length; i++) {
      parts.unshift(cur.name);
      cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
    }
    return parts.join(" / ");
  };

  const rows = products.map((p) => ({
    "שם בעברית": p.name,
    "שם באנגלית": p.nameEn ?? "",
    "שם ברוסית": p.nameRu ?? "",
    "קטגוריה": pathOf(p.categoryId),
    "תיאור בעברית": p.description ?? "",
    "תיאור באנגלית": p.descriptionEn ?? "",
    "תיאור ברוסית": p.descriptionRu ?? "",
    "מחיר": parseFloat(p.price),
    "צבעים": p.colors.map((k) => colorLabel(k, "he")).join(", "),
    "במלאי": p.inStock ? "כן" : "לא",
    "מומלץ": p.featured ? "כן" : "לא",
    "קובץ תמונה": "", // export keeps existing images; column exists for round-trip shape
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  sheet["!cols"] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "מוצרים");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/* ── Import parsing + validation ──────────────────────────────── */

function parseBool(v: unknown, fallback: boolean): boolean {
  if (v == null || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  if (["כן", "yes", "true", "1", "да"].includes(s)) return true;
  if (["לא", "no", "false", "0", "нет"].includes(s)) return false;
  return fallback;
}

export function parseImport(buffer: Buffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  // Take the products sheet by name, or the first one
  const sheetName = wb.SheetNames.includes("מוצרים") ? "מוצרים" : wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });

  const str = (v: unknown): string => String(v ?? "").trim();
  const opt = (v: unknown): string | null => (str(v) ? str(v) : null);

  return raw.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = str(row["שם בעברית"]);
    if (!name) errors.push("missingName");

    const priceRaw = str(row["מחיר"]).replace(/[₪,\s]/g, "");
    const price = parseFloat(priceRaw);
    if (!priceRaw || isNaN(price) || price < 0) errors.push("badPrice");

    // Colors: any language → palette key; unknown names become a warning
    const colors: string[] = [];
    for (const part of str(row["צבעים"]).split(",")) {
      const n = part.trim();
      if (!n) continue;
      const key = colorKeyFromName(n);
      if (key) {
        if (!colors.includes(key)) colors.push(key);
      } else {
        warnings.push(`unknownColor:${n}`);
      }
    }

    const categoryPath = str(row["קטגוריה"])
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      rowNumber: i + 2, // +1 header, +1 1-based
      name,
      nameEn: opt(row["שם באנגלית"]),
      nameRu: opt(row["שם ברוסית"]),
      categoryPath,
      description: opt(row["תיאור בעברית"]),
      descriptionEn: opt(row["תיאור באנגלית"]),
      descriptionRu: opt(row["תיאור ברוסית"]),
      price: isNaN(price) ? "0" : price.toFixed(2),
      colors,
      inStock: parseBool(row["במלאי"], true),
      featured: parseBool(row["מומלץ"], false),
      imageFile: opt(row["קובץ תמונה"]),
      errors,
      warnings,
    };
  });
}
