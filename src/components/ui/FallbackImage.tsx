"use client";

/**
 * Image with an automatic fallback on load failure.
 *
 * The site's own "missing photo" placeholder only ever covers a product
 * with no imageUrl at all. It does nothing if a URL exists but the file
 * behind it stops resolving — a suspended/misconfigured Cloudinary account,
 * a manually deleted asset, a bad manual DB edit. Without this, that
 * scenario breaks every product image on the site simultaneously with a
 * broken-image icon and no way to soften it.
 *
 * Drop-in replacement for next/image wherever the src comes from
 * Cloudinary; falls back to the shared placeholder on any load error.
 */
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const DEFAULT_FALLBACK = "/placeholder-product.svg";

export default function FallbackImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  ...props
}: ImageProps & { fallbackSrc?: string }) {
  const [failed, setFailed] = useState(false);
  // A prop change (e.g. she uploads a new photo in the same open form)
  // deserves a fresh attempt, not the previous failure sticking around.
  // Resetting during render (React's documented pattern for this, rather
  // than an effect) avoids the extra render pass an effect-driven reset
  // would cause.
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setFailed(false);
  }

  return (
    <Image
      {...props}
      src={failed || !src ? fallbackSrc : src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
