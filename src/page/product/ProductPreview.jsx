import React, { useState } from "react";
import i18next from "i18next";
import PropTypes from "prop-types";
import {
  Bell,
  Check,
  ChevronLeft,
  Clock,
  Eye,
  MonitorSmartphone,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  Smartphone,
  Star,
  Tag,
  Utensils,
  UtensilsCrossed,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { optimizeImage } from "@/utils/image";
import DynamicIcon from "@/components/ui/DynamicIcon";

const QR_PRIMARY = "#ff6b00";
const QR_BG = "#fff5ed";
const DISPLAY_FONT = '"Poppins", "Inter", system-ui, sans-serif';

const formatPrice = (value) => {
  const num = Number(value || 0);
  if (isNaN(num)) return "0";
  return num.toLocaleString("id-ID");
};

const ProductImage = ({ image, name, className }) => {
  if (image) {
    return (
      <img
        src={optimizeImage(image) || image}
        alt={name || ""}
        className={`${className} object-cover`}
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={`${className} bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center`}>
      <Package size={28} className="text-muted-foreground/30" />
    </div>
  );
};

const CashierView = ({ p, storeName }) => {
  const hasChoices = p.isOption || p.hasModifiers;
  const outOfStock = Number(p.stock) <= 0 && p.isAvailable !== false;

  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-border bg-background overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 flex items-center justify-center">
            <Package className="text-primary-foreground" size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold leading-tight text-foreground">
              {storeName || "Nama Toko"}
            </h4>
            <p className="text-[10px] text-muted-foreground/80">Kasir — Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Bell size={15} />
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-[9px] font-bold text-primary-foreground ml-1.5">
            K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <div className="w-full h-9 pl-9 pr-4 text-xs rounded-xl bg-accent/50 border border-border/60 flex items-center text-muted-foreground/70">
            Cari produk...
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
        <span className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 bg-card text-muted-foreground">
          Semua
        </span>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-primary text-primary-foreground border-primary shadow-sm">
          <DynamicIcon name={p.categoryIcon || "category"} size={14} />
          <span className="truncate">{p.category || "Kategori"}</span>
        </span>
      </div>

      <div className="px-4 py-2.5 border-y border-border/40 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <DynamicIcon name={p.categoryIcon || "category"} size={16} />
        </div>
        <h4 className="text-sm font-semibold text-foreground truncate">
          {p.category || "Kategori"}
        </h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4">
        <button
          type="button"
          disabled={outOfStock}
          className="group bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl p-3 text-left active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
          <div className="relative mb-2.5">
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted/50">
              <ProductImage
                image={p.image}
                name={p.name}
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {outOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-bold text-white bg-destructive/90 px-2 py-1 rounded-md uppercase tracking-wider">
                  Habis
                </span>
              </div>
            )}
            <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
              {hasChoices && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-sm shadow-sm">
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-0.5">
                    <Tag size={8} />
                    {p.isOption ? "Varian" : "Modifier"}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground leading-tight line-clamp-2 min-h-[2em]">
              {p.name || "Nama Produk"}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-primary">Rp {formatPrice(p.price)}</p>
              {Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock) && (
                <span className="text-[9px] text-amber-500 font-semibold">
                  Stok {formatPrice(p.stock)}
                </span>
              )}
            </div>
          </div>
        </button>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-card/60 border border-dashed border-border/30 rounded-xl p-3 opacity-40 select-none">
            <div className="w-full aspect-square rounded-lg bg-muted/40 mb-2.5" />
            <div className="h-3 w-3/4 bg-muted/60 rounded mb-1" />
            <div className="h-4 w-1/2 bg-muted/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

const QrMenuView = ({ p }) => {
  const promo = p.isPromo;
  const lowStock = Number(p.stock) > 0 && Number(p.stock) <= 5;
  const habis = Number(p.stock) <= 0;

  return (
    <div className="flex justify-center">
      <div className="w-[340px] rounded-[2.75rem] border-[6px] border-slate-900 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="relative" style={{ backgroundColor: QR_BG }}>
          <div className="space-y-5 px-4 pt-2.5 pb-4 min-h-[540px] max-h-[580px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: QR_PRIMARY }}>
                  <Utensils size={16} />
                </div>
                <p
                  className="text-[15px] text-gray-900 dark:text-gray-100"
                  style={{ fontFamily: DISPLAY_FONT }}>
                  Bisa Makan
                </p>
              </div>
              <Bell size={17} className="text-gray-500 dark:text-gray-400" />
            </div>

            <header className="space-y-2">
              <h3
                className="text-[24px] leading-tight text-gray-900 dark:text-gray-100"
                style={{ fontFamily: DISPLAY_FONT }}>
                Halo, mau makan apa hari ini?
              </h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                Pilih menu favoritmu dan mulai pesan!
              </p>
            </header>

            <div className="h-12 w-full rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center gap-2 px-4">
              <Search size={18} className="text-gray-400 shrink-0" />
              <span className="text-[13px] text-gray-400">Cari menu...</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="shrink-0 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap shadow-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                Semua
              </span>
              <span
                className="shrink-0 inline-flex items-center px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap shadow-sm text-white"
                style={{ backgroundColor: QR_PRIMARY }}>
                <UtensilsCrossed size={14} />
                <span className="ml-1">{p.category || "Kategori"}</span>
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden border border-gray-50 dark:border-gray-700/50">
                <div className="relative">
                  <div className="w-full h-44 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <ProductImage image={p.image} name={p.name} className="w-full h-full" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  {promo && (
                    <span className="absolute top-3 left-3 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Promo
                    </span>
                  )}
                  {lowStock && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Sisa {formatPrice(p.stock)}
                    </span>
                  )}
                  {habis && (
                    <span className="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Habis
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2.5">
                  <h4 className="font-bold text-base line-clamp-1 text-gray-900 dark:text-gray-100">
                    {p.name || "Nama Produk"}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {p.description || "Deskripsi produk akan tampil di sini."}
                  </p>
                  <div className="flex items-center gap-1.5 text-accent text-xs font-bold">
                    <Star size={12} fill="currentColor" />
                    <span>0</span>
                    <span className="text-gray-400 dark:text-gray-500 font-normal">(0)</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-primary text-lg">Rp{formatPrice(p.price)}</span>
                    {habis ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium px-3 py-2">
                        Stok habis
                      </span>
                    ) : (
                      <span
                        className="text-white p-2.5 rounded-full"
                        style={{ backgroundColor: QR_PRIMARY }}>
                        <Plus size={18} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-around py-2.5 px-2">
          <div className="flex flex-col items-center gap-0.5" style={{ color: QR_PRIMARY }}>
            <Utensils size={17} />
            <span className="text-[9px] font-bold">Menu</span>
          </div>
          {["Pesanan", "Keranjang", "Pelayan", "Riwayat"].map((label) => (
            <div
              key={label}
              className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400">
              <ReceiptText size={18} />
              <span className="text-[9px] font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QrDetailView = ({ p }) => {
  const sizes = [];
  p.variantGroups?.forEach((g) => g.options?.forEach((o) => o.name && sizes.push(o.name)));
  const uniqueSizes = [...new Set(sizes)];
  const addOns = p.modifierItems || [];
  const promo = p.isPromo;
  const habis = Number(p.stock) <= 0;

  return (
    <div className="flex justify-center">
      <div className="w-[340px] rounded-[2.75rem] border-[6px] border-slate-900 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="relative" style={{ backgroundColor: QR_BG }}>
          <div className="px-4 pt-3 pb-4 min-h-[580px] max-h-[620px] overflow-y-auto">
            <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 w-fit">
              <ChevronLeft size={18} className="text-gray-700 dark:text-gray-300" />
            </div>

            <div className="relative mb-4">
              <div className="w-full h-52 rounded-3xl bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <ProductImage image={p.image} name={p.name} className="w-full h-full" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl" />
              {promo && (
                <span className="absolute top-3 left-3 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Promo
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h4
                  className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                  style={{ fontFamily: DISPLAY_FONT }}>
                  {p.name || "Nama Produk"}
                </h4>
                <div className="flex items-center gap-1.5 text-accent text-xs font-bold bg-accent/10 px-3 py-1.5 rounded-full shrink-0">
                  <Star size={13} fill="currentColor" />
                  0.0
                </div>
              </div>

              <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                {p.description || "Deskripsi produk akan tampil di halaman detail."}
              </p>

              <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                  <Clock size={13} />
                  Estimasi {p.estimatedTime || 15} menit
                </span>
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                    habis
                      ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                      : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  }`}>
                  {habis ? "❌ Habis" : `✅ Stok: ${formatPrice(p.stock)}`}
                </span>
              </div>

              {p.ingredients.length > 0 && (
                <div>
                  <h5 className="font-bold text-[13px] mb-2 text-gray-900 dark:text-gray-100">
                    Bahan-bahan
                  </h5>
                  <div className="flex gap-2 flex-wrap">
                    {p.ingredients.slice(0, 8).map((ing) => (
                      <span
                        key={ing}
                        className="bg-white dark:bg-gray-700 px-3 py-1.5 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-600">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 space-y-4 border border-gray-50 dark:border-gray-700/50 shadow-sm">
                {uniqueSizes.length > 0 && (
                  <div>
                    <h5 className="font-bold text-[13px] mb-2.5 text-gray-900 dark:text-gray-100">
                      Pilih Ukuran
                    </h5>
                    <div className="flex gap-2 flex-wrap">
                      {uniqueSizes.map((size) => (
                        <span
                          key={size}
                          className="px-4 py-2 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {addOns.length > 0 && (
                  <div>
                    <h5 className="font-bold text-[13px] mb-2.5 text-gray-900 dark:text-gray-100">
                      Extra Topping
                    </h5>
                    <div className="flex gap-2 flex-wrap">
                      {addOns.slice(0, 6).map((addOn) => (
                        <span
                          key={addOn.id}
                          className="px-4 py-2 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600">
                          {addOn.name}
                          <span className="ml-1 opacity-70">+Rp{formatPrice(addOn.price)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h5 className="font-bold text-[13px] mb-2.5 text-gray-900 dark:text-gray-100">
                    Catatan Khusus
                  </h5>
                  <div className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs min-h-[72px]">
                    Contoh: tanpa bawang, es sedikit, dll.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 space-y-3 border border-gray-50 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                    Harga
                  </span>
                  <span className="font-bold text-xl text-primary">Rp{formatPrice(p.price)}</span>
                </div>
                <span
                  className="block w-full text-white py-3 rounded-2xl text-center font-bold text-sm"
                  style={{ backgroundColor: QR_PRIMARY }}>
                  {habis ? "Stok Habis" : "Tambah ke Keranjang"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductPreview = ({ product, open, onOpenChange }) => {
  const [tab, setTab] = useState("cashier");
  if (!open) return null;

  const p = product || {};
  const storeName = p.storeName || "Nama Toko";

  const tabs = [
    {
      id: "cashier",
      label: "Cashier",
      desc: "Daftar produk kasir",
      icon: <MonitorSmartphone size={20} />
    },
    {
      id: "menu",
      label: "BISA-MAKAN-APP",
      desc: "Kartu menu",
      icon: <QrCode size={20} />
    },
    {
      id: "detail",
      label: "BISA-MAKAN-APP",
      desc: "Detail produk",
      icon: <Smartphone size={20} />
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Preview Produk</h3>
              <p className="text-xs text-muted-foreground">
                Lihat tampilan produk ini di berbagai aplikasi
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={i18next.t("common.close")}
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  tab === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80 hover:bg-accent/40"
                }`}>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.desc}</p>
                </div>
                {tab === t.id && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Check size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/20 dark:bg-muted/10">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Eye size={14} />
            Product:{" "}
            <span className="font-semibold text-foreground truncate max-w-[320px]">
              {p.name || "Belum diisi"}
            </span>
          </div>
          {tab === "cashier" && <CashierView p={p} storeName={storeName} />}
          {tab === "menu" && <QrMenuView p={p} />}
          {tab === "detail" && <QrDetailView p={p} />}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MonitorSmartphone size={14} />
            Preview menampilkan data sesuai isian form current
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

ProductPreview.propTypes = {
  product: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    image: PropTypes.string,
    category: PropTypes.string,
    categoryIcon: PropTypes.string,
    storeName: PropTypes.string,
    stock: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    minStock: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    estimatedTime: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isPromo: PropTypes.bool,
    isOption: PropTypes.bool,
    hasModifiers: PropTypes.bool,
    isAvailable: PropTypes.bool,
    ingredients: PropTypes.arrayOf(PropTypes.string),
    variantGroups: PropTypes.array,
    modifierItems: PropTypes.array
  }),
  open: PropTypes.bool,
  onOpenChange: PropTypes.func
};

export default ProductPreview;
