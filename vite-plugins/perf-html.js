// Plugin build untuk Core Web Vitals (LCP) di halaman login:
// 1. Preload font Inter 400/600 (teks LCP tidak menunggu CSS diparse dulu).
// 2. Saat URL = /login, modulepreload seluruh graf chunk halaman login
//    (login di-lazy → tanpa ini browser baru tahu ±30 chunk kecilnya setelah
//    entry JS selesai dieksekusi: rantai request berurutan). Route lain tidak
//    ikut memuatnya, jadi bundle halaman berlogin tidak membengkak.
export default function perfHtml({
  preloadFonts = [/inter-latin-400-normal.*\.woff2$/, /inter-latin-600-normal.*\.woff2$/],
  routes = [{ test: "^/login/?$", module: "src/page/auth/login/index.jsx" }]
} = {}) {
  return {
    name: "perf-html",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
        const entry = chunks.find((c) => c.isEntry);
        const closure = (start) => {
          const seen = new Set();
          const walk = (file) => {
            if (seen.has(file)) return;
            seen.add(file);
            bundle[file]?.imports?.forEach(walk);
          };
          walk(start);
          return seen;
        };
        const inEntry = entry ? closure(entry.fileName) : new Set();
        const scripts = routes
          .map(({ test, module }) => {
            const chunk = chunks.find((c) => c.facadeModuleId?.replaceAll("\\", "/").endsWith(module));
            if (!chunk) return "";
            const files = [...closure(chunk.fileName)].filter((f) => !inEntry.has(f)).map((f) => `/${f}`);
            return `<script>if(new RegExp(${JSON.stringify(test)}).test(location.pathname)){${JSON.stringify(files)}.forEach(function(f){var l=document.createElement("link");l.rel="modulepreload";l.href=f;document.head.appendChild(l)})}</script>`;
          })
          .join("");
        const fonts = Object.keys(bundle)
          .filter((f) => preloadFonts.some((re) => re.test(f)))
          .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/${f}" crossorigin>`)
          .join("");
        return html.replace("</title>", `</title>${fonts}${scripts}`);
      }
    }
  };
}
