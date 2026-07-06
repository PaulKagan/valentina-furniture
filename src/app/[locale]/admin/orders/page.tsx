import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.orders" });
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  const statusLabels = {
    pending: t("statusValues.pending"),
    confirmed: t("statusValues.confirmed"),
    cancelled: t("statusValues.cancelled"),
    delivered: t("statusValues.delivered"),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        {t("title")}
      </h1>

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {["#", t("customer"), t("phone"), t("address"), t("total"), t("items"), t("status"), t("date")].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--muted)" }}>
                  {t("noOrders")}
                </td>
              </tr>
            )}
            {allOrders.map((o) => {
              const items = JSON.parse(o.items) as Array<{ name: string; quantity: number }>;
              return (
                <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>#{o.id}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{o.customerName}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }} dir="ltr">{o.customerPhone}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)", maxWidth: "150px" }}>
                    <span className="truncate block">{o.customerAddress}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ink)" }}>₪{parseFloat(o.total).toLocaleString("he-IL")}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderId={o.id} currentStatus={o.status} labels={statusLabels} />
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {new Date(o.createdAt).toLocaleDateString(locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-GB")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
