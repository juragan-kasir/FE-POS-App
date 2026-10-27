/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");

// The product is branded Juragan Kasir: tab title, PWA manifest, sidebar
// name and login. "Bisa Nota" must not come back into what users see (API
// hostnames such as api-bisa-nota.vercel.app are infrastructure, not UI).

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Juragan Kasir branding", () => {
  test("browser tab title and app name", () => {
    const html = read("index.html");
    expect(html).toContain("<title>Juragan Kasir</title>");
    expect(html).toContain('<link rel="icon" href="/mini-logo.png" />');
    expect(html).not.toMatch(/bisa nota/i);
  });

  test("PWA manifest names and icon files", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(manifest.short_name).toBe("Juragan Kasir");
    expect(manifest.name).toMatch(/^Juragan Kasir/);
    manifest.icons.forEach((icon) => {
      expect(fs.existsSync(path.join(root, "public", icon.src))).toBe(true);
    });
  });

  test("sidebar brand name in every locale file", () => {
    [
      "public/locales/id/translation.json",
      "public/locales/en/translation.json",
      "src/i18n/id.json",
      "src/i18n/en.json"
    ].forEach((file) => {
      expect(JSON.parse(read(file))["sidebar.brandName"]).toBe("Juragan Kasir");
    });
  });

  test("login and sidebar show the Juragan Kasir logo", () => {
    const login = read("src/page/auth/login/index.jsx");
    expect(login).not.toMatch(/bisa nota/i);
    expect(login).toContain('from "@/assets/logo-full.webp"');
    expect(login).toContain('from "@/assets/logo-full-dark.webp"');
    expect(read("src/components/layout/Sidebar.jsx")).toContain('alt="Juragan Kasir"');
  });
});
