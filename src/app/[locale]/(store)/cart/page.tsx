"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import { useTranslations } from "next-intl";
import { TrashIcon as Trash2, PlusIcon as Plus, MinusIcon as Minus, ShoppingCartIcon } from "@phosphor-icons/react/ssr";

export default function CartPage() {
  const { items, remove, updateQty, total, count } = useCart();
  const t = useTranslations("cart");

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        {/* Muted, not the brand color — an empty state, not an action */}
        <ShoppingCartIcon size={64} color="var(--muted)" className="mx-auto mb-6" aria-hidden="true" />
        <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          {t("empty")}
        </h1>
        <p className="mb-8" style={{ color: "var(--muted)" }}>
          {t("emptyDesc")}
        </p>
        <Link
          href="/products"
          className="inline-flex px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {t("browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <ul className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 p-4 rounded-xl border"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--surface)" }}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🪑</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: "var(--ink)" }}>
                  {item.name}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  ₪{item.price.toLocaleString()} {t("perUnit")}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 border rounded-lg px-2 py-1" style={{ borderColor: "var(--border)" }}>
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} aria-label={t("decreaseQty")}>
                      <Minus size={14} style={{ color: "var(--ink)" }} />
                    </button>
                    <span className="text-sm w-6 text-center font-medium" style={{ color: "var(--ink)" }}>
                      {item.quantity}
                    </span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} aria-label={t("increaseQty")}>
                      <Plus size={14} style={{ color: "var(--ink)" }} />
                    </button>
                  </div>
                  <button onClick={() => remove(item.id)} className="p-1" aria-label={t("removeItem")}>
                    <Trash2 size={16} style={{ color: "var(--muted)" }} />
                  </button>
                </div>
              </div>

              <p className="font-bold text-base flex-shrink-0" style={{ color: "var(--ink)" }}>
                ₪{(item.price * item.quantity).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="h-fit rounded-xl border p-6 flex flex-col gap-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h2 className="font-bold text-lg" style={{ color: "var(--ink)" }}>
            {t("summary")}
          </h2>
          <div className="flex justify-between text-sm" style={{ color: "var(--muted)" }}>
            <span>{t("itemsCount")}</span>
            <span>{count}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
            <span>{t("total")}</span>
            <span>₪{total.toLocaleString()}</span>
          </div>
          <Link
            href="/checkout"
            className="block text-center py-3 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {t("checkout")}
          </Link>
          <Link href="/products" className="text-center text-sm" style={{ color: "var(--muted)" }}>
            {t("continueShopping")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
