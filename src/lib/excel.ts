/**
 * Excel import/export — one place that defines the spreadsheet format,
 * so the template, the export, and the import parser can never drift apart.
 *
 * Format (Hebrew headers, one product per row):
 *   שם בעברית* | שם באנגלית | שם ברוסית | קטגוריה | תיאור בעברית |
 *   תיאור באנגלית | תיאור ברוסית | מחיר* | צבעים | רוחב סמ | עומק סמ |
 *   גובה סמ | במלאי | מומלץ | קובץ תמונה
 *
 * - קטגוריה is a path: "סלון / ספות" (missing levels are created on import)
 * - צבעים is comma-separated palette names in any supported language
 * - במלאי/מומלץ accept כן/לא, yes/no, true/false, 1/0 (empty = כן / לא resp.)
 * - קובץ תמונה is comma-separated filenames — the first is the primary photo,
 *   the rest become the gallery. The file extension is optional on either
 *   side of the match (uploaded file vs. the name typed here), so "sofa1"
 *   matches an uploaded sofa1.jpg without her having to type the extension.
 *
 * Server-only (imports xlsx).
 */
import * as XLSX from "xlsx";
import { colorKeyFromName, colorLabel, COLORS } from "@/lib/colors";
import { applyDiscount } from "@/lib/pricing";
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
  "אחוז הנחה",
  "מחיר מבצע",
  "צבעים",
  "רוחב סמ",
  "עומק סמ",
  "גובה סמ",
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
  onSale: boolean;
  salePrice: string | null;
  colors: string[]; // palette keys
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  inStock: boolean;
  featured: boolean;
  /** First = primary photo, rest = gallery. Empty = no photos referenced. */
  imageFiles: string[];
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
    "אחוז הנחה": "",
    "מחיר מבצע": "",
    "צבעים": "אפור, בז'",
    "רוחב סמ": 210,
    "עומק סמ": 95,
    "גובה סמ": 85,
    "במלאי": "כן",
    "מומלץ": "לא",
    "קובץ תמונה": "sofa-gray, sofa-gray-side, sofa-gray-detail",
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
    ["• מידות (רוחב/עומק/גובה): מספרים בסנטימטרים בלבד, למשל 210. אופציונלי — משמש לסינון ומיון בחנות."],
    ["• אחוז הנחה: אופציונלי, מספר שלם בלבד (למשל 20). מחושב ממנו מחיר המבצע אוטומטית. ריק = ללא הנחה."],
    ["• מחיר מבצע: אופציונלי, וגובר על אחוז ההנחה אם שניהם מולאו. אם נמוך מהמחיר הרגיל — המחיר הרגיל יוצג מחוק והמוצר יסומן במבצע."],
    ["• במלאי / מומלץ: כן או לא."],
    ["• קובץ תמונה: שם/שמות הקבצים כפי שהם אצלכם במחשב, מופרדים בפסיק — הראשון יהיה התמונה הראשית והשאר יתווספו כגלריה (למשל sofa1, sofa1-side). אין צורך לכתוב את הסיומת (jpg/png וכו'). בעת הייבוא בוחרים גם את קובצי התמונות."],
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

/**
 * The product's OWN discount as a whole number, or "" when it has none.
 * Discounts inherited from a sale category are deliberately left out: they
 * live on the category, and writing them into each row would freeze them —
 * re-importing the file would turn a live category sale into per-product
 * prices that no longer end when the category's schedule does.
 */
function ownDiscountPercent(p: Product): number | "" {
  const list = parseFloat(p.price);
  const sale = p.salePrice ? parseFloat(p.salePrice) : NaN;
  if (!Number.isFinite(list) || list <= 0 || !Number.isFinite(sale) || sale <= 0 || sale >= list) {
    return "";
  }
  return Math.round((1 - sale / list) * 100);
}

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
    // Whole number, derived from the two prices — round-tripping the export
    // back through the import must not shift anyone's price by a shekel.
    "אחוז הנחה": ownDiscountPercent(p),
    "מחיר מבצע": p.salePrice ? parseFloat(p.salePrice) : "",
    "צבעים": p.colors.map((k) => colorLabel(k, "he")).join(", "),
    "רוחב סמ": p.widthCm ?? "",
    "עומק סמ": p.depthCm ?? "",
    "גובה סמ": p.heightCm ?? "",
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

/** Excel cell → positive whole cm, or null when empty/invalid. */
function dim(v: unknown): number | null {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
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

    // Sale: an explicit sale price wins; otherwise a discount % computes one.
    // An empty percentage cell is 0 — no discount, never null/undefined, so
    // downstream arithmetic never has to guard for it.
    const saleRaw = str(row["מחיר מבצע"]).replace(/[₪,\s]/g, "");
    const pctRaw = str(row["אחוז הנחה"]).replace(/[%,\s]/g, "");
    const pctNum = pctRaw ? parseFloat(pctRaw) : 0;
    const pct = Number.isFinite(pctNum) && pctNum > 0 ? Math.round(pctNum) : 0;
    if (pctRaw && (!Number.isFinite(pctNum) || pctNum < 0 || pctNum >= 100)) {
      warnings.push(`badDiscountPercent:${pctRaw}`);
    }

    let salePrice: string | null = null;
    if (saleRaw) {
      const saleNum = parseFloat(saleRaw);
      if (!Number.isFinite(saleNum) || saleNum <= 0 || saleNum >= price) {
        warnings.push(`badSalePrice:${saleRaw}`);
      } else {
        salePrice = saleNum.toFixed(2);
      }
    } else if (pct > 0 && pct < 100 && Number.isFinite(price) && price > 0) {
      salePrice = applyDiscount(price, pct).toFixed(2);
    }

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

    const imageFiles = str(row["קובץ תמונה"])
      .split(",")
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
      onSale: salePrice !== null,
      salePrice,
      colors,
      widthCm: dim(row["רוחב סמ"]),
      depthCm: dim(row["עומק סמ"]),
      heightCm: dim(row["גובה סמ"]),
      inStock: parseBool(row["במלאי"], true),
      featured: parseBool(row["מומלץ"], false),
      imageFiles,
      errors,
      warnings,
    };
  });
}

/** Strip a file extension for matching — she shouldn't have to type ".jpg". */
export function stripExt(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, "");
}
