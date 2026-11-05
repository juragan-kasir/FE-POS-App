export const formatCurrencyRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR"
  }).format(number);
};

export const formatRupiahPlain = (number) => new Intl.NumberFormat("id-ID").format(number);
