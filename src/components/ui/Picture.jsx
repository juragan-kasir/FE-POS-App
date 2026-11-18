import React from "react";

/**
 * <picture> dengan sumber AVIF + fallback (WebP/PNG) untuk browser lama,
 * mis. iPad kasir iOS < 16 yang belum bisa AVIF. Semua prop lain (alt,
 * width, height, className, loading, …) diteruskan ke <img> fallback.
 */
const Picture = ({ avif, avifSrcSet, sizes, src, ...imgProps }) => (
  <picture>
    <source type="image/avif" srcSet={avifSrcSet || avif} sizes={sizes} />
    <img src={src} sizes={sizes} {...imgProps} />
  </picture>
);

export default Picture;
