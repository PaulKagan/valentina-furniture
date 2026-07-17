import createNextIntlPlugin from "next-intl/plugin";

/**
 * next-intl plugin wires up the i18n request config automatically.
 * The path passed to createNextIntlPlugin points to the getRequestConfig export.
 */
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl({
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Security headers (security-review) — clickjacking, MIME sniffing,
  // referrer leakage, and legacy-API lockdown
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
});
