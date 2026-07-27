"use client";

/**
 * Shopping cart — entirely client-side, persisted to localStorage.
 * No server cart/session: the price shown here is provisional (for display
 * only). The real, trusted price is computed server-side at checkout from
 * the DB (see lib/orders.ts) — a tampered cart in localStorage can't change
 * what's actually charged.
 */
import { createContext, useContext, useEffect, useReducer } from "react";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type CartState = { items: CartItem[] };
type Action =
  | { type: "ADD"; item: Omit<CartItem, "quantity"> }
  | { type: "REMOVE"; id: number }
  | { type: "UPDATE_QTY"; id: number; quantity: number }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, quantity: 1 }] };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.id !== action.id) };
    case "UPDATE_QTY":
      if (action.quantity < 1) return { items: state.items.filter((i) => i.id !== action.id) };
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

const CartContext = createContext<{
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (id: number) => void;
  updateQty: (id: number, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, (init) => {
    if (typeof window === "undefined") return init;
    try {
      const stored = localStorage.getItem("valentina-cart");
      return stored ? JSON.parse(stored) : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    localStorage.setItem("valentina-cart", JSON.stringify(state));
  }, [state]);

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        add: (item) => dispatch({ type: "ADD", item }),
        remove: (id) => dispatch({ type: "REMOVE", id }),
        updateQty: (id, quantity) => dispatch({ type: "UPDATE_QTY", id, quantity }),
        clear: () => dispatch({ type: "CLEAR" }),
        total,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
