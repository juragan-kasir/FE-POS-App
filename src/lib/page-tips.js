// The tips list for a route: its own path or a sub-path of it
// ("/detail-product/19"). A bare prefix also matched unrelated routes
// ("/expense-list" — a 404 — got the expense tips, "/add-production-order"
// the product tips).
export const matchRouteTips = (tipsKeys, pathname) =>
  Object.entries(tipsKeys).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`)
  )?.[1];
