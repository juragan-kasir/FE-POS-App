# Website strategy — JuraganKasir marketing homepage

Status: implemented at route `/` of this repository. Login moved to `/login`.

## 1. Audit

| Area | Finding |
|---|---|
| Stack | React 18 SPA, Vite 7, Tailwind 3, shadcn/ui, react-router 7, i18next. Deployed on Vercel with an SPA rewrite. |
| WordPress | `juragankasir.com` looks like WordPress (`wp-content` image URLs). That site is **not in this repository**, so nothing here touches it. |
| Current site copy | "Jualan Lebih Mudah, Bisnis Lebih Terarah"; two products (POS, Custom Kasir); no contact details, customers, or testimonials on the page. |
| POS URL | `pos.juragankasir.com` per `index.html` OG tags. |
| Auth | `/` was the login page. `src/services/session.js` also treated `/` as the logout target and a 401-exempt path. Both now use `LOGIN_PATH`; `/` stays exempt. |
| Assets | Logos only. No product screenshots or photography existed. |
| Proof | No verified customers, testimonials, ratings, or usage numbers exist in either repository. |
| WhatsApp | No real sales number exists. `src/page/support/index.jsx` shows `+62 812-3456-7890`, a placeholder. |
| AI assistant | `BE-POS-App` has read endpoints for summary, stock, sales, and best sellers, plus a per-store Telegram link. It fails closed without `AI_CORE_*` and `ASSISTANT_SERVICE_SECRET`. This FE has no connect screen. Whether it is live in production could not be verified. |
| Offline | No offline mode (DR-25). The homepage does not claim one, although `public/manifest.json` still says "bisa offline". |

Design weaknesses of the current site: product-only positioning, no human service story, illustrated wireframes instead of the real product, and a generic feature-grid layout.

## 2. What makes Toast effective

Source note: `pos.toasttab.com` refused automated fetching (HTTP 403). This section rests on Toast's regional pages and third-party descriptions from web search, plus general knowledge of its site. It is **not** a section-by-section read of the live homepage. Compare it against the live page before treating any detail as fact.

- Positions as a **platform for an industry**, not as software. POS is the entry point to a wider system.
- Sells **consolidation**: one system for orders, payments, and operations.
- Runs two parallel conversions: "get a demo" for prospects and "log in" for customers.
- Shows hardware and product in a real service context.
- Leans on customer proof at scale.

| Adapt | Do not copy |
|---|---|
| Platform framing with POS as the entry point | Enterprise scale claims, logo walls, large statistics |
| One primary CTA repeated, login kept quiet | Hardware-led merchandising; we are not selling hardware |
| Product shown in its real state | Toast's copy, branding, illustration, or layout |
| Problem-to-capability storytelling | Dense mega-menus; there are too few pages to justify one |

## 3. Positioning

> JuraganKasir is the practical technology partner for Indonesian F&B owners: a cashier app, an AI assistant, and a team that installs it and trains your staff.

The differentiator is the service. The copy makes no enterprise claims, and it never describes the company's size: credibility comes from what the team does for the owner.

## 4. Customer journey

1. **Sees it:** a cafe or warung owner arrives from a referral, search, or social post.
2. **Understands:** in the first screen, what it is, who it is for, and that people help.
3. **Recognises the problem:** the "struk" of daily problems, each paired with a feature.
4. **Trusts:** real product screens, an explicit setup process, and honesty about proof.
5. **Talks:** "Konsultasi Gratis" opens WhatsApp with a prefilled message.

Existing customers use the "Login" link in the navigation.

## 5. Homepage structure

| Section | Job |
|---|---|
| Navigation | Orientation, Login, primary CTA |
| Hero | The five first-seconds questions, with the real cashier screen |
| Trust | Local fit, using verifiable facts instead of invented logos |
| Platform | Connected capabilities, each with an honest availability status |
| POS showcase | Real screens with confirmed capabilities |
| AI assistant | Practical questions, labelled as an illustration |
| Human support | The differentiator: a five-step service |
| Problems | Each owner problem connected to a confirmed feature |
| Customer stories | Hidden until `CUSTOMER_STORIES` has real entries |
| Final CTA | One decision: start a conversation |

"Resources" from the suggested navigation is left out because no resource content exists yet.

## 6. Conversion strategy

- One primary action throughout: **Konsultasi Gratis**.
- WhatsApp message is prefilled so the owner does not need to compose one.
- `VITE_CONSULT_WHATSAPP_NUMBER` configures the number. Until it is set, CTAs fall back to `mailto:support@juragankasir.com` so no link is dead.
- Login stays visible but visually secondary.
- A signed-in user who opens `/` goes to their dashboard, as they did before.

## 7. Design direction: "Nota"

The receipt is the one thing every cashier and owner handles daily, so it becomes the visual signature: perforated paper edges, printed-receipt type on the receipts, and hairline rules in place of card grids.

### Colour

The suggested palette was adjusted to the actual logo, which is a green gradient with graphite.

| Token | Value | Use | Change from the brief |
|---|---|---|---|
| `pine` | `#0C3B2A` | Hero, large dark surfaces | Darker and cooler than `#14532D`, gives paper more contrast |
| `green` | `#0B7A45` | Primary actions on light | Close to the app's emerald, keeps marketing and product related; `#16A34A` fails 4.5:1 with white text |
| `leaf` | `#7BD651` | Accent on dark only | Taken from the logo highlight, softer than `#A3E635`, which reads as crypto/fintech |
| `paper` | `#F7F4EC` | Page background | Warmer than `#FAFAF7`, reads as receipt paper |
| `paper-deep` | `#EDE8DA` | Alternate band | New |
| `ink` | `#16201B` | Text, assistant section | Green-tinted, echoes the logo's graphite |
| `stone` | `#56605A` | Secondary text | Tinted neutral |
| `kunyit` | `#E5A823` | Sparse highlight on dark | New; a warm food tone so the page is not monochrome |

### Typography

- **Bricolage Grotesque** for headlines: characterful, and not a default SaaS choice.
- **Plus Jakarta Sans** for body: legible, designed for Jakarta's city branding, a quiet local link.
- **IBM Plex Mono** for the two receipts only, where it reads as printed paper.

Fonts are self-hosted WOFF2 files, loaded only by the landing chunk. The POS app keeps Inter and pays nothing.

### Voice

Indonesian copy is casual but professional, like a helpful friend who knows the business: `kamu`, everyday words, short sentences, no slang that dates quickly. Claims stay as specific as the product allows.

### Layout and motion

- 12-column grid, maximum width 1320px, 20px gutters on mobile.
- Asymmetry through a product image bleeding off the right edge and a sticky heading column.
- One animation: the hero receipt prints once. It is disabled under `prefers-reduced-motion`.

## 8. Before launch

1. Set `VITE_CONSULT_WHATSAPP_NUMBER` in the host (Railway builds from the `Dockerfile`, which declares it as a build arg), then redeploy.
2. Confirm the Telegram assistant status and adjust `landing.platform.assistant.status`.
3. Add real photos of an installation or training session to the support section. None exist, and stock images would misrepresent the service.
4. Add real customers to `CUSTOMER_STORIES` when available.
5. Decide the domain plan. This page lives wherever this app is deployed. Replacing the WordPress homepage needs a DNS or proxy decision.

## 9. Indonesian visitor behaviour

Figures below come from secondary reporting found through web search, not from the original reports, and none of them measures F&B owners specifically. They set direction. This site's own analytics should replace them once traffic exists.

| Evidence | What it means here |
|---|---|
| APJII 2025: 229.4M internet users, 80.66% penetration, 83.39% access through a smartphone | Design and test for the phone first |
| Reported WhatsApp use of 90.8% among internet users aged 16+ (Aug 2025; original source not confirmed) | WhatsApp is the default contact channel, so a form is not needed |
| Meta-commissioned Kantar survey, 2024: 87% prefer messaging a business, 68% are frustrated when it is not offered | Vendor-sponsored, but it matches the direction: visible chat is expected |
| Survey of 1,112 online shoppers, 2019: 94% prefer sellers reachable by chat | Old and about online shopping, weak but consistent |

Measured on this production build, mobile profile with throttled network and CPU:

| Profile | Headline visible, before | After | Downloaded, before | After |
|---|---|---|---|---|
| Slow 4G (1.6 Mbps), mid-range Android | 4.2 s | 3.7 s | 581 KB | 442 KB |
| Good 4G (9 Mbps), mid-range Android | 1.4 s | 1.4 s | 581 KB | 442 KB |

That run exposed `translation.json` downloading twice, 140 KB each time, on every page of the app. The preload URL had no `?v=` and no `crossorigin`, so the browser could not reuse it. Fixed in `index.html` and `vite.config.js`.

### Floating chat button

First pass: a green WhatsApp button, always visible. Second pass kept that and tightened it:

| Decision | Why |
|---|---|
| One button, WhatsApp only | Stacked floating buttons compete and cover content on a small screen |
| Icon only on phones, labelled pill on desktop | Keeps content visible, and the WhatsApp mark is widely recognised |
| Official mark and green `#25D366` on a neutral pill | Must be recognised instantly on pine, paper, and ink sections |
| "Chat Tim Kami" rather than "Chat Admin" | Says a person answers, which is the differentiator |
| Fixed width | Language changes must not move it |
| No pulse, fake unread badge, popup, "online" dot, or reply-time promise | These are unverifiable or manipulative, and they cost trust with owners who are wary of sales tactics |
| Footer padding | The button must not cover the last links |

### Still worth doing

1. Serve the homepage without the full 140 KB app catalog, or prerender it. This is the largest remaining win on slow connections.
2. Decide how to answer "harganya berapa?". It will likely be the first question in chat, and no pricing appears on the site.
3. Add verifiable trust details: company name, city, Instagram, and named team members.
4. Set `VITE_GA_MEASUREMENT_ID` so analytics starts collecting. The `consult_click` event already fires on every WhatsApp or email CTA, with `channel` and `placement` parameters.
