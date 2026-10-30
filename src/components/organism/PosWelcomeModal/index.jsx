import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Package, CreditCard, PartyPopper } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ponytail: welcome modal untuk pengguna baru — tampil sekali per browser
// (flag localStorage "pos-welcome-seen"), dipicu Dashboard saat data kosong semua.
const STEPS = [
  {
    icon: ShoppingCart,
    titleKey: "guide.posWelcome.cart.title",
    titleDefault: "Keranjang Pesanan",
    descKey: "guide.posWelcome.cart.desc",
    descDefault:
      "Item yang Anda tambahkan akan muncul di sini. Anda bisa mengubah jumlah, menghapus, atau melanjutkan ke pembayaran."
  },
  {
    icon: Package,
    titleKey: "guide.posWelcome.products.title",
    titleDefault: "Daftar Produk",
    descKey: "guide.posWelcome.products.desc",
    descDefault:
      "Cari produk dengan mengetik nama atau SKU. Klik produk untuk menambahkannya ke keranjang."
  },
  {
    icon: CreditCard,
    titleKey: "guide.posWelcome.payment.title",
    titleDefault: "Pembayaran",
    descKey: "guide.posWelcome.payment.desc",
    descDefault:
      "Setelah selesai memilih produk, klik tombol pembayaran untuk melanjutkan ke proses bayar."
  }
];

const PosWelcomeModal = ({ open, onOpenChange }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center gap-1 pt-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
            <PartyPopper size={26} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {t("guide.posWelcome.title", {
              defaultValue: "🎉 Selamat Datang di juragankasir.com!"
            })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("guide.posWelcome.subtitle", { defaultValue: "Mari mulai transaksi pertama Anda" })}
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {STEPS.map(({ icon: Icon, titleKey, titleDefault, descKey, descDefault }) => (
            <div
              key={titleKey}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  {t(titleKey, { defaultValue: titleDefault })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {t(descKey, { defaultValue: descDefault })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={() => onOpenChange(false)}
          data-testid="pos-welcome-cta"
          className="mt-5 w-full rounded-xl h-11 text-sm font-semibold">
          {t("guide.posWelcome.cta", { defaultValue: "Mulai Gunakan" })}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

PosWelcomeModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired
};

export default PosWelcomeModal;
