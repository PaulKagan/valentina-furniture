/**
 * /admin/orders/[id] — single order control panel.
 * Server component: loads the order plus thumbnails for its items,
 * hands everything to the client panel.
 */
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import BackLink from "@/components/ui/BackLink";
import OrderDetail, { type OrderData } from "@/components/admin/OrderDetail";
import { isEmailConfigured } from "@/lib/email";
import { parseOrderItems } from "@/lib/order-items";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.id, numId));
  if (!order) notFound();

  const t = await getTranslations({ locale, namespace: "admin.orderDetail" });

  const items = parseOrderItems(order.items);

  // Thumbnails for the items still present in the catalog
  const images: Record<number, string | null> = {};
  const ids = items.map((i) => i.productId).filter((n) => Number.isInteger(n));
  if (ids.length > 0) {
    const rows = await db
      .select({ id: products.id, imageUrl: products.imageUrl })
      .from(products)
      .where(inArray(products.id, ids));
    for (const r of rows) images[r.id] = r.imageUrl;
  }

  const data: OrderData = {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerAddress: order.customerAddress,
    customerFloor: order.customerFloor,
    // cardType: order.cardType,
    // cardLast4: order.cardLast4,
    items,
    total: order.total,
    status: order.status,
    notes: order.notes,
    adminNote: order.adminNote,
    createdAt: order.createdAt.toISOString(),
  };

  return (
    <div>
      <BackLink
        label={t("backToOrders")}
        fallbackHref="/admin/orders"
        className="no-print inline-flex items-center gap-1 text-sm mb-4 hover:opacity-70"
      />
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
      >
        {t("orderNumber", { id: order.id })}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {new Date(order.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "he-IL")}
      </p>
      <OrderDetail order={data} images={images} emailConfigured={isEmailConfigured()} />
    </div>
  );
}
