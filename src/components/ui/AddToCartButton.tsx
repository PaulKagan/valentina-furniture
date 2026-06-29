"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { useState } from "react";

type Props = { product: { id: number; name: string; price: number; imageUrl: string | null } };

export default function AddToCartButton({ product }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button
      onClick={handleAdd}
      className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98]"
      style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
    >
      {added ? <Check size={18} /> : <ShoppingCart size={18} />}
      {added ? "נוסף לעגלה!" : "הוסף לעגלה"}
    </button>
  );
}
