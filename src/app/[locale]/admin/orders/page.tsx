import { db } from "@/db";
import { orders, orderStatusEnum } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import OrderFilters from "@/components/admin/OrderFilters";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import { ADMIN_PAGE_SIZE, visibleCount } from "@/lib/pagination";
import { Td } from "@/components/admin/Td";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; show?: string }>;
}) {
  const { locale } = await params;
  const { q, status, show } = await searchParams;
  const t = await getTranslations({ locale, namespace: "admin.orders" });

  let allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  // Search across name, phone, and order number
  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    allOrders = allOrders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(needle) ||
        o.customerPhone.includes(needle) ||
        String(o.id) === needle.replace("#", "")
    );
  }
  if (status && (orderStatusEnum.enumValues as readonly string[]).includes(status)) {
    allOrders = allOrders.filter((o) => o.status === status);
  }

  // Paginate — hundreds of orders shouldn't render at once
  const shown = visibleCount(show, allOrders.length, ADMIN_PAGE_SIZE);
  const visible = allOrders.slice(0, shown);

  const statusLabels = {
    pending: t("statusValues.pending"),
    confirmed: t("statusValues.confirmed"),
    cancelled: t("statusValues.cancelled"),
    delivered: t("statusValues.delivered"),
  };

  const dateLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "he-IL";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>

      <Suspense fallback={null}>
        <OrderFilters />
      </Suspense>

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {["#", t("customer"), t("phone"), t("address"), t("total"), t("items"), t("status"), t("date"), ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center" style={{ color: "var(--muted)" }}>
                  {t("noOrders")}
                </td>
              </tr>
            )}
            {visible.map((o) => {
              const items = JSON.parse(o.items) as Array<{ name: string; quantity: number }>;
              return (
                <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <Td muted>#{o.id}</Td>
                  <Td className="font-medium">{o.customerName}</Td>
                  <Td muted dir="ltr">{o.customerPhone}</Td>
                  <Td muted style={{ maxWidth: "150px" }}>
                    <span className="truncate block">{o.customerAddress}</span>
                  </Td>
                  <Td>₪{parseFloat(o.total).toLocaleString("he-IL")}</Td>
                  <Td muted style={{ maxWidth: "180px" }}>
                    <span className="truncate block">{items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</span>
                  </Td>
                  <Td>
                    <OrderStatusSelect orderId={o.id} currentStatus={o.status} labels={statusLabels} />
                  </Td>
                  <Td muted>
                    {new Date(o.createdAt).toLocaleDateString(dateLocale)}
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      {t("open")}
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shown < allOrders.length && (
        <p className="mt-4 text-sm text-center" style={{ color: "var(--muted)" }}>
          <Link
            href={`/admin/orders?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(status ? { status } : {}),
              show: String(shown + ADMIN_PAGE_SIZE),
            })}`}
            className="underline"
            style={{ color: "var(--primary)" }}
          >
            {t("loadMore", { shown, total: allOrders.length })}
          </Link>
        </p>
      )}
    </div>
  );
}
