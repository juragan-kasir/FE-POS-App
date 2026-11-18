import React from "react";

import Picture from "@/components/ui/Picture";
import cashier960 from "@/assets/landing/cashier-960.webp";
import cashier1800 from "@/assets/landing/cashier-1800.webp";
import cashier960Avif from "@/assets/landing/cashier-960.avif";
import cashier1800Avif from "@/assets/landing/cashier-1800.avif";
import dashboard960 from "@/assets/landing/dashboard-960.webp";
import dashboard1800 from "@/assets/landing/dashboard-1800.webp";
import dashboard960Avif from "@/assets/landing/dashboard-960.avif";
import dashboard1800Avif from "@/assets/landing/dashboard-1800.avif";
import products960 from "@/assets/landing/products-960.webp";
import products1800 from "@/assets/landing/products-1800.webp";
import products960Avif from "@/assets/landing/products-960.avif";
import products1800Avif from "@/assets/landing/products-1800.avif";
import { cn } from "@/lib/utils";

const SCREEN_WIDTH = 1800;
const SCREEN_HEIGHT = 1125;
const SMALL_WIDTH = 960;

const PRIORITY_IMAGE_ATTRIBUTES = { loading: "eager", fetchpriority: "high" };
const LAZY_IMAGE_ATTRIBUTES = { loading: "lazy" };

const SCREEN_SOURCES = {
  cashier: {
    small: cashier960,
    large: cashier1800,
    smallAvif: cashier960Avif,
    largeAvif: cashier1800Avif
  },
  products: {
    small: products960,
    large: products1800,
    smallAvif: products960Avif,
    largeAvif: products1800Avif
  },
  dashboard: {
    small: dashboard960,
    large: dashboard1800,
    smallAvif: dashboard960Avif,
    largeAvif: dashboard1800Avif
  }
};

const ProductScreen = ({ screen, alt, sizes, isPriority = false, className }) => {
  const { small, large, smallAvif, largeAvif } = SCREEN_SOURCES[screen];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-black/10 bg-white shadow-[0_30px_70px_-30px_rgba(6,30,21,0.55)]",
        className
      )}>
      <Picture
        avifSrcSet={`${smallAvif} ${SMALL_WIDTH}w, ${largeAvif} ${SCREEN_WIDTH}w`}
        src={large}
        srcSet={`${small} ${SMALL_WIDTH}w, ${large} ${SCREEN_WIDTH}w`}
        sizes={sizes}
        alt={alt}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        {...(isPriority ? PRIORITY_IMAGE_ATTRIBUTES : LAZY_IMAGE_ATTRIBUTES)}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
};

export default ProductScreen;
