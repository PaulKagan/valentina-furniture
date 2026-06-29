"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/db/schema";

type Product = InferSelectModel<typeof products>;

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();

  const price = parseFloat(product.price);

  return (
    <article
      className="group flex flex-col rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md fade-up"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg)",
        "--delay": `${index * 80}ms`,
      } as React.CSSProperties}
    >
      <Link href={`/products/${product.id}`} className="block aspect-[4/3] relative overflow-hidden bg-[oklch(0.974_0_0)]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🪑</div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}>
              אזל מהמלאי
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold leading-snug transition-colors group-hover:text-[oklch(0.52_0.14_32)]" style={{ color: "var(--ink)" }}>
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>
            ₪{price.toLocaleString("he-IL")}
          </span>
          <button
            onClick={() => add({ id: product.id, name: product.name, price, imageUrl: product.imageUrl })}
            disabled={!product.inStock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
            aria-label={`הוסף ${product.name} לעגלה`}
          >
            <ShoppingCart size={14} />
            הוסף
          </button>
        </div>
      </div>
    </article>
  );
}
