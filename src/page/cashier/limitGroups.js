export const limitGroups = (groups, limit) => {
  const visible = [];
  let remaining = limit;
  for (const group of groups) {
    if (remaining <= 0) return { groups: visible, hasMore: true };
    const shown = group.products.slice(0, remaining);
    visible.push({ ...group, products: shown });
    remaining -= shown.length;
    if (shown.length < group.products.length) return { groups: visible, hasMore: true };
  }
  return { groups: visible, hasMore: false };
};
