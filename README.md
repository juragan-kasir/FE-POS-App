# Juragan Kasir - Frontend

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

Point of Sale (POS) web application frontend built with React, Vite, and shadcn/ui.

> **Checkpoint:** reconciled against `master` `ab03f3ab` on 2026-10-23. 192 `<Route>` tags, 69 service files, 200 Jest test files. The route tables below list the main screens; the full catalog is `POS-MASTER-PRODUCT-DOCUMENTATION.md` §10 in the parent POS-APP folder. Socket.IO is unavailable on serverless Vercel; KDS/queue fall back to polling.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 18, Vite 7 |
| **UI Library** | shadcn/ui (Radix UI primitives) |
| **Styling** | Tailwind CSS 3 |
| **State Management** | Zustand, React Query v3 (`react-query`) |
| **Forms** | React Hook Form + Zod validation |
| **Routing** | React Router v7 |
| **i18n** | i18next (EN, ID) |
| **HTTP** | Axios |
| **Real-time** | Socket.IO Client (no socket server on Vercel → polling fallback) |
| **Charts** | Recharts |
| **Maps** | Leaflet + React-Leaflet |
| **Monitoring** | Sentry |
| **Export/Import** | SheetJS (xlsx) |
| **Service worker** | `public/sw.js` caches static shell + a few read APIs; no offline mode (DR-25) |

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn

### Installation

```bash
git clone <repository-url>
cd FE-POS-App
npm install
```

### Environment Variables

Create `.env` file:

Copy `.env.example` to `.env`:

```env
VITE_BASE_URL=https://be.juragankasir.com           # required
VITE_ORDER_APP_URL=https://order-app-dun.vercel.app # BISA-MAKAN-APP base URL for table QR codes (this is the default)
```

Vite inlines `VITE_*` at build time, so a change needs a rebuild/redeploy.

### Development

```bash
npm run dev        # Start dev server on http://localhost:3000
```

### Build & Deploy

```bash
npm run build      # Production build
npm run preview    # Preview production build
```

### Other Commands

```bash
npm run lint       # Run ESLint
npm run test       # Run Jest tests (200 files)
```

---

## Project Structure

```
src/
├── assets/               # Static images (flags, icons)
├── components/
│   ├── layout/           # DashboardLayout, Sidebar, Header, CommandPalette
│   ├── organism/         # Complex feature components (modals, tour, FAQ chat)
│   └── ui/               # shadcn/ui base components (Button, Input, Table, etc.)
├── hooks/                # Custom hooks (useDebounce, useKeyboardShortcuts, etc.)
├── i18n/                 # Translations (en.json, id.json)
├── lib/                  # Utility libraries, constants
├── page/                 # Page components (45+ modules, lazy-loaded)
├── services/             # API service layer (69 files, Axios-based)
├── state/                # Zustand stores (theme, checkout, order, tour, etc.)
├── utils/                # Utilities (permissions, sidebar menu, formatters)
├── App.jsx               # Root router config
└── index.jsx             # Entry point
```

---

## Features

### Core POS
- **Cashier Terminal** - Product grid, cart, order queue, checkout
- **Kitchen Display System (KDS)** - Order updates via Socket.IO on a long-running server; polling on Vercel
- **Customer Self-Order** - QR code menu, cart, and order tracking
- **Customer Display** - Customer-facing order display screen
- **Split Bill** - Divide orders among multiple customers
- **Thermal Printing** - ESC/POS receipt printing via Bluetooth

### Inventory & Procurement
- **Product Management** - CRUD, categories, images, per-store pricing
- **Stock Management** - History, opname, adjustment, low stock alerts
- **Stock Transfer** - Inter-store transfers with receive/cancel workflow
- **Purchase Orders** - Create, approve, partial payments, goods receipt
- **Production Orders** - BOM/recipes, ingredient deduction, production lifecycle
- **Goods Receipt** - Receive goods from suppliers with quality checking
- **Sales & Purchase Returns** - Customer/supplier return workflows

### People & Access
- **Employee Management** - CRUD with avatar, salary, contract info
- **Role-Based Access Control (RBAC)** - 4 role types, granular per-menu permissions (menu enforcement partial: 30/77 BE route files write-gated)
- **Departments & Positions** - Hierarchical organization management
- **Members & Loyalty** - Points accumulation, redemption, tier system

### Finance & Reporting
- **Cash Register** - Open/close sessions, history
- **Expense Management** - Categories, approval workflow
- **Accounts Receivable** - AR tracking, aging reports, payments
- **Purchase Payments** - AP tracking, installments
- **Tax Configuration** - PPN, service charges per store
- **Reports** - Sales, daily summary, profit/loss, cash flow, best selling

### Settings & Config
- **Store/Location Management** - Multi-branch with geospatial map view
- **Payment Types** - Cash, e-wallet, QRIS, custom types
- **Discount Management** - Percentage/fixed, date range, store scope
- **Shift Management** - Work shifts per store
- **Invoice/Receipt Settings** - Logo, footer, social media, preview
- **Reservation System** - Table reservations with date/time/guest management
- **Notifications** - In-app notification system

### Platform Features
- **Internationalization (i18n)** - English, Indonesian
- **Dark Mode** - Full dark theme support
- **Connection indicator** - Warns when offline that saves/payments/prints are blocked; nothing is queued or synced (DR-25)
- **Keyboard Shortcuts** - Ctrl+S (submit), Ctrl+N (add new)
- **Guided Tours** - Super admin onboarding tour
- **Excel Import/Export** - Products, suppliers, categories, departments, positions
- **Error Monitoring** - Sentry integration with session replay
- **Command Palette** - Quick navigation (Cmd+K)

---

## Routes

### Public
| Route | Description |
|-------|-------------|
| `/` | Login |
| `/register` | Registration (redirects to `/` unless public registration is enabled) |
| `/reset-password` | Password Reset |
| `/home` | Cashier Terminal |
| `/customer-display` | Customer Display Screen |

### Dashboard
| Route | Description |
|-------|-------------|
| `/dashboard-super-admin` | Super Admin Dashboard (all stores) |
| `/dashboard-admin` | Admin Dashboard (single store) |

### POS & Operations
| Route | Description |
|-------|-------------|
| `/kitchen-display` | Kitchen Display System |
| `/qr-order-management` | QR Order Management |
| `/cash-register/open-close`, `/current`, `/history`, `/history/detail`, `/xz-report` | Cash Register |
| `/table-list` | Table Management |

### Products & Inventory
| Route | Description |
|-------|-------------|
| `/product-list` | Product List |
| `/category-list` | Category List |
| `/ingredient` | Ingredient List |
| `/ingredient-category` | Ingredient Category List |
| `/stock-history` | Stock History |
| `/stock-opname` | Stock Opname |
| `/stock-transfer` | Stock Transfer |
| `/low-stock` | Low Stock Alerts |
| `/stock-adjustment` | Stock Adjustment |

### Procurement & Production
| Route | Description |
|-------|-------------|
| `/supplier` | Supplier List |
| `/purchase-order` | Purchase Order List |
| `/purchase-payment` | Purchase Payment List |
| `/goods-receipt` | Goods Receipt List |
| `/bom` | Bill of Materials |
| `/production-order` | Production Order List |
| `/sales-return` | Sales Return List |
| `/purchase-return` | Purchase Return List |

### People
| Route | Description |
|-------|-------------|
| `/employee-list` | Employee List |
| `/user-list` | User List |
| `/role-management` | Role Management |
| `/department-list` | Department List |
| `/position-list` | Position List |

### Members & Loyalty
| Route | Description |
|-------|-------------|
| `/member-list` | Member List |
| `/member-tier` | Member Tier List |
| `/member-point-history` | Point History |

### Finance & Reports
| Route | Description |
|-------|-------------|
| `/accounts-receivable` | Accounts Receivable |
| `/ar-payment` | AR Payments |
| `/expense` | Expense List |
| `/expense-category` | Expense Category List |
| `/report/sales` | Sales Report |
| `/report/daily` | Daily Report |
| `/report/profit-per-product` | Profit per Product Report |
| `/report/settings` | Report column/branding settings |
| `/advanced-reporting` | Advanced Reporting |
| `/report/cash-flow` | Cash Flow Report |
| `/best-selling` | Best Selling Report |

### Settings
| Route | Description |
|-------|-------------|
| `/location-list` | Store/Location List |
| `/store-geospatial` | Store Geospatial Map |
| `/type-payment-list` | Payment Type List |
| `/discount-list` | Discount List |
| `/shift-list` | Shift List |
| `/tax-list` | Tax Config List |
| `/invoice-page` | Invoice/Receipt Settings |
| `/reservation` | Reservation List |
| `/notification` | Notifications |
| `/profile` | User Profile |
| `/backup` | Backup & Restore |

---

## Role-Based Access

| Role | Description | Access |
|------|-------------|--------|
| **super_admin** | Owner | All stores, all features |
| **admin** | Store Manager | Store-level access |
| **kasir** | POS Staff | POS + Membership |
| **user** | General Staff | Dashboard + basic reports |

Sidebar menus, page access, and button permissions are all controlled by RBAC. See `src/utils/sidebar-menu.js` and `src/utils/permission.js`.

---

## Environment

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BASE_URL` | Backend API URL (required) | `https://be.juragankasir.com` |
| `VITE_ORDER_APP_URL` | BISA-MAKAN-APP base URL used in table QR codes | `https://order-app-dun.vercel.app` (default) |

---

## Deployment

Deployed on **Vercel** with SPA rewrites configured in `vercel.json`.

- **App**: https://pos.juragankasir.com
- **API**: https://be.juragankasir.com
- **CI**: GitHub Actions is currently disabled at the organisation level; run `npm run lint` and `npm test` locally before pushing.

---

## Related

- [Backend API](../BE-POS-App/README.md)
- [Referensi API Backend — FE](./docs/backend-api-reference.md) (pemetaan seluruh pemanggilan `src/services/*` ke endpoint BE)
- [API Response Contracts — ERP/Akuntansi](./docs/api-response-contracts.md) (envelope, error codes, response shapes BE → FE)
- [Super Admin Guide](./PANDUAN-SUPER-ADMIN.md)
- [Layout Design System](./layout.md)
