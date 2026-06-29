/**
 * ProductCard — reusable grid tile for a single product.
 *
 * Used on the homepage (featured grid) and the product listing page.
 * Handles: image, name, price, add-to-cart, out-of-stock overlay.
 *
 * Animation (Emil Kowalski):
 *   - fade-up entrance with staggered delay via CSS custom property --delay
 *   - Card hover: translateY(-2px) — only on devices that support hover
 *     (gated with @media (hover: hover)) so mobile doesn't get stuck
 *   - "Add" button: scale(0.97) on :active for tactile press feel
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/db/schema";

type Product = InferSelectModel<typeof products>;

export default function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const { add } = useCart();
  const price = parseFloat(product.price);

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
      {/* Product image — 4:3 ratio keeps the grid uniform regardless of photo dimensions */}
      <Link
        href={`/products/${product.id}`}
        className="block aspect-[4/3] relative overflow-hidden"
        style={{ backgroundColor: "var(--surface)" }}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300"
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🪑</div>
        )}

        {/* Out-of-stock overlay — shown on top of the image */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}
            >
              אזל מהמלאי
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
            {product.name}
          </h3>
        </Link>

        <div
          className="flex items-center justify-between mt-auto pt-2 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>
            ₪{price.toLocaleString("he-IL")}
          </span>

          {/* Add to cart — scale(0.97) on active gives tactile press feedback (Emil) */}
          <button
            onClick={() =>
              add({ id: product.id, name: product.name, price, imageUrl: product.imageUrl })
            }
            disabled={!product.inStock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-fg)",
              transition: "opacity 150ms, transform 120ms cubic-bezier(0.23,1,0.32,1)",
            }}
            aria-label={`הוסף ${product.name} לעגלה`}
          >
            <ShoppingCart size={14} aria-hidden="true" />
            הוסף
          </button>
        </div>
      </div>
    </article>
  );
}
