import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LifeBuoy,
  Mail,
  Phone,
  MessageCircle,
  ChevronDown,
  BookOpen,
  FileText,
  Video,
  ExternalLink,
  Package,
  KeyRound,
  Globe,
  Moon,
  UserPlus,
  AlertTriangle
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { FAQ_CHAT_OPEN } from "@/components/organism/FaqChat";
import { Button } from "@/components/ui/button";

const faqItems = [
  {
    id: "how-to-add-product",
    Icon: Package,
    en: {
      q: "How do I add a new product?",
      a: "Go to the Product List page, click the + Tambah button in the top right. Fill in SKU, name, category, price, stock, and image. Click Save."
    },
    idText: {
      q: "Bagaimana cara menambah produk baru?",
      a: "Buka halaman Daftar Produk, klik tombol + Tambah di kanan atas. Isi SKU, nama, kategori, harga, stok, dan gambar. Klik Simpan."
    }
  },
  {
    id: "reset-password",
    Icon: KeyRound,
    en: {
      q: "I forgot my password. How do I reset it?",
      a: "On the login page, click 'Forgot Password'. Enter your registered email — we will send a reset link valid for 1 hour."
    },
    idText: {
      q: "Saya lupa password. Bagaimana cara reset?",
      a: "Di halaman login, klik 'Lupa Password'. Masukkan email terdaftar — kami akan mengirim link reset yang berlaku 1 jam."
    }
  },
  {
    id: "change-language",
    Icon: Globe,
    en: {
      q: "How do I switch the interface language?",
      a: "Click the language icon (globe) in the top right header. Choose between Indonesian and English. Your choice is saved for this session."
    },
    idText: {
      q: "Bagaimana cara ganti bahasa tampilan?",
      a: "Klik ikon bahasa (globe) di kanan atas header. Pilih antara Bahasa Indonesia dan English. Pilihan kamu disimpan untuk sesi ini."
    }
  },
  {
    id: "dark-mode",
    Icon: Moon,
    en: {
      q: "Does the app support dark mode?",
      a: "Yes. Click the sun/moon icon in the header to toggle between light and dark themes. The change is applied instantly."
    },
    idText: {
      q: "Apakah aplikasi mendukung mode gelap?",
      a: "Ya. Klik ikon matahari/bulan di header untuk ganti antara tema terang dan gelap. Perubahan langsung diterapkan."
    }
  },
  {
    id: "invite-employee",
    Icon: UserPlus,
    en: {
      q: "How do I invite employees to use the system?",
      a: "Go to the Employees page, click + Tambah. Fill in name, email, password, role, and assign a store location. The employee can then log in with those credentials."
    },
    idText: {
      q: "Bagaimana cara invite karyawan menggunakan sistem?",
      a: "Buka halaman Karyawan, klik + Tambah. Isi nama, email, password, role, dan tugaskan ke lokasi toko. Karyawan bisa login dengan kredensial tersebut."
    }
  },
  {
    id: "low-stock",
    Icon: AlertTriangle,
    en: {
      q: "How am I notified about low stock?",
      a: "Low stock items appear red on the dashboard's 'Active Products' card and in the Product List table. The notification bell also shows alerts for items below the minimum threshold."
    },
    idText: {
      q: "Bagaimana saya diberi tahu soal stok menipis?",
      a: "Item dengan stok rendah ditampilkan merah di kartu 'Active Products' dashboard dan di tabel Daftar Produk. Lonceng notifikasi juga menampilkan alert untuk item di bawah ambang batas minimum."
    }
  }
];

const resources = [
  {
    icon: BookOpen,
    en: "User Guide",
    id: "Panduan Pengguna",
    href: "https://docs.example.com/user-guide",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
  },
  {
    icon: Video,
    en: "Video Tutorials",
    id: "Video Tutorial",
    href: "https://docs.example.com/videos",
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30"
  },
  {
    icon: FileText,
    en: "Release Notes",
    id: "Catatan Rilis",
    href: "https://docs.example.com/changelog",
    color: "text-amber-600 bg-amber-100 dark:amber-900/30"
  }
];

const Support = () => {
  const { t, i18n } = useTranslation();
  const isId = i18n.language?.startsWith("id");
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <PageHeader
            breadcrumbs={[
              { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
              { label: t("page.support.title") }
            ]}
            title={t("page.support.title")}
            description={t("page.support.description")}
          />
        </div>
      </div>

      <div>
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              data-tour="support-contact-email"
              className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Mail size={22} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t("page.support.emailTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t("page.support.emailDesc")}</p>
              <a
                href="mailto:support@juragankasir.com"
                className="text-sm font-semibold text-primary hover:underline">
                support@juragankasir.com
              </a>
            </div>
            <div
              data-tour="support-contact-phone"
              className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                <Phone size={22} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t("page.support.phoneTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t("page.support.phoneDesc")}</p>
              <a
                href="tel:+6281234567890"
                className="text-sm font-semibold text-primary hover:underline">
                +62 812-3456-7890
              </a>
            </div>
            <div
              data-tour="support-contact-chat"
              className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <MessageCircle size={22} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t("page.support.chatTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t("page.support.chatDesc")}</p>
              <Button
                variant="link"
                className="h-auto p-0 font-semibold"
                onClick={() => window.dispatchEvent(new Event(FAQ_CHAT_OPEN))}>
                {t("page.support.startChat")}
              </Button>
            </div>
          </div>

          <div
            data-tour="support-faq"
            className="bg-card rounded-xl border border-border overflow-hidden mt-6">
            <div className="px-6 py-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  {t("page.support.faqTitle")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("page.support.faqDesc")}</p>
            </div>
            <div className="divide-y divide-border">
              {faqItems.map((item) => {
                const content = isId ? item.idText : item.en;
                const isOpen = openId === item.id;
                const FaqIcon = item.Icon;
                return (
                  <div key={item.id} className="px-6">
                    <button
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className="w-full flex items-center justify-between gap-4 py-4 text-left hover:text-primary transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FaqIcon size={20} className="text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{content.q}</span>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-4 pl-9 pr-2 text-sm text-muted-foreground leading-relaxed">
                        {content.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div data-tour="support-resources" className="mt-6">
            <h3 className="text-base font-semibold text-foreground mb-4">
              {t("page.support.resourcesTitle")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {resources.map((r, i) => (
                <a
                  key={i}
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-card p-5 rounded-xl border border-border hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-3 group">
                  <div
                    className={`w-10 h-10 rounded-lg ${r.color} flex items-center justify-center shrink-0`}>
                    <r.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{isId ? r.id : r.en}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.href}</p>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-muted-foreground group-hover:text-primary shrink-0"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
