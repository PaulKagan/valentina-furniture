import { getTranslations } from "next-intl/server";
import BackupPanel from "@/components/admin/BackupPanel";

export default async function AdminBackupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.backup" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>
      <BackupPanel />
    </div>
  );
}
