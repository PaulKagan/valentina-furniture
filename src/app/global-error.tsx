"use client";

/**
 * Root-layout error boundary — the ultimate fallback, only reached if the
 * root layout itself throws (a font load failure, a broken provider, etc).
 * It replaces <html>/<body> entirely, so it can't rely on next-intl's
 * provider, fonts, or globals.css necessarily having loaded — hence plain
 * inline styles and a hardcoded bilingual message instead of translation
 * keys. This should basically never fire; [locale]/error.tsx catches
 * everything else.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          backgroundColor: "#f7f7f7",
          color: "#2b2320",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: 32,
            borderRadius: 16,
            backgroundColor: "#ffffff",
            border: "1px solid #e5e0dc",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>😕</p>
          <p style={{ fontWeight: "bold", fontSize: 18, margin: "0 0 8px" }}>
            משהו השתבש · Something went wrong
          </p>
          <p style={{ fontSize: 14, color: "#6b615c", margin: "0 0 20px" }}>
            נסו לרענן את הדף. אם הבעיה נמשכת, צרו קשר בוואטסאפ.
            <br />
            Please refresh the page. If this keeps happening, contact us on WhatsApp.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#a1503a",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            נסו שוב · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
