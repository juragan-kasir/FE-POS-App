export const usePromoTypeFlags = (form) => {
  const type = form.watch("type");
  const discountType = form.watch("discountType");
  return {
    isHappyHour: type === "happy_hour",
    isSpendGet: type === "spend_get",
    isBuyXGetY: type === "buy_x_get_y",
    isBirthday: type === "birthday",
    isManual: type === "manual",
    isFreeItem: discountType === "free_item",
    isPercentage: discountType === "percentage"
  };
};
