import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import crypto from "crypto";
import path from "path";
import { execSync } from "child_process";
import idLocale from "./src/i18n/id.json";
import enLocale from "./src/i18n/en.json";
import idPublicLocale from "./public/locales/id/translation.json";
import enPublicLocale from "./public/locales/en/translation.json";

// ponytail: git SHA di-build-time → tag release Sentry, biar error bisa
// dikaitkan dengan deploy tertentu
let gitSha = "unknown";
try {
  gitSha = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* fallback tetap "unknown" */
}

// ponytail: revisi translasi = MD5 JSON keempat file locale (diimpor langsung,
// bukan via fs/path, supaya tidak ada file-access sink bagi static analyzer).
// Cache-buster /locales berubah kalau file bahasa berubah walaupun BELUM
// di-commit (git SHA saja tidak cukup: key baru muncul mentah karena URL lama
// tetap sama dan browser/Vercel memakai respons JSON basi).
let translationRev = "0";
try {
  const revSeed = JSON.stringify({ idLocale, enLocale, idPublicLocale, enPublicLocale });
  translationRev = crypto.createHash("md5").update(revSeed).digest("hex").slice(0, 8);
} catch {
  /* fallback tetap "0" */
}

// ponytail: manualChunks granuler pernah dicoba untuk isolasi recharts +
// dependensinya (chartDeps: recharts, react-resizable-panels, react-smooth,
// victory-vendor/victory, d3-*, internmap, lodash, react-transition-group,
// recharts-scale) ke chunk sendiri, tapi object-form granuler terbukti
// membuat simbol lintas-chunk diekspor lewat chunk charts sehingga SEMUA
// halaman ikut memuat recharts (423KB). Direvert — recharts+dependensinya
// sekarang lewat default Rollup splitting (sudah terisolasi per lazy route,
// lihat dist chunk generateCategoricalChart-*.js). HANYA lucide-react yang
// masih diisolasi manual di bawah.

const translationBuildRefPlugin = () => ({
  name: "translation-build-ref",
  transformIndexHtml: (html) =>
    html.replace("%TRANSLATION_BUILD_REF%", `${gitSha}-${translationRev}`)
});

export default defineConfig({
  plugins: [react(), translationBuildRefPlugin()],
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
    __TRANSLATION_REV__: JSON.stringify(translationRev),
    // DR-24 D-08: public sign-up is closed unless the build sets
    // VITE_PUBLIC_REGISTRATION_ENABLED=true (the BE has its own switch).
    __PUBLIC_REGISTRATION__: JSON.stringify(process.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true")
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // ponytail: lucide-react dipecah jadi ±150 file ikon 0.5KB oleh default
        // splitting — digabung 1 chunk agar critical chain page dalam tidak
        // menumpuk request kecil. Leaf dep (hanya butuh react), aman dari bleeding.
        manualChunks(id) {
          if (id.includes("/node_modules/lucide-react/")) return "icons";
        }
      }
    }
  },
  server: {
    port: 3000
  }
});
