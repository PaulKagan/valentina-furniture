import Link from "next/link";

export default function OrderConfirmedPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        ההזמנה התקבלה!
      </h1>
      <p className="text-lg leading-relaxed mb-2" style={{ color: "var(--muted)" }}>
        תודה רבה על הזמנתכם.
      </p>
      <p className="leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
        ההזמנה עדיין לא מאושרת סופית — נציג מהחנות יחזור אליכם בהקדם לאישור הפרטים ותיאום משלוח.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-3 rounded-lg font-semibold text-sm"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          חזרה לדף הבית
        </Link>
        <a
          href="https://wa.me/972501234567"
          className="px-6 py-3 rounded-lg font-semibold text-sm border-2"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          שאלות? בוואטסאפ
        </a>
      </div>
    </div>
  );
}
