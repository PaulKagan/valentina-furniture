import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";

export default async function AdminOrdersPage() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  const STATUS_LABELS: Record<string, string> = {
    pending: "ממתינה",
    confirmed: "מאושרת",
    cancelled: "בוטלה",
    delivered: "סופקה",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        הזמנות
      </h1>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {["#", "לקוח", "טלפון", "כתובת", "סה\"כ", "פריטים", "סטטוס", "תאריך"].map((h) => (
                <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allOrders.map((o) => {
              const items = JSON.parse(o.items) as Array<{ name: string; quantity: number }>;
              return (
                <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>#{o.id}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{o.customerName}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{o.customerPhone}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)", maxWidth: "150px" }}>
                    <span className="truncate block">{o.customerAddress}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ink)" }}>₪{parseFloat(o.total).toLocaleString("he-IL")}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderId={o.id} currentStatus={o.status} labels={STATUS_LABELS} />
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {new Date(o.createdAt).toLocaleDateString("he-IL")}
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
