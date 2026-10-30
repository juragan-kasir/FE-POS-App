import React, { useState } from "react";
import i18next from "i18next";
import {
  Bell,
  Check,
  Eye,
  Hand,
  History,
  LayoutGrid,
  MonitorSmartphone,
  Package,
  QrCode,
  Receipt,
  Rows,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Star,
  Sun,
  Utensils,
  UtensilsCrossed,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DynamicIcon from "@/components/ui/DynamicIcon";

const DISPLAY_FONT = '"Poppins", "Inter", system-ui, sans-serif';
const QR_PRIMARY = "#ff6b00";

const IconMedia = ({ icon, image, color, className, imgClassName }) => {
  if (image) {
    return <img src={image} alt="" className={`object-cover ${imgClassName || className || ""}`} />;
  }
  return (
    <DynamicIcon
      name={icon || "category"}
      className={className}
      style={color ? { color } : undefined}
    />
  );
};

const QrMenuCard = ({ index, categoryName, color, outOfStock, price }) => (
  <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-50 dark:border-gray-700/50 shadow-sm">
    <div
      className="h-40 flex items-center justify-center"
      style={{ backgroundColor: `${color}1a` }}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
        style={{ backgroundColor: color }}>
        <UtensilsCrossed size={24} />
      </div>
    </div>
    <div className="p-4 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3
          className="text-[15px] text-gray-900 dark:text-gray-100 truncate"
          style={{ fontFamily: DISPLAY_FONT }}>
          Produk {index}
        </h3>
        {outOfStock && (
          <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
            Habis
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{categoryName}</p>
      <div className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
        <Star size={12} className="fill-amber-400 text-amber-400" />
        <span>0 (0)</span>
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">{price}</p>
        {outOfStock && <p className="text-xs font-semibold text-red-500">Stok habis</p>}
      </div>
    </div>
  </div>
);

const CategoryPreviewModal = ({ open, onOpenChange, category }) => {
  const [view, setView] = useState("cashier");

  if (!open) return null;

  const name = category?.name?.trim() || "Nama Kategori";
  const color = category?.color || "#0f172a";
  const icon = category?.icon || "";
  const image = category?.image || null;
  const isActive = category?.isActive !== false;
  const storeName = category?.storeName || "Nama Toko";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Preview Kategori</h3>
              <p className="text-xs text-muted-foreground">
                Lihat tampilan kategori ini di berbagai perangkat
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setView("cashier")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                view === "cashier"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-accent/40"
              }`}>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  view === "cashier"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                <MonitorSmartphone size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Cashier</p>
                <p className="text-[11px] text-muted-foreground truncate">Halaman /home</p>
              </div>
              {view === "cashier" && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Check size={14} /> Dipilih
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setView("qr")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                view === "qr"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-accent/40"
              }`}>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  view === "qr"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                <QrCode size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">QR-ORDER-APP</p>
                <p className="text-[11px] text-muted-foreground truncate">BISA-MAKAN-APP</p>
              </div>
              {view === "qr" && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Check size={14} /> Dipilih
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
          {view === "cashier" ? (
            <div className="max-w-2xl mx-auto rounded-xl border border-border bg-background overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 flex items-center justify-center">
                    <Package className="text-primary-foreground" size={18} />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold leading-tight text-foreground">{storeName}</h1>
                    <p className="text-[10px] text-muted-foreground/80">Kasir — Demo</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Sun size={15} className="hidden dark:block" />
                  <Bell size={15} />
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-[9px] font-bold text-primary-foreground ml-1.5">
                    K
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/40 bg-muted/30 overflow-hidden">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1.5">
                  Antrian
                </span>
                <span className="shrink-0 text-[10px] font-medium bg-primary text-primary-foreground rounded-md px-2 py-0.5">
                  #1024
                </span>
                <span className="shrink-0 text-[10px] font-medium bg-card border border-border/60 text-muted-foreground rounded-md px-2 py-0.5">
                  #1025
                </span>
                <span className="shrink-0 text-[10px] font-medium bg-card border border-border/60 text-muted-foreground rounded-md px-2 py-0.5">
                  #1026
                </span>
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
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/40">
                  <span className="p-1 rounded-md bg-background shadow-sm text-foreground">
                    <LayoutGrid size={14} />
                  </span>
                  <span className="p-1 rounded-md text-muted-foreground">
                    <Rows size={14} />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
                <span className="shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border bg-card border-border/60 text-muted-foreground">
                  Semua
                </span>
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border text-white shadow-sm"
                  style={{ backgroundColor: color, borderColor: color }}>
                  <IconMedia
                    icon={icon}
                    image={image}
                    className="!text-sm"
                    imgClassName="w-3.5 h-3.5 rounded"
                  />
                  {name}
                </span>
                <span className="shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border bg-card border-border/60 text-muted-foreground">
                  Kategori Lain
                </span>
                <span className="shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border bg-card border-border/60 text-muted-foreground">
                  Kategori Lainnya
                </span>
              </div>

              <div className="px-4 py-2.5 border-y border-border/40 flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}1a`, color }}>
                  <IconMedia
                    icon={icon}
                    image={image}
                    className="!text-base"
                    imgClassName="w-7 h-7 rounded-lg"
                  />
                </div>
                <h3 className="text-sm font-semibold text-foreground truncate">{name}</h3>
                {!isActive && (
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Nonaktif
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`bg-card/80 backdrop-blur-sm border rounded-xl p-2.5 ${
                      i % 3 === 2 ? "border-destructive/50 opacity-70" : "border-border/40"
                    }`}>
                    <div
                      className="w-full aspect-square rounded-lg border border-border/30 flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${color}14` }}>
                      <UtensilsCrossed size={24} className="text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-foreground leading-tight truncate">
                        Produk {i + 1}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-primary">Rp {10000 + i * 5000}</p>
                        {i % 3 === 2 && (
                          <span className="text-[8px] text-destructive font-semibold uppercase">
                            Habis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-[360px] rounded-[2.75rem] border-[6px] border-slate-900 dark:border-slate-700 shadow-2xl overflow-hidden">
                <div className="relative bg-[#fff5ed] dark:bg-[#111827]">
                  <div className="space-y-5 px-4 pt-2.5 pb-4 min-h-[600px] max-h-[640px] overflow-y-auto">
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
                      <h1
                        className="text-[24px] leading-tight text-gray-900 dark:text-gray-100"
                        style={{ fontFamily: DISPLAY_FONT }}>
                        Halo, mau makan apa hari ini?
                      </h1>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400">
                        Pilih menu favoritmu dan mulai pesan!
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                          style={{ backgroundColor: `${QR_PRIMARY}1a`, color: QR_PRIMARY }}>
                          Meja 211
                        </span>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full text-[11px] font-bold">
                          {storeName}
                        </span>
                        {!isActive && (
                          <span className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full text-[11px] font-bold">
                            Nonaktif
                          </span>
                        )}
                      </div>
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
                        style={{ backgroundColor: color }}>
                        <IconMedia
                          icon={icon}
                          image={image}
                          className="!text-sm"
                          imgClassName="w-4 h-4 rounded"
                        />
                        <span className="ml-1">{name}</span>
                      </span>
                      <span className="shrink-0 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap shadow-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                        🍽️ Makanan Berat
                      </span>
                      <span className="shrink-0 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap shadow-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                        🍹 Minuman Dingin
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <QrMenuCard
                        index={1}
                        categoryName={name}
                        color={color}
                        outOfStock
                        price="Rp15,000"
                      />
                      <QrMenuCard index={2} categoryName={name} color={color} price="Rp10,000" />
                      <QrMenuCard index={3} categoryName={name} color={color} price="Rp15,000" />
                      <QrMenuCard
                        index={4}
                        categoryName={name}
                        color={color}
                        outOfStock
                        price="Rp20,000"
                      />
                    </div>
                  </div>
                </div>

                <div className="relative bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-around py-2.5 px-2">
                  <div className="flex flex-col items-center gap-0.5" style={{ color: QR_PRIMARY }}>
                    <Utensils size={17} />
                    <span className="text-[9px] font-bold">Menu</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400">
                    <Receipt size={17} />
                    <span className="text-[9px] font-medium">Pesanan</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400">
                    <ShoppingBasket size={17} />
                    <span className="text-[9px] font-medium">Keranjang</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400">
                    <Hand size={17} />
                    <span className="text-[9px] font-medium">Pelayan</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400">
                    <History size={17} />
                    <span className="text-[9px] font-medium">Riwayat</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShoppingCart size={14} />
            Preview menampilkan bentuk kategori ini pada halaman asli masing-masing aplikasi
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategoryPreviewModal;
