import { safeGet } from "@/lib/safe-lookup";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const policyContent = {
  privacy: {
    id: {
      title: "Kebijakan Privasi",
      sections: [
        {
          heading: "Pengumpulan Informasi",
          body: "Kami mengumpulkan informasi pribadi yang Anda berikan secara sukarela saat mendaftar, termasuk nama pengguna, alamat email, dan informasi toko. Data ini digunakan untuk mengelola akun Anda dan menyediakan layanan POS kepada Anda."
        },
        {
          heading: "Penggunaan Informasi",
          body: "Informasi yang kami kumpulkan digunakan untuk memproses transaksi, meningkatkan layanan kami, mengirimkan pembaruan terkait platform, dan memberikan dukungan pelanggan. Kami tidak akan menjual informasi pribadi Anda kepada pihak ketiga."
        },
        {
          heading: "Perlindungan Data",
          body: "Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang sesuai untuk melindungi data pribadi Anda dari akses tidak sah, perubahan, pengungkapan, atau penghancuran."
        },
        {
          heading: "Cookie",
          body: "Platform kami menggunakan cookie untuk meningkatkan pengalaman pengguna, menganalisis tren, dan mengelola sesi. Anda dapat mengontrol penggunaan cookie melalui pengaturan browser Anda."
        },
        {
          heading: "Hak Anda",
          body: "Anda berhak untuk mengakses, memperbarui, atau menghapus informasi pribadi Anda kapan saja. Hubungi tim dukungan kami jika Anda memiliki pertanyaan tentang kebijakan privasi ini."
        },
        {
          heading: "Perubahan Kebijakan",
          body: "Kebijakan privasi ini dapat diperbarui secara berkala. Perubahan signifikan akan diberitahukan melalui platform atau email yang terdaftar."
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      sections: [
        {
          heading: "Information Collection",
          body: "We collect personal information you voluntarily provide during registration, including username, email address, and store information. This data is used to manage your account and provide POS services to you."
        },
        {
          heading: "Use of Information",
          body: "The information we collect is used to process transactions, improve our services, send platform updates, and provide customer support. We will not sell your personal information to third parties."
        },
        {
          heading: "Data Protection",
          body: "We implement appropriate technical and organizational security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction."
        },
        {
          heading: "Cookies",
          body: "Our platform uses cookies to enhance user experience, analyze trends, and manage sessions. You can control cookie usage through your browser settings."
        },
        {
          heading: "Your Rights",
          body: "You have the right to access, update, or delete your personal information at any time. Contact our support team if you have questions about this privacy policy."
        },
        {
          heading: "Policy Changes",
          body: "This privacy policy may be updated periodically. Significant changes will be notified through the platform or registered email."
        }
      ]
    }
  },
  terms: {
    id: {
      title: "Syarat & Ketentuan",
      sections: [
        {
          heading: "Penerimaan Ketentuan",
          body: "Dengan mendaftar dan menggunakan platform Juragan Kasir, Anda menyetujui syarat dan ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun, jangan gunakan layanan kami."
        },
        {
          heading: "Akun Pengguna",
          body: "Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda. Semua aktivitas yang terjadi di bawah akun Anda adalah tanggung jawab Anda. Beri tahu kami segera jika terjadi penggunaan tidak sah."
        },
        {
          heading: "Penggunaan Layanan",
          body: "Platform ini disediakan untuk mengelola operasi bisnis ritel Anda. Anda setuju untuk tidak menyalahgunakan layanan, termasuk upaya mengakses sistem tanpa izin atau mengganggu fungsi platform."
        },
        {
          heading: "Data & Privasi",
          body: "Data transaksi dan informasi bisnis Anda diproses sesuai dengan Kebijakan Privasi kami. Kami mengenkripsi data sensitif dan tidak membagikannya tanpa persetujuan Anda."
        },
        {
          heading: "Batasan Tanggung Jawab",
          body: "Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan platform ini. Layanan diberikan 'sebagaimana adanya' tanpa jaminan tersurat maupun tersirat."
        },
        {
          heading: "Penghentian",
          body: "Kami berhak menangguhkan atau menghentikan akses Anda jika melanggar ketentuan ini. Anda dapat menghentikan akun kapan saja melalui pengaturan atau dengan menghubungi dukungan."
        }
      ]
    },
    en: {
      title: "Terms & Conditions",
      sections: [
        {
          heading: "Acceptance of Terms",
          body: "By registering and using the Juragan Kasir platform, you agree to these terms and conditions. If you do not agree with any part, do not use our services."
        },
        {
          heading: "User Account",
          body: "You are responsible for maintaining the confidentiality of your account credentials. All activities occurring under your account are your responsibility. Notify us immediately of any unauthorized use."
        },
        {
          heading: "Use of Service",
          body: "This platform is provided to manage your retail business operations. You agree not to misuse the service, including attempting to access the system without authorization or disrupting platform functionality."
        },
        {
          heading: "Data & Privacy",
          body: "Your transaction data and business information are processed in accordance with our Privacy Policy. We encrypt sensitive data and do not share it without your consent."
        },
        {
          heading: "Limitation of Liability",
          body: "We shall not be liable for indirect damages arising from the use of this platform. Services are provided 'as is' without any express or implied warranties."
        },
        {
          heading: "Termination",
          body: "We reserve the right to suspend or terminate your access if you violate these terms. You may terminate your account at any time through settings or by contacting support."
        }
      ]
    }
  }
};

const PolicyDialog = ({ type, open, onOpenChange }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "id";

  const content =
    safeGet(safeGet(policyContent, type), lang) || safeGet(safeGet(policyContent, type), "id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-5 md:px-6 pt-5 md:pt-6 pb-3 border-b border-border">
          <DialogTitle className="text-lg md:text-xl font-semibold text-foreground">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-muted-foreground">
            {type === "privacy"
              ? lang === "id"
                ? "Bagaimana kami melindungi data Anda"
                : "How we protect your data"
              : lang === "id"
                ? "Ketentuan penggunaan platform"
                : "Platform usage terms"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="px-5 md:px-6 py-4 max-h-[50vh]">
          <div className="space-y-4 md:space-y-5">
            {content.sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-1.5">
                  {idx + 1}. {section.heading}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="px-5 md:px-6 py-3 md:py-4 border-t border-border flex justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-foreground text-background hover:bg-foreground/90 px-5 py-2 rounded-lg text-sm font-medium transition-all">
              <span>{t("policy.understand")}</span>
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyDialog;
