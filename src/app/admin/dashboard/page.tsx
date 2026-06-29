import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, count, sum, desc } from "drizzle-orm";

export default async function DashboardPage() {
  const [totalOrders] = await db.select({ count: count() }).from(orders);
  const [pendingOrders] = await db.select({ count: count() }).from(orders).where(eq(orders.status, "pending"));
  const [totalProducts] = await db.select({ count: count() }).from(products);
  const [revenue] = await db.select({ sum: sum(orders.total) }).from(orders).where(eq(orders.status, "confirmed"));

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

  const STATUS_LABELS: Record<string, string> = {
    pending: "ממתינה",
    confirmed: "מאושרת",
    cancelled: "בוטלה",
    delivered: "סופקה",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        סקירה כללית
      </h1>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "הזמנות בסה\"כ", value: totalOrders.count },
          { label: "ממתינות לאישור", value: pendingOrders.count },
          { label: "מוצרים פעילים", value: totalProducts.count },
          { label: "הכנסות מאושרות (₪)", value: (parseFloat(revenue.sum ?? "0")).toLocaleString("he-IL") },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl border" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
            <dd className="text-2xl font-bold mb-1" style={{ color: "var(--primary)" }}>
              {stat.value}
            </dd>
            <dt className="text-sm" style={{ color: "var(--muted)" }}>
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
            הזמנות אחרונות
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {["#", "לקוח", "טלפון", "סה\"כ", "סטטוס", "תאריך"].map((h) => (
                <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>#{o.id}</td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{o.customerName}</td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{o.customerPhone}</td>
                <td className="px-4 py-3" style={{ color: "var(--ink)" }}>₪{parseFloat(o.total).toLocaleString("he-IL")}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "oklch(0.974 0.004 32)", color: "var(--primary)" }}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                  {new Date(o.createdAt).toLocaleDateString("he-IL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
