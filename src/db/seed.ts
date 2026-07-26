/**
 * Demo data seeder — `npm run db:seed`
 *
 * Fills an empty database with a realistic catalog so the store can be
 * explored without typing hundreds of products by hand:
 *   - a nested category tree (top level → subcategories, one 3 levels deep)
 *   - one promoted "sale" category, one hidden, one expired, one scheduled
 *   - ~96 products across every category with varied prices, colors,
 *     dimensions, stock and featured flags
 *   - a handful of orders in different statuses
 *
 * Images: products are left without a photo on purpose — the store shows
 * public/placeholder-product.svg, so the layout can be judged without
 * uploading anything to Cloudinary.
 *
 * Safe by default: refuses to run if products already exist, so it can't
 * silently duplicate a real catalog. Pass --force to wipe and reseed.
 *
 *   npm run db:seed
 *   npm run db:seed -- --force
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// NOTE: db/schema are imported dynamically inside main(), not at the top.
// ES module imports are hoisted and run BEFORE the config() calls above, so
// a static `import { db }` would build its connection while DATABASE_URL was
// still undefined — which failed with a confusing auth error.

const FORCE = process.argv.includes("--force");

/** Deterministic pseudo-random so reseeding gives the same catalog. */
let seed = 42;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

type CatSpec = {
  name: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  children?: CatSpec[];
  promoted?: boolean;
  visible?: boolean;
  startsAt?: Date;
  endsAt?: Date;
  /** product name templates: [he, en, ru] */
  items?: [string, string, string][];
};

const DAY = 24 * 60 * 60 * 1000;

const TREE: CatSpec[] = [
  {
    name: "סלון", nameEn: "Living Room", nameRu: "Гостиная", slug: "living-room",
    children: [
      {
        name: "ספות", nameEn: "Sofas", nameRu: "Диваны", slug: "sofas",
        items: [
          ["ספה תלת מושבית", "3-Seat Sofa", "Трёхместный диван"],
          ["ספה דו מושבית", "2-Seat Sofa", "Двухместный диван"],
          ["ספה מודולרית", "Modular Sofa", "Модульный диван"],
          ["ספת עור", "Leather Sofa", "Кожаный диван"],
          ["ספה נפתחת", "Sofa Bed", "Диван-кровать"],
        ],
        children: [
          {
            name: "ספות פינתיות", nameEn: "Corner Sofas", nameRu: "Угловые диваны", slug: "corner-sofas",
            items: [
              ["ספה פינתית ימנית", "Right Corner Sofa", "Угловой диван справа"],
              ["ספה פינתית שמאלית", "Left Corner Sofa", "Угловой диван слева"],
              ["ספה פינתית עם שזלונג", "Corner Sofa with Chaise", "Угловой диван с шезлонгом"],
            ],
          },
        ],
      },
      {
        name: "שולחנות סלון", nameEn: "Coffee Tables", nameRu: "Журнальные столы", slug: "coffee-tables",
        items: [
          ["שולחן סלון עץ מלא", "Solid Wood Coffee Table", "Журнальный стол из массива"],
          ["שולחן סלון שיש", "Marble Coffee Table", "Мраморный журнальный стол"],
          ["שולחן צד עגול", "Round Side Table", "Круглый приставной столик"],
          ["סט שולחנות מקוננים", "Nesting Table Set", "Набор столиков"],
        ],
      },
      {
        name: "כורסאות", nameEn: "Armchairs", nameRu: "Кресла", slug: "armchairs",
        items: [
          ["כורסת קריאה", "Reading Armchair", "Кресло для чтения"],
          ["כורסה מתנדנדת", "Rocking Armchair", "Кресло-качалка"],
          ["כורסת רקליינר", "Recliner Armchair", "Кресло-реклайнер"],
          ["פוף מרופד", "Upholstered Pouf", "Мягкий пуф"],
        ],
      },
    ],
  },
  {
    name: "חדר שינה", nameEn: "Bedroom", nameRu: "Спальня", slug: "bedroom",
    children: [
      {
        name: "מיטות", nameEn: "Beds", nameRu: "Кровати", slug: "beds",
        items: [
          ["מיטה זוגית עץ מלא", "Solid Wood Double Bed", "Двуспальная кровать из массива"],
          ["מיטה זוגית מרופדת", "Upholstered Double Bed", "Мягкая двуспальная кровать"],
          ["מיטת יחיד", "Single Bed", "Односпальная кровать"],
          ["מיטה עם ארגז מצעים", "Storage Bed", "Кровать с ящиком"],
          ["מיטת קומותיים", "Bunk Bed", "Двухъярусная кровать"],
        ],
      },
      {
        name: "ארונות", nameEn: "Wardrobes", nameRu: "Шкафы", slug: "wardrobes",
        items: [
          ["ארון הזזה 3 דלתות", "3-Door Sliding Wardrobe", "Шкаф-купе 3 двери"],
          ["ארון 4 דלתות", "4-Door Wardrobe", "Шкаф 4 двери"],
          ["ארון פינתי", "Corner Wardrobe", "Угловой шкаф"],
        ],
      },
      {
        name: "שידות", nameEn: "Nightstands", nameRu: "Тумбы", slug: "nightstands",
        items: [
          ["שידת לילה 2 מגירות", "2-Drawer Nightstand", "Тумба 2 ящика"],
          ["שידת איפור", "Vanity Table", "Туалетный столик"],
          ["שידת מגירות גבוהה", "Tall Dresser", "Высокий комод"],
        ],
      },
    ],
  },
  {
    name: "פינת אוכל", nameEn: "Dining Room", nameRu: "Столовая", slug: "dining-room",
    children: [
      {
        name: "שולחנות אוכל", nameEn: "Dining Tables", nameRu: "Обеденные столы", slug: "dining-tables",
        items: [
          ["שולחן אוכל נפתח", "Extendable Dining Table", "Раздвижной обеденный стол"],
          ["שולחן אוכל עגול", "Round Dining Table", "Круглый обеденный стол"],
          ["שולחן אוכל זכוכית", "Glass Dining Table", "Стеклянный обеденный стол"],
        ],
      },
      {
        name: "כיסאות", nameEn: "Chairs", nameRu: "Стулья", slug: "chairs",
        items: [
          ["כיסא אוכל מרופד", "Upholstered Dining Chair", "Мягкий обеденный стул"],
          ["כיסא עץ קלאסי", "Classic Wooden Chair", "Классический деревянный стул"],
          ["כיסא בר", "Bar Stool", "Барный стул"],
          ["כיסא מעוצב", "Designer Chair", "Дизайнерский стул"],
        ],
      },
    ],
  },
  {
    name: "אחסון", nameEn: "Storage", nameRu: "Хранение", slug: "storage",
    items: [
      ["מזנון סלון", "Living Room Sideboard", "Комод в гостиную"],
      ["כוננית ספרים", "Bookshelf", "Книжный стеллаж"],
      ["ויטרינה", "Display Cabinet", "Витрина"],
      ["מדף קיר", "Wall Shelf", "Настенная полка"],
      ["ארגז אחסון", "Storage Chest", "Ящик для хранения"],
    ],
  },
  {
    name: "מבצעי הקיץ", nameEn: "Summer Sale", nameRu: "Летняя распродажа", slug: "summer-sale",
    promoted: true,
    items: [
      ["מארז סלון במבצע", "Living Room Set Deal", "Комплект для гостиной"],
      ["כורסה במחיר מיוחד", "Armchair Special", "Кресло по спеццене"],
      ["שולחן קפה במבצע", "Coffee Table Deal", "Журнальный стол по акции"],
      ["מנורת רצפה במבצע", "Floor Lamp Deal", "Торшер по акции"],
    ],
  },
  {
    // Demonstrates the schedule feature: window already closed
    name: "מבצעי פסח", nameEn: "Passover Sale", nameRu: "Пасхальная акция", slug: "passover-sale",
    startsAt: new Date(Date.now() - 90 * DAY),
    endsAt: new Date(Date.now() - 30 * DAY),
    items: [["ערכת ניקיון לפסח", "Passover Cleaning Set", "Набор для уборки"]],
  },
  {
    // Window opens in the future — should not appear in the store yet
    name: "קולקציית חורף", nameEn: "Winter Collection", nameRu: "Зимняя коллекция", slug: "winter-collection",
    startsAt: new Date(Date.now() + 60 * DAY),
    endsAt: new Date(Date.now() + 150 * DAY),
    items: [["שמיכת פוך", "Down Duvet", "Пуховое одеяло"]],
  },
  {
    // Manually hidden — invisible in the store, still editable in admin
    name: "טיוטות", nameEn: "Drafts", nameRu: "Черновики", slug: "drafts",
    visible: false,
    items: [["מוצר בהכנה", "Work in Progress", "Товар в подготовке"]],
  },
];

const MATERIALS_HE = ["עץ אלון", "עץ אגוז", "בד רחיץ", "קטיפה", "עור סינתטי", "מתכת ועץ"];
const MATERIALS_EN = ["oak", "walnut", "washable fabric", "velvet", "faux leather", "metal and wood"];

async function main() {
  const { db } = await import("./index");
  const { categories, products, orders } = await import("./schema");
  const { COLORS } = await import("../lib/colors");
  const { eq } = await import("drizzle-orm");

  const existing = await db.select({ id: products.id }).from(products);
  if (existing.length > 0 && !FORCE) {
    console.log(
      `\n⚠  Database already has ${existing.length} products — not touching it.\n` +
        `   Run "npm run db:seed -- --force" to DELETE everything and reseed.\n`
    );
    process.exit(0);
  }

  if (FORCE) {
    console.log("Clearing existing data...");
    await db.delete(orders);
    await db.delete(products);
    // Children first: categories self-reference, so delete leaves upward
    const all = await db.select().from(categories);
    const byDepth = [...all].sort((a, b) => (b.parentId ?? 0) - (a.parentId ?? 0));
    for (const c of byDepth) {
      await db.delete(categories).where(eq(categories.id, c.id));
    }
  }

  let catCount = 0;
  let prodCount = 0;

  /** Insert a category subtree, then its products. */
  async function insertCat(spec: CatSpec, parentId: number | null, order: number) {
    const [cat] = await db
      .insert(categories)
      .values({
        name: spec.name,
        nameEn: spec.nameEn,
        nameRu: spec.nameRu,
        slug: spec.slug,
        parentId,
        visible: spec.visible ?? true,
        promoted: spec.promoted ?? false,
        startsAt: spec.startsAt ?? null,
        endsAt: spec.endsAt ?? null,
        sortOrder: order,
      })
      .returning({ id: categories.id });
    catCount++;

    for (const [i, tpl] of (spec.items ?? []).entries()) {
      const [he, en, ru] = tpl;
      // A few variants per template so the catalog has real volume
      const variants = between(2, 4);
      for (let v = 0; v < variants; v++) {
        const matIdx = Math.floor(rnd() * MATERIALS_HE.length);
        const colorCount = between(1, 3);
        const chosen: string[] = [];
        while (chosen.length < colorCount) {
          const key = pick(COLORS).key;
          if (!chosen.includes(key)) chosen.push(key);
        }
        const suffix = v === 0 ? "" : ` ${["דגם A", "דגם B", "דגם C"][v - 1] ?? `דגם ${v}`}`;
        const price = between(3, 120) * 50 + 49; // 199 … 6049, ends in 49
        await db.insert(products).values({
          name: `${he}${suffix}`,
          nameEn: v === 0 ? en : `${en} ${["Model A", "Model B", "Model C"][v - 1] ?? `Model ${v}`}`,
          // Leave Russian empty on some rows to exercise the language fallback
          nameRu: rnd() > 0.25 ? ru : null,
          description: `${he} מ${MATERIALS_HE[matIdx]}. מתאים לכל סגנון עיצוב, עם גימור איכותי ועמיד.`,
          descriptionEn: rnd() > 0.4 ? `${en} in ${MATERIALS_EN[matIdx]}. Durable finish, fits any interior style.` : null,
          descriptionRu: null,
          price: String(price),
          categoryId: cat.id,
          colors: chosen,
          widthCm: between(40, 280),
          depthCm: between(35, 110),
          heightCm: between(40, 220),
          inStock: rnd() > 0.15, // ~15% out of stock
          featured: i === 0 && v === 0 && rnd() > 0.4,
        });
        prodCount++;
      }
    }

    for (const [i, child] of (spec.children ?? []).entries()) {
      await insertCat(child, cat.id, i);
    }
  }

  for (const [i, spec] of TREE.entries()) {
    await insertCat(spec, null, i);
  }

  // A few orders in different statuses so the admin has something to work with
  const catalog = await db.select().from(products).limit(40);
  const CUSTOMERS: [string, string, string, string | null][] = [
    ["דנה כהן", "0501234567", "הרצל 12, תל אביב", "dana@example.com"],
    ["מיכאל לוי", "0529876543", "ביאליק 5, רמת גן", null],
    ["Anna Petrova", "0533456789", "Rothschild 40, Tel Aviv", "anna@example.com"],
    ["יוסי מזרחי", "0544455566", "הנביאים 3, ירושלים", null],
    ["שרה אברהם", "0556677889", "ויצמן 22, חיפה", "sara@example.com"],
  ];
  const STATUSES = ["pending", "pending", "confirmed", "delivered", "cancelled"] as const;

  for (const [i, [name, phone, address, email]] of CUSTOMERS.entries()) {
    const lineCount = between(1, 3);
    const items: { productId: number; name: string; price: number; quantity: number }[] = [];
    let total = 0;
    for (let l = 0; l < lineCount; l++) {
      const p = pick(catalog);
      if (items.some((it) => it.productId === p.id)) continue;
      const qty = between(1, 2);
      const price = parseFloat(p.price);
      items.push({ productId: p.id, name: p.name, price, quantity: qty });
      total += price * qty;
    }
    await db.insert(orders).values({
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      customerAddress: address,
      items: JSON.stringify(items),
      total: total.toFixed(2),
      status: STATUSES[i],
      notes: i % 2 === 0 ? "נא לתאם טלפונית לפני המשלוח" : null,
    });
  }

  console.log(
    `\n✓ Seeded ${catCount} categories, ${prodCount} products, ${CUSTOMERS.length} orders.\n` +
      `  Includes: a promoted sale category, an expired one, a scheduled one,\n` +
      `  and a hidden one — so you can see how each behaves in the store.\n`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
