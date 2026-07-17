/**
 * JSON-LD structured data helpers.
 *
 * Why JSON-LD matters: Google uses structured data to show rich results —
 * product prices in search, star ratings, business hours on Maps.
 * For a local furniture store this means the business can appear in
 * "furniture stores near me" results with hours + phone pre-filled.
 *
 * We export plain objects (not JSX) so they can be embedded in
 * <script type="application/ld+json"> tags from any server component.
 */

import { imageUrl } from "./images";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const PHONE = process.env.NEXT_PUBLIC_PHONE ?? "+972501234567";
const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS ?? "רחוב הרצל 1, תל אביב";

/** LocalBusiness schema — helps Google Maps + "near me" searches */
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: "ולנטינה בן עמי ריהוט",
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS,
      addressLocality: "תל אביב",
      addressCountry: "IL",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "09:00",
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Friday",
        opens: "09:00",
        closes: "14:00",
      },
    ],
  };
}

/** Product schema — lets Google show price + availability in search results */
export function productJsonLd(product: {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  inStock: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: imageUrl(product.imageUrl, "detail") ?? undefined,
    url: `${SITE_URL}/products/${product.id}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "ולנטינה בן עמי ריהוט" },
    },
  };
}
