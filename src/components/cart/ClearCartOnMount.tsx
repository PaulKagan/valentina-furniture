"use client";

/**
 * Empties the cart once the customer has actually landed on this page —
 * used on /order-confirmed instead of clearing from checkout itself, so a
 * still-mounted checkout page never sees an empty cart mid-navigation and
 * fights the redirect to /order-confirmed with its own empty-cart guard.
 */
import { useEffect } from "react";
import { useCart } from "./CartContext";

export default function ClearCartOnMount() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
