/**
 * ProductCard — reusable grid tile for a single product.
 *
 * Used on the homepage (featured grid) and the product listing page.
 * Handles: image (uniform 4:3 Cloudinary crop), localized name, price,
 * add-to-cart, out-of-stock overlay, and a sale badge when the product's
 * category branch is promoted.
 *
 * Animation (Emil Kowalski):
 *   - fade-up entrance with staggered delay via CSS custom property --delay
 *   - Card hover: translateY(-2px) — only on devices that support hover
 *     (gated with @media (hover: hover)) so mobile doesn't get stuck
 *   - "Add" button: scale(0.97) on :active for tactile press feel
 *   - On add: the image pops (contained zoom, clipped by its own frame —
 *     never bleeds into the card's text or a neighboring grid tile) and a
 *     light "shine" sweeps across it once. Driven by the Web Animations API
 *     rather than a CSS class toggle so rapid repeated clicks each replay
 *     cleanly instead of getting stuck mid-animation waiting on state.
 */
"use client";

import FallbackImage from "./FallbackImage";
import { Link } from "@/i18n/navigation";
import { ShoppingCartIcon as ShoppingCart, CheckIcon as Check } from "@phosphor-icons/react/ssr";
import { useCart } from "@/components/cart/CartContext";
import { useTranslations, useLocale } from "next-intl";
import { useRef, useState } from "react";
import { localizedName } from "@/lib/i18n-fields";
import { imageUrl } from "@/lib/images";
import { effectivePrice, listPrice, discountPercent } from "@/lib/pricing";
import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/db/schema";

type Product = InferSelectModel<typeof products>;

export default function ProductCard({
  product,
  index = 0,
  discount = 0,
}: {
  product: Product;
  index?: number;
  /** Inherited category discount %, resolved by the page (0 = none) */
  discount?: number;
}) {
  const { add } = useCart();
  const t = useTranslations("products");
  const locale = useLocale();
  const [added, setAdded] = useState(false);
  const imgScaleRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const price = effectivePrice(product, discount);
  const wasPrice = listPrice(product, discount);
  const percent = discountPercent(product, discount);
  const name = localizedName(product, locale);
  const img = imageUrl(
    product.imageUrl,
    "card",
    product.focalX != null && product.focalY != null ? { x: product.focalX, y: product.focalY } : null,
    product.imageWidth != null && product.imageHeight != null ? { width: product.imageWidth, height: product.imageHeight } : null
  );

  return (
    <article
      className="group flex flex-col rounded-xl border overflow-hidden fade-up"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg)",
        "--delay": `${index * 50}ms`, // 50ms stagger — tight enough to feel fast
        // Card lift on hover — CSS transition so it's interruptible (Emil)
        transition: "transform 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), box-shadow 180ms",
      } as React.CSSProperties}
      // Inline style because Tailwind can't read CSS vars in arbitrary values
      onMouseEnter={(e) => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px oklch(0.18 0.012 32 / 0.08)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {/* Product image — c_fill,ar_4:3 Cloudinary crop keeps every card identical */}
      <Link
        href={`/products/${product.id}`}
        className="block aspect-[4/3] relative overflow-hidden"
        style={{ backgroundColor: "var(--surface)" }}
      >
        {/* Falls back to the shared placeholder both when there's no photo
            and if a real URL ever stops resolving (e.g. Cloudinary outage).
            Wrapped in its own inset div so the add-to-cart "pop" scales just
            the image — the outer frame above stays fixed size, clipping it. */}
        <div ref={imgScaleRef} className="absolute inset-0">
          <FallbackImage
            src={img ?? ""}
            alt={img ? name : ""}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300"
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          />
        </div>

        {/* Shine sweep — plays once on add, invisible otherwise */}
        <div
          ref={shineRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0,
            background: "linear-gradient(75deg, transparent 42%, rgba(255,255,255,0.75) 50%, transparent 58%)",
          }}
        />

        {/* Badge — shown only when the product is genuinely discounted,
            whether that discount is its own or inherited from a sale category */}
        {product.inStock && percent !== null && (
          <span
            className="absolute top-2 start-2 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            🔥 -{percent}%
          </span>
        )}

        {/* Out-of-stock overlay — shown on top of the image */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}
            >
              {t("outOfStock")}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <Link href={`/products/${product.id}`}>
          <h3
            className="font-semibold leading-snug"
            style={{ color: "var(--ink)" }}
          >
            {name}
          </h3>
        </Link>

        <div
          className="flex items-center justify-between mt-auto pt-2 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="flex items-baseline gap-2">
            {wasPrice !== null && (
              <s className="text-sm" style={{ color: "var(--muted)" }} aria-label={t("wasPrice")}>
                ₪{wasPrice.toLocaleString("he-IL")}
              </s>
            )}
            <span
              className="text-lg font-bold"
              style={{ color: wasPrice !== null ? "var(--primary)" : "var(--ink)" }}
            >
              ₪{price.toLocaleString("he-IL")}
            </span>
          </span>

          {/* Add to cart — scale(0.97) on active gives tactile press feedback (Emil).
              Swaps to a checkmark for a beat so clicking doesn't feel like a no-op. */}
          <button
            onClick={() => {
              add({ id: product.id, name, price, imageUrl: product.imageUrl });
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);

              imgScaleRef.current?.animate(
                [
                  { transform: "scale(1)" },
                  { transform: "scale(1.08)", offset: 0.45 },
                  { transform: "scale(1)" },
                ],
                { duration: 420, easing: "cubic-bezier(0.23,1,0.32,1)" }
              );
              shineRef.current?.animate(
                [
                  { transform: "translateX(-120%) rotate(3deg)", opacity: 0 },
                  { opacity: 1, offset: 0.15 },
                  { transform: "translateX(120%) rotate(3deg)", opacity: 0 },
                ],
                { duration: 650, easing: "ease-out" }
              );
            }}
            disabled={!product.inStock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-fg)",
              transition: "opacity 150ms, transform 120ms cubic-bezier(0.23,1,0.32,1)",
            }}
            aria-label={t("addAriaLabel", { name })}
          >
            {added ? <Check size={14} aria-hidden="true" /> : <ShoppingCart size={14} aria-hidden="true" />}
            {added ? t("added") : t("addToCart")}
          </button>
        </div>
      </div>
    </article>
  );
}
