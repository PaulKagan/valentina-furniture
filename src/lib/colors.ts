/**
 * Fixed product color palette — client-safe (no DB imports).
 *
 * A closed list is what makes color filtering work: products store the
 * stable `key`, the UI shows the localized label and a swatch. Free-text
 * colors would fragment the filter ("אפור" vs "אפור בהיר" vs "gray").
 * The Excel import accepts any of the three language names per color.
 */

export type ProductColor = {
  key: string;
  /** CSS color for the swatch chip */
  swatch: string;
  he: string;
  en: string;
  ru: string;
};

export const COLORS: ProductColor[] = [
  { key: "white", swatch: "#ffffff", he: "לבן", en: "White", ru: "Белый" },
  { key: "cream", swatch: "#f5ecd7", he: "קרם", en: "Cream", ru: "Кремовый" },
  { key: "beige", swatch: "#d9c7a7", he: "בז'", en: "Beige", ru: "Бежевый" },
  { key: "gray", swatch: "#9aa0a6", he: "אפור", en: "Gray", ru: "Серый" },
  { key: "black", swatch: "#1f1f1f", he: "שחור", en: "Black", ru: "Чёрный" },
  { key: "brown", swatch: "#6b4a2f", he: "חום", en: "Brown", ru: "Коричневый" },
  { key: "wood", swatch: "#b08447", he: "עץ טבעי", en: "Natural wood", ru: "Дерево" },
  { key: "blue", swatch: "#3b5b92", he: "כחול", en: "Blue", ru: "Синий" },
  { key: "green", swatch: "#4a6b4f", he: "ירוק", en: "Green", ru: "Зелёный" },
  { key: "red", swatch: "#a33b3b", he: "אדום", en: "Red", ru: "Красный" },
  { key: "pink", swatch: "#d9a0b0", he: "ורוד", en: "Pink", ru: "Розовый" },
  { key: "yellow", swatch: "#d9b23b", he: "צהוב", en: "Yellow", ru: "Жёлтый" },
  { key: "orange", swatch: "#c97b3b", he: "כתום", en: "Orange", ru: "Оранжевый" },
  { key: "gold", swatch: "#c2a24b", he: "זהב", en: "Gold", ru: "Золотой" },
  { key: "silver", swatch: "#c0c4c9", he: "כסף", en: "Silver", ru: "Серебряный" },
];

const BY_KEY = new Map(COLORS.map((c) => [c.key, c]));

export function colorByKey(key: string): ProductColor | undefined {
  return BY_KEY.get(key);
}

export function colorLabel(key: string, locale: string): string {
  const c = BY_KEY.get(key);
  if (!c) return key;
  return locale === "en" ? c.en : locale === "ru" ? c.ru : c.he;
}

/**
 * Resolve a free-form color name (any language, any case) to a palette key.
 * Used by the Excel import so "אפור", "Gray" and "серый" all become "gray".
 */
export function colorKeyFromName(name: string): string | undefined {
  const n = name.trim().toLowerCase();
  for (const c of COLORS) {
    if (c.key === n || c.he === name.trim() || c.en.toLowerCase() === n || c.ru.toLowerCase() === n) {
      return c.key;
    }
  }
  return undefined;
}
