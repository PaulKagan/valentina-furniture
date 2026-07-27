import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq, count, sum, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Td } from "@/components/admin/Td";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.dashboard" });
  const tStatus = await getTranslations({ locale, namespace: "admin.orders.statusValues" });

  const [totalOrders] = await db.select({ count: count() }).from(orders);
  const [pendingOrders] = await db.select({ count: count() }).from(orders).where(eq(orders.status, "pending"));
  const [totalProducts] = await db.select({ count: count() }).from(products);
  const [revenue] = await db.select({ sum: sum(orders.total) }).from(orders).where(eq(orders.status, "confirmed"));

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: t("totalOrders"), value: totalOrders.count },
          { label: t("pendingOrders"), value: pendingOrders.count },
          { label: t("totalProducts"), value: totalProducts.count },
          { label: t("totalRevenue"), value: parseFloat(revenue.sum ?? "0").toLocaleString("he-IL") },
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
            {t("recentOrders")}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {["#", t("customer"), t("phone"), t("total"), t("status"), t("date")].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center" style={{ color: "var(--muted)" }}>
                  {t("noOrders")}
                </td>
              </tr>
            )}
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <Td muted>#{o.id}</Td>
                <Td className="font-medium">{o.customerName}</Td>
                <Td muted dir="ltr">{o.customerPhone}</Td>
                <Td>₪{parseFloat(o.total).toLocaleString("he-IL")}</Td>
                <Td>
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "oklch(0.974 0.004 32)", color: "var(--primary)" }}>
                    {tStatus(o.status)}
                  </span>
                </Td>
                <Td muted>
                  {new Date(o.createdAt).toLocaleDateString(locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-GB")}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
