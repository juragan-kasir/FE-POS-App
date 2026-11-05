import React from "react";

import cashier960 from "@/assets/landing/cashier-960.webp";
import cashier1800 from "@/assets/landing/cashier-1800.webp";
import dashboard960 from "@/assets/landing/dashboard-960.webp";
import dashboard1800 from "@/assets/landing/dashboard-1800.webp";
import products960 from "@/assets/landing/products-960.webp";
import products1800 from "@/assets/landing/products-1800.webp";
import { cn } from "@/lib/utils";

const SCREEN_WIDTH = 1800;
const SCREEN_HEIGHT = 1125;
const SMALL_WIDTH = 960;

const PRIORITY_IMAGE_ATTRIBUTES = { loading: "eager", fetchpriority: "high" };
const LAZY_IMAGE_ATTRIBUTES = { loading: "lazy" };

const SCREEN_SOURCES = {
  cashier: { small: cashier960, large: cashier1800 },
  products: { small: products960, large: products1800 },
  dashboard: { small: dashboard960, large: dashboard1800 }
};

const ProductScreen = ({ screen, alt, sizes, isPriority = false, className }) => {
  const { small, large } = SCREEN_SOURCES[screen];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-black/10 bg-white shadow-[0_30px_70px_-30px_rgba(6,30,21,0.55)]",
        className
      )}>
      <img
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
