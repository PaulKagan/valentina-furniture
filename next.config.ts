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
});
