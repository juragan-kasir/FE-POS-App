import React from "react";

import logoMark from "@/assets/logo-sidebar.png";

const BrandMark = () => (
  <span className="inline-flex items-center gap-2.5">
    <img
      src={logoMark}
      alt=""
      width={40}
      height={40}
      className="size-10 rounded-full bg-jk-paper p-0.5"
    />
    <span className="font-jk-display text-[21px] font-semibold tracking-[-0.02em] text-jk-paper">
      Juragan Kasir
    </span>
  </span>
);

export default BrandMark;
