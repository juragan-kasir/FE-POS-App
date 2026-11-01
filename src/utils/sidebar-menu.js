import {
  Crown,
  Calculator,
  UtensilsCrossed,
  Users,
  BookUser,
  CalendarDays,
  Store,
  Package,
  Tag,
  BarChart3,
  Settings,
  FileText,
  Building2,
  CreditCard,
  Percent,
  Warehouse,
  Table,
  ShoppingCart,
  TrendingUp,
  Receipt,
  ClipboardList,
  Award,
  TriangleAlert,
  Shield,
  ArrowRightLeft,
  DollarSign,
  BadgePercent,
  ChefHat,
  Wallet,
  Database,
  QrCode,
  ShoppingBag,
  FlaskConical,
  Truck,
  Megaphone,
  Clock,
  HandPlatter,
  AlarmClock,
  Plane,
  // MonitorPlay,
  Landmark
} from "lucide-react";

export const sidebarMenuSuperAdmin = [
  {
    title: "Dashboard",
    i18nKey: "sidebar.dashboardSuperAdmin",
    href: "/dashboard-super-admin",
    icon: Crown,
    children: [],
    actions: ["view"],
    activePaths: ["/low-stock-all", "/low-stock"]
  },
  {
    title: "POS & Penjualan",
    section: true,
    i18nKey: "sidebar.section.posPenjualan",
    icon: Calculator,
    children: [
      {
        title: "Kasir",
        i18nKey: "sidebar.cashier",
        href: "/home",
        icon: Calculator,
        actions: ["view", "add"]
      },
      {
        title: "Kasir (Register)",
        i18nKey: "sidebar.cashRegister",
        href: "/cash-register/current",
        icon: DollarSign,
        actions: ["view", "add"]
      },
      {
        title: "Laporan X/Z",
        i18nKey: "sidebar.xzReport",
        href: "/cash-register/xz-report",
        icon: FileText,
        actions: ["view"]
      },
      {
        title: "Dapur (KDS)",
        i18nKey: "sidebar.kitchenDisplay",
        href: "/kitchen-display",
        icon: ChefHat,
        actions: ["view"]
      },
      // {
      //   title: "Layar Pesanan Pelanggan",
      //   i18nKey: "sidebar.customerDisplayBoard",
      //   href: "/customer-display-board",
      //   icon: MonitorPlay,
      //   external: true,
      //   actions: ["view"]
      // },
      {
        title: "QR Orders",
        i18nKey: "sidebar.qrOrders",
        href: "/qr-order-management",
        icon: QrCode,
        actions: ["view"]
      },
      {
        title: "Queue Management",
        i18nKey: "sidebar.queue",
        href: "/queue-list",
        icon: Clock,
        actions: ["view", "add", "edit"]
      },
      {
        title: "Permintaan Pelayan",
        i18nKey: "sidebar.waiterRequest",
        href: "/waiter-request",
        icon: HandPlatter,
        actions: ["view", "edit"]
      },
      {
        title: "Sales Return",
        i18nKey: "sidebar.salesReturn",
        href: "/sales-return",
        icon: ShoppingCart,
        actions: ["view"],
        activePaths: ["/sales-return/create", "/sales-return/detail"]
      },
      {
        title: "Piutang (AR)",
        i18nKey: "sidebar.piutang",
        href: "/accounts-receivable",
        icon: Receipt,
        actions: ["view"]
      }
    ]
  },
  {
    title: "Location",
    section: true,
    i18nKey: "sidebar.section.location",
    icon: Store,
    children: [
      {
        title: "Master Data",
        i18nKey: "sidebar.kelolaToko",
        href: "/location-list",
        icon: Store,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Harga per Toko",
        i18nKey: "sidebar.pricePerStore",
        href: "/price-list-template",
        icon: BadgePercent,
        actions: ["view", "edit"]
      },
      {
        title: "Meja",
        i18nKey: "sidebar.meja",
        href: "/table-list",
        icon: Table,
        actions: ["add", "edit", "view", "delete", "update-status"]
      },
      {
        title: "Reservasi Meja",
        i18nKey: "sidebar.reservation",
        href: "/reservation",
        icon: CalendarDays,
        actions: ["add", "edit", "view", "delete"]
      }
    ]
  },
  {
    title: "Produk & Promo",
    section: true,
    i18nKey: "sidebar.section.produkPromo",
    icon: ShoppingBag,
    children: [
      {
        title: "Kategori",
        i18nKey: "sidebar.kategori",
        href: "/category-list",
        icon: Tag,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Daftar Produk",
        i18nKey: "sidebar.daftarProduk",
        href: "/product-list",
        icon: UtensilsCrossed,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Paket / Bundle",
        i18nKey: "sidebar.bundle",
        href: "/bundle",
        icon: Package,
        actions: ["view", "add", "edit", "delete"],
        activePaths: ["/bundle/add", "/bundle/edit"]
      },
      {
        title: "Diskon & Voucher",
        i18nKey: "sidebar.diskon",
        href: "/discount-list",
        icon: BadgePercent,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Kampanye Promo",
        i18nKey: "sidebar.promo",
        href: "/promo-list",
        icon: Megaphone,
        actions: ["view", "add", "edit", "delete"]
      }
    ]
  },
  {
    title: "Bahan Baku & Pembelian",
    section: true,
    i18nKey: "sidebar.section.bahanBakuPembelian",
    icon: FlaskConical,
    children: [
      {
        title: "Kategori Supplier",
        i18nKey: "sidebar.supplierCategory",
        href: "/supplier-category",
        icon: Tag,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Supplier",
        i18nKey: "sidebar.supplier",
        href: "/supplier",
        icon: Building2,
        activePaths: [
          "/supplier-comparison",
          "/add-supplier",
          "/edit-supplier",
          "/detail-supplier"
        ],
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Supplier Scores",
        i18nKey: "sidebar.supplierPerformance",
        href: "/supplier-score-list",
        icon: TrendingUp,
        actions: ["view", "add"]
      },
      {
        title: "Kategori Bahan Baku",
        i18nKey: "sidebar.ingredientCategory",
        href: "/ingredient-category",
        icon: Tag,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Bahan Baku",
        i18nKey: "sidebar.bahanBaku",
        href: "/ingredient",
        icon: Package,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Purchase Order",
        i18nKey: "sidebar.purchaseOrder",
        href: "/purchase-order",
        icon: ShoppingCart,
        actions: ["add", "edit", "view"]
      },
      {
        title: "Permintaan Barang",
        i18nKey: "sidebar.goodsRequest",
        href: "/goods-request",
        icon: ClipboardList,
        activePaths: ["/goods-request/detail", "/add-goods-request", "/edit-goods-request"],
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Goods Receipt",
        i18nKey: "sidebar.goodsReceipt",
        href: "/goods-receipt",
        icon: FileText,
        actions: ["add", "view", "delete"]
      },
      {
        title: "Purchase Return",
        i18nKey: "sidebar.purchaseReturn",
        href: "/purchase-return",
        icon: ShoppingCart,
        activePaths: ["/purchase-return/detail"],
        actions: ["view"]
      },
      {
        title: "Dashboard Utang (AP)",
        i18nKey: "sidebar.apDashboard",
        href: "/ap-dashboard",
        icon: Wallet,
        actions: ["view"]
      },
      {
        title: "Riwayat Pembayaran",
        i18nKey: "sidebar.purchasePayment",
        href: "/purchase-payment",
        icon: Wallet,
        actions: ["view"]
      }
    ]
  },
  {
    title: "Gudang, Produksi & Delivery",
    section: true,
    i18nKey: "sidebar.section.gudangOperasional",
    icon: Warehouse,
    children: [
      {
        title: "Stock Opname",
        i18nKey: "sidebar.stockOpname",
        href: "/stock-opname",
        icon: ClipboardList,
        actions: ["add", "view"]
      },
      {
        title: "Stock Adjustment",
        href: "/stock-adjustment",
        icon: Package,
        actions: ["add"]
      },
      {
        title: "Transfer Stok",
        i18nKey: "sidebar.transferStok",
        href: "/stock-transfer",
        icon: ArrowRightLeft,
        actions: ["view", "add", "delete"]
      },
      {
        title: "History Stok",
        i18nKey: "sidebar.historyStok",
        href: "/stock-history",
        icon: FileText,
        actions: ["view"]
      },
      {
        title: "Low Stock",
        i18nKey: "sidebar.lowStock",
        href: "/low-stock",
        icon: TriangleAlert,
        actions: ["view"]
      },
      {
        title: "Production Order",
        i18nKey: "sidebar.productionOrder",
        href: "/production-order",
        icon: Package,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "BOM",
        i18nKey: "sidebar.bom",
        href: "/bom",
        icon: ClipboardList,
        actions: ["add", "view", "delete"]
      },
      {
        title: "Delivery Orders",
        i18nKey: "sidebar.deliveryOrders",
        href: "/delivery-orders",
        icon: Truck,
        actions: ["view", "add", "edit"]
      },
      {
        title: "Driver",
        i18nKey: "sidebar.driver",
        href: "/driver-list",
        icon: Users,
        actions: ["view", "add", "edit", "delete"]
      }
    ]
  },
  {
    title: "Keuangan & Laporan",
    section: true,
    i18nKey: "sidebar.section.keuanganLaporan",
    icon: DollarSign,
    children: [
      {
        title: "Kategori Pengeluaran",
        i18nKey: "sidebar.kategoriPengeluaran",
        href: "/expense-category",
        icon: Tag,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Daftar Pengeluaran",
        i18nKey: "sidebar.daftarPengeluaran",
        href: "/expense",
        icon: Receipt,
        actions: ["add", "edit", "view", "approve"]
      },
      {
        title: "Akuntansi",
        i18nKey: "sidebar.accounting",
        href: "/accounting",
        icon: Landmark,
        actions: ["view"]
      },
      {
        title: "Penjualan",
        i18nKey: "sidebar.penjualan",
        href: "/report/sales",
        icon: TrendingUp,
        actions: ["view", "export"]
      },
      {
        title: "Produk Terlaris",
        i18nKey: "sidebar.produkTerlaris",
        href: "/best-selling",
        icon: BarChart3,
        actions: ["view", "export"]
      },
      {
        title: "Laporan Harian",
        i18nKey: "sidebar.laporanHarian",
        href: "/report/daily",
        icon: ClipboardList,
        actions: ["view"]
      },
      {
        title: "Arus Kas",
        i18nKey: "sidebar.arusKas",
        href: "/report/cash-flow",
        icon: Receipt,
        actions: ["view"]
      },
      {
        title: "Advanced Reporting",
        i18nKey: "sidebar.advancedReporting",
        href: "/advanced-reporting",
        icon: BarChart3,
        actions: ["view"]
      }
    ]
  },
  {
    // SDM & Member: offered in Role Management so a role can be granted them
    // (the sidebar already shows them from navCategories when granted).
    title: "SDM & Member",
    section: true,
    i18nKey: "sidebar.section.sdm",
    icon: Users,
    children: [
      {
        title: "Departemen",
        i18nKey: "sidebar.departemen",
        href: "/department-list",
        icon: Building2,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Posisi",
        i18nKey: "sidebar.posisi",
        href: "/position-list",
        icon: FileText,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Daftar Karyawan",
        i18nKey: "sidebar.daftarKaryawan",
        href: "/employee-list",
        icon: Users,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Daftar Pengguna",
        i18nKey: "sidebar.daftarPengguna",
        href: "/user-list",
        icon: Shield,
        actions: ["view", "add", "edit", "update-status"]
      },
      {
        title: "Perjalanan Dinas",
        i18nKey: "sidebar.businessTrip",
        href: "/business-trip",
        icon: Plane,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Template Shift",
        i18nKey: "sidebar.shiftTemplate",
        href: "/shift-template-list",
        icon: Clock,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Shift",
        i18nKey: "sidebar.shift",
        href: "/shift-list",
        icon: CalendarDays,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Shift Saya",
        i18nKey: "sidebar.myShift",
        href: "/my-shift",
        icon: CalendarDays,
        actions: ["view"]
      },
      {
        title: "Member Tier",
        i18nKey: "sidebar.memberTier",
        href: "/member-tier",
        icon: Award,
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Daftar Member",
        i18nKey: "sidebar.daftarMember",
        href: "/member-list",
        icon: Users,
        actions: ["view", "add", "edit", "delete"]
      }
    ]
  },
  {
    title: "Pengaturan",
    section: true,
    i18nKey: "sidebar.section.settings",
    icon: Settings,
    children: [
      {
        title: "Invoice & Struk",
        i18nKey: "sidebar.invoiceStruk",
        href: "/invoice-page",
        icon: FileText,
        actions: ["add", "edit", "view"]
      },
      {
        title: "Pajak",
        i18nKey: "sidebar.pajak",
        href: "/tax-list",
        icon: Percent,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Metode Pembayaran",
        i18nKey: "sidebar.metodePembayaran",
        href: "/type-payment-list",
        icon: CreditCard,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Manajemen Role & Izin",
        i18nKey: "sidebar.roleManagement",
        href: "/role-management",
        icon: Shield,
        keywords: "role permission izin pengaturan settings manajemen",
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Backup & Restore",
        i18nKey: "sidebar.backup",
        href: "/backup",
        icon: Database,
        actions: ["view"]
      },
      {
        title: "Pengaturan Laporan",
        i18nKey: "sidebar.reportSettings",
        href: "/report/settings",
        icon: FileText,
        actions: ["view"]
      }
    ]
  }
];

export const sidebarMenuAdmin = [
  {
    title: "Dashboard",
    i18nKey: "sidebar.dashboardAdmin",
    href: "/dashboard-admin",
    icon: Crown,
    actions: ["view"],
    activePaths: ["/low-stock-all", "/low-stock"]
  },
  {
    title: "POS & Penjualan",
    section: true,
    i18nKey: "sidebar.section.posPenjualan",
    icon: Calculator,
    children: [
      {
        title: "Kasir",
        i18nKey: "sidebar.cashier",
        href: "/home",
        icon: Calculator,
        actions: ["view", "add"]
      },
      {
        title: "Kasir (Register)",
        i18nKey: "sidebar.cashRegister",
        href: "/cash-register/current",
        icon: DollarSign,
        actions: ["view", "add"]
      },
      {
        title: "Laporan X/Z",
        i18nKey: "sidebar.xzReport",
        href: "/cash-register/xz-report",
        icon: FileText,
        actions: ["view"]
      },
      {
        title: "Dapur (KDS)",
        i18nKey: "sidebar.kitchenDisplay",
        href: "/kitchen-display",
        icon: ChefHat,
        actions: ["view"]
      },
      // {
      //   title: "Layar Pesanan Pelanggan",
      //   i18nKey: "sidebar.customerDisplayBoard",
      //   href: "/customer-display-board",
      //   icon: MonitorPlay,
      //   external: true,
      //   actions: ["view"]
      // },
      {
        title: "QR Orders",
        i18nKey: "sidebar.qrOrders",
        href: "/qr-order-management",
        icon: QrCode,
        actions: ["view"]
      },
      {
        title: "Meja",
        i18nKey: "sidebar.meja",
        href: "/table-list",
        icon: Table,
        actions: ["add", "edit", "view", "delete", "update-status"]
      },
      {
        title: "Reservasi Meja",
        i18nKey: "sidebar.reservation",
        href: "/reservation",
        icon: CalendarDays,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Queue Management",
        i18nKey: "sidebar.queue",
        href: "/queue-list",
        icon: Clock,
        actions: ["view", "add", "edit"]
      },
      {
        title: "Permintaan Pelayan",
        i18nKey: "sidebar.waiterRequest",
        href: "/waiter-request",
        icon: HandPlatter,
        actions: ["view", "edit"]
      },
      {
        title: "Sales Return",
        i18nKey: "sidebar.salesReturn",
        href: "/sales-return",
        icon: ShoppingCart,
        actions: ["view"],
        activePaths: ["/sales-return/create", "/sales-return/detail"]
      },
      {
        title: "Piutang (AR)",
        i18nKey: "sidebar.piutang",
        href: "/accounts-receivable",
        icon: Receipt,
        actions: ["view"]
      }
    ]
  },
  {
    title: "Produk & Promo",
    section: true,
    i18nKey: "sidebar.section.produkPromo",
    icon: ShoppingBag,
    children: [
      {
        title: "Kategori",
        i18nKey: "sidebar.kategori",
        href: "/category-list",
        icon: Tag,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Daftar Produk",
        i18nKey: "sidebar.daftarProduk",
        href: "/product-list",
        icon: UtensilsCrossed,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Harga per Toko",
        i18nKey: "sidebar.pricePerStore",
        href: "/price-list-template",
        icon: BadgePercent,
        actions: ["view", "edit"]
      },
      {
        title: "Paket / Bundle",
        i18nKey: "sidebar.bundle",
        href: "/bundle",
        icon: Package,
        actions: ["view", "add", "edit", "delete"],
        activePaths: ["/bundle/add", "/bundle/edit"]
      },
      {
        title: "Diskon & Voucher",
        i18nKey: "sidebar.diskon",
        href: "/discount-list",
        icon: BadgePercent,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Kampanye Promo",
        i18nKey: "sidebar.promo",
        href: "/promo-list",
        icon: Megaphone,
        actions: ["view", "add", "edit", "delete"]
      }
    ]
  },
  {
    title: "Bahan Baku & Pembelian",
    section: true,
    i18nKey: "sidebar.section.bahanBakuPembelian",
    icon: FlaskConical,
    children: [
      {
        title: "Kategori Supplier",
        i18nKey: "sidebar.supplierCategory",
        href: "/supplier-category",
        icon: Tag,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Supplier",
        i18nKey: "sidebar.supplier",
        href: "/supplier",
        icon: Building2,
        activePaths: [
          "/supplier-comparison",
          "/add-supplier",
          "/edit-supplier",
          "/detail-supplier"
        ],
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Supplier Scores",
        i18nKey: "sidebar.supplierPerformance",
        href: "/supplier-score-list",
        icon: TrendingUp,
        actions: ["view", "add"]
      },
      {
        title: "Kategori Bahan Baku",
        i18nKey: "sidebar.ingredientCategory",
        href: "/ingredient-category",
        icon: Tag,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Bahan Baku",
        i18nKey: "sidebar.bahanBaku",
        href: "/ingredient",
        icon: Package,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Purchase Order",
        i18nKey: "sidebar.purchaseOrder",
        href: "/purchase-order",
        icon: ShoppingCart,
        actions: ["add", "edit", "view"]
      },
      {
        title: "Permintaan Barang",
        i18nKey: "sidebar.goodsRequest",
        href: "/goods-request",
        icon: ClipboardList,
        activePaths: ["/goods-request/detail", "/add-goods-request", "/edit-goods-request"],
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Perjalanan Dinas",
        i18nKey: "sidebar.businessTrip",
        href: "/business-trip",
        icon: Plane,
        activePaths: ["/business-trip/detail", "/add-business-trip", "/edit-business-trip"],
        actions: ["view", "add", "edit", "delete"]
      },
      {
        title: "Goods Receipt",
        i18nKey: "sidebar.goodsReceipt",
        href: "/goods-receipt",
        icon: FileText,
        actions: ["add", "view", "delete"]
      },
      {
        title: "Purchase Return",
        i18nKey: "sidebar.purchaseReturn",
        href: "/purchase-return",
        icon: ShoppingCart,
        activePaths: ["/purchase-return/detail"],
        actions: ["view"]
      },
      {
        title: "Dashboard Utang (AP)",
        i18nKey: "sidebar.apDashboard",
        href: "/ap-dashboard",
        icon: Wallet,
        actions: ["view"]
      },
      {
        title: "Riwayat Pembayaran",
        i18nKey: "sidebar.purchasePayment",
        href: "/purchase-payment",
        icon: Wallet,
        actions: ["view"]
      }
    ]
  },
  {
    title: "Gudang, Produksi & Delivery",
    section: true,
    i18nKey: "sidebar.section.gudangOperasional",
    icon: Warehouse,
    children: [
      {
        title: "Stock Opname",
        i18nKey: "sidebar.stockOpname",
        href: "/stock-opname",
        icon: ClipboardList,
        actions: ["add", "view"]
      },
      {
        title: "Stock Adjustment",
        href: "/stock-adjustment",
        icon: Package,
        actions: ["add"]
      },
      {
        title: "Transfer Stok",
        i18nKey: "sidebar.transferStok",
        href: "/stock-transfer",
        icon: ArrowRightLeft,
        actions: ["view", "add", "delete"]
      },
      {
        title: "History Stok",
        i18nKey: "sidebar.historyStok",
        href: "/stock-history",
        icon: FileText,
        actions: ["view"]
      },
      {
        title: "Low Stock",
        i18nKey: "sidebar.lowStock",
        href: "/low-stock",
        icon: TriangleAlert,
        actions: ["view"]
      },
      {
        title: "Production Order",
        i18nKey: "sidebar.productionOrder",
        href: "/production-order",
        icon: Package,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "BOM",
        i18nKey: "sidebar.bom",
        href: "/bom",
        icon: ClipboardList,
        actions: ["add", "view", "delete"]
      },
      {
        title: "Delivery Orders",
        i18nKey: "sidebar.deliveryOrders",
        href: "/delivery-orders",
        icon: Truck,
        actions: ["view", "add", "edit"]
      },
      {
        title: "Driver",
        i18nKey: "sidebar.driver",
        href: "/driver-list",
        icon: Users,
        actions: ["view", "add", "edit", "delete"]
      }
    ]
  },
  {
    title: "Keuangan & Laporan",
    section: true,
    i18nKey: "sidebar.section.keuanganLaporan",
    icon: DollarSign,
    children: [
      {
        title: "Kategori Pengeluaran",
        i18nKey: "sidebar.kategoriPengeluaran",
        href: "/expense-category",
        icon: Tag,
        actions: ["add", "edit", "view", "delete"]
      },
      {
        title: "Daftar Pengeluaran",
        i18nKey: "sidebar.daftarPengeluaran",
        href: "/expense",
        icon: Receipt,
        actions: ["add", "edit", "view", "approve"]
      },
      {
        title: "Pajak",
        i18nKey: "sidebar.pajak",
        href: "/tax-list",
        icon: Percent,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Penjualan",
        i18nKey: "sidebar.penjualan",
        href: "/report/sales",
        icon: TrendingUp,
        actions: ["view", "export"]
      },
      {
        title: "Best Selling",
        i18nKey: "sidebar.produkTerlaris",
        href: "/best-selling",
        icon: BarChart3,
        actions: ["view", "export"]
      },
      {
        title: "Advanced Reporting",
        i18nKey: "sidebar.advancedReporting",
        href: "/advanced-reporting",
        icon: BarChart3,
        actions: ["view"]
      }
    ]
  },
  {
    title: "Pengaturan",
    section: true,
    i18nKey: "sidebar.section.pengaturan",
    icon: Settings,
    children: [
      {
        title: "Metode Pembayaran",
        i18nKey: "sidebar.metodePembayaran",
        href: "/type-payment-list",
        icon: CreditCard,
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        title: "Invoice & Struk",
        i18nKey: "sidebar.invoiceStruk",
        href: "/invoice-page",
        icon: FileText,
        actions: ["add", "edit", "view"]
      },
      {
        title: "Backup & Restore",
        i18nKey: "sidebar.backup",
        href: "/backup",
        icon: Database,
        actions: ["view"]
      },
      {
        title: "Pengaturan Laporan",
        i18nKey: "sidebar.reportSettings",
        href: "/report/settings",
        icon: FileText,
        actions: ["view"]
      }
    ]
  }
];

// Pemetaan sub-grup menu (AccessMenuModal & NavigationModal): key = i18nKey section, lalu href -> nama sub-grup
const accessMenuSubGroups = {
  "sidebar.section.posPenjualan": {
    "/home": "Kasir",
    "/cash-register/current": "Kasir",
    "/cash-register/xz-report": "Kasir",
    "/kitchen-display": "Pesanan & Dapur",
    "/qr-order-management": "Pesanan & Dapur",
    "/queue-list": "Pesanan & Dapur",
    "/waiter-request": "Pesanan & Dapur",
    "/sales-return": "Retur & Piutang",
    "/accounts-receivable": "Retur & Piutang"
  },
  "sidebar.section.location": {
    "/location-list": "Master Data",
    "/price-list-template": "Harga",
    "/table-list": "Meja & Reservasi",
    "/reservation": "Meja & Reservasi"
  },
  "sidebar.section.produkPromo": {
    "/category-list": "Produk",
    "/product-list": "Produk",
    "/price-list-template": "Produk",
    "/bundle": "Promo",
    "/discount-list": "Promo",
    "/promo-list": "Promo"
  },
  "sidebar.section.bahanBakuPembelian": {
    "/supplier-category": "Supplier",
    "/supplier": "Supplier",
    "/supplier-score-list": "Supplier",
    "/ingredient-category": "Bahan Baku",
    "/ingredient": "Bahan Baku",
    "/purchase-order": "Pembelian",
    "/goods-request": "Pembelian",
    "/business-trip": "Pembelian",
    "/goods-receipt": "Pembelian",
    "/purchase-return": "Pembelian",
    "/ap-dashboard": "Pembayaran",
    "/purchase-payment": "Pembayaran"
  },
  "sidebar.section.gudangOperasional": {
    "/stock-opname": "Manajemen Stok",
    "/stock-adjustment": "Manajemen Stok",
    "/stock-transfer": "Manajemen Stok",
    "/stock-history": "Monitoring Stok",
    "/low-stock": "Monitoring Stok",
    "/production-order": "Produksi",
    "/bom": "Produksi",
    "/delivery-orders": "Delivery",
    "/driver-list": "Delivery"
  },
  "sidebar.section.keuanganLaporan": {
    "/expense-category": "Pengeluaran",
    "/expense": "Pengeluaran",
    "/accounting": "Akuntansi & Pajak",
    "/tax-list": "Akuntansi & Pajak",
    "/report/sales": "Laporan Penjualan",
    "/best-selling": "Laporan Penjualan",
    "/report/daily": "Laporan Keuangan",
    "/report/cash-flow": "Laporan Keuangan",
    "/advanced-reporting": "Laporan Keuangan"
  },
  "sidebar.section.membershipSdm": {
    "/member-tier": "Membership",
    "/member-list": "Membership",
    "/department-list": "SDM",
    "/position-list": "SDM",
    "/employee-list": "SDM",
    "/user-list": "SDM",
    "/shift-list": "Shift",
    "/shift-template-list": "Shift",
    "/my-overtime": "Shift",
    "/overtime-approval": "Shift"
  },
  "sidebar.section.pengaturan": {
    "/invoice-page": "Struk & Pembayaran",
    "/type-payment-list": "Struk & Pembayaran",
    "/tax-list": "Struk & Pembayaran",
    "/role-management": "Sistem & Keamanan",
    "/backup": "Sistem & Keamanan",
    "/report/settings": "Struk & Pembayaran"
  }
};

[sidebarMenuSuperAdmin, sidebarMenuAdmin].forEach((menu) => {
  menu.forEach((section) => {
    const mapping = accessMenuSubGroups[section.i18nKey];
    if (!mapping || !Array.isArray(section.children)) return;
    section.children.forEach((child) => {
      if (mapping[child.href]) child.group = mapping[child.href];
    });
  });
});

export const sidebarMenuCashier = [
  {
    title: "Dashboard",
    i18nKey: "sidebar.dashboardCashier",
    href: "/dashboard-user",
    icon: Crown,
    actions: ["view"]
  },
  {
    title: "Cashier",
    i18nKey: "sidebar.cashier",
    href: "/home",
    icon: Calculator,
    actions: ["add", "view"]
  },
  {
    title: "Kasir (Register)",
    i18nKey: "sidebar.cashRegister",
    href: "/cash-register/current",
    icon: DollarSign,
    actions: ["view", "add"]
  },
  {
    title: "Membership",
    i18nKey: "sidebar.membership",
    href: "/member-list",
    icon: BookUser,
    actions: ["view"]
  }
  // ponytail: hidden until implemented — dead link confuses users
  // {
  //   title: "My Shift (Coming Soon)",
  //   i18nKey: "sidebar.myShift",
  //   href: "#",
  //   icon: CalendarDays,
  //   actions: ["view"]
  // }
];

export const sidebarMenuUser = [
  {
    title: "Dashboard",
    i18nKey: "sidebar.dashboardAdmin",
    href: "/dashboard-user",
    icon: Crown,
    children: [],
    actions: ["view"]
  },
  {
    title: "Membership",
    i18nKey: "sidebar.membership",
    href: "/member-list",
    icon: BookUser,
    actions: ["view"]
  },
  {
    title: "Shift Saya",
    i18nKey: "sidebar.myShift",
    href: "/my-shift",
    icon: CalendarDays,
    actions: ["view"]
  },
  {
    title: "Lembur Saya",
    i18nKey: "sidebar.myOvertime",
    href: "/my-overtime",
    icon: AlarmClock,
    actions: ["view"],
    activePaths: ["/overtime-approval"]
  },
  {
    title: "Laporan",
    i18nKey: "sidebar.laporan",
    href: "",
    icon: BarChart3,
    children: [
      {
        title: "Penjualan",
        i18nKey: "sidebar.penjualan",
        href: "/report/sales",
        icon: TrendingUp,
        actions: ["view"]
      },
      {
        title: "Produk Terlaris",
        i18nKey: "sidebar.produkTerlaris",
        href: "/best-selling",
        icon: BarChart3,
        actions: ["view"]
      }
    ],
    actions: []
  }
];

// Sales follow-up pages (returns, receivables, queue, waiter calls) were only
// in the menus above, which feed search and permissions — not in the
// categories the sidebar shows — so they were reachable only through Ctrl+K.
// A new category of their own puts them back in the sidebar.
const salesNavCategory = ({ withTables = false } = {}) => ({
  id: "penjualan",
  icon: ShoppingCart,
  title: "Penjualan",
  i18nKey: "sidebar.section.penjualan",
  sections: [
    {
      title: "Transaksi",
      i18nKey: "sidebar.section.transaksi",
      items: [
        {
          title: "Retur Penjualan",
          i18nKey: "sidebar.salesReturn",
          href: "/sales-return",
          icon: ShoppingCart,
          activePaths: ["/sales-return/create", "/sales-return/detail"]
        },
        {
          title: "Piutang (AR)",
          i18nKey: "sidebar.piutang",
          href: "/accounts-receivable",
          icon: Receipt
        }
      ]
    },
    {
      title: "Layanan",
      i18nKey: "sidebar.section.layanan",
      items: [
        { title: "Antrian", i18nKey: "sidebar.queue", href: "/queue-list", icon: Clock },
        {
          title: "Permintaan Pelayan",
          i18nKey: "sidebar.waiterRequest",
          href: "/waiter-request",
          icon: HandPlatter
        }
      ]
    },
    ...(withTables
      ? [
          {
            title: "Meja & Reservasi",
            i18nKey: "sidebar.section.mejaReservasi",
            items: [
              { title: "Meja", i18nKey: "sidebar.meja", href: "/table-list", icon: Table },
              {
                title: "Reservasi Meja",
                i18nKey: "sidebar.reservation",
                href: "/reservation",
                icon: CalendarDays
              }
            ]
          }
        ]
      : [])
  ]
});

export const navCategories = {
  super_admin: [
    salesNavCategory(),
    {
      id: "location",
      icon: Store,
      title: "Location",
      i18nKey: "sidebar.section.location",
      sections: [
        {
          title: "Master Data",
          i18nKey: "sidebar.section.kelolaToko",
          items: [
            {
              title: "Kelola Toko",
              i18nKey: "sidebar.kelolaToko",
              href: "/location-list",
              icon: Store
            }
          ]
        },
        {
          title: "Harga",
          i18nKey: "sidebar.section.harga",
          items: [
            {
              title: "Harga per Toko",
              i18nKey: "sidebar.pricePerStore",
              href: "/price-list-template",
              icon: BadgePercent
            }
          ]
        },
        {
          title: "Meja & Reservasi",
          i18nKey: "sidebar.section.mejaReservasi",
          items: [
            {
              title: "Meja",
              i18nKey: "sidebar.meja",
              href: "/table-list",
              icon: Table
            },
            {
              title: "Reservasi Meja",
              i18nKey: "sidebar.reservation",
              href: "/reservation",
              icon: CalendarDays
            }
          ]
        }
      ]
    },
    {
      id: "membershipSdm",
      icon: BookUser,
      title: "Membership & SDM",
      i18nKey: "sidebar.section.membershipSdm",
      sections: [
        {
          title: "SDM",
          i18nKey: "sidebar.section.sdm",
          items: [
            {
              title: "Departemen",
              i18nKey: "sidebar.departemen",
              href: "/department-list",
              icon: Building2
            },
            {
              title: "Posisi",
              i18nKey: "sidebar.posisi",
              href: "/position-list",
              icon: FileText
            },
            {
              title: "Daftar Karyawan",
              i18nKey: "sidebar.daftarKaryawan",
              href: "/employee-list",
              icon: Users
            },
            {
              title: "Daftar Pengguna",
              i18nKey: "sidebar.daftarPengguna",
              href: "/user-list",
              icon: Shield
            },
            {
              title: "Perjalanan Dinas",
              i18nKey: "sidebar.businessTrip",
              href: "/business-trip",
              icon: Plane,
              activePaths: ["/business-trip/detail", "/add-business-trip", "/edit-business-trip"],
              actions: ["view", "add", "edit", "delete"]
            }
          ]
        },
        {
          title: "Shift",
          i18nKey: "sidebar.shift",
          items: [
            {
              title: "Template Shift",
              i18nKey: "sidebar.shiftTemplate",
              href: "/shift-template-list",
              icon: Clock
            },
            {
              title: "Shift",
              i18nKey: "sidebar.shift",
              href: "/shift-list",
              icon: CalendarDays
            },
            {
              title: "Shift Saya",
              i18nKey: "sidebar.myShift",
              href: "/my-shift",
              icon: CalendarDays
            }
          ]
        },
        {
          title: "Membership",
          i18nKey: "sidebar.section.membership",
          items: [
            {
              title: "Member Tier",
              i18nKey: "sidebar.memberTier",
              href: "/member-tier",
              icon: Award
            },
            {
              title: "Daftar Member",
              i18nKey: "sidebar.daftarMember",
              href: "/member-list",
              icon: Users
            }
          ]
        }
      ]
    },
    {
      id: "produk",
      icon: ShoppingBag,
      title: "Produk & Promo",
      i18nKey: "sidebar.section.produkPromo",
      sections: [
        {
          title: "Produk",
          i18nKey: "sidebar.section.produkPromo",
          items: [
            { title: "Kategori", i18nKey: "sidebar.kategori", href: "/category-list", icon: Tag },
            {
              title: "Daftar Produk",
              i18nKey: "sidebar.daftarProduk",
              href: "/product-list",
              icon: UtensilsCrossed
            }
          ]
        },
        {
          title: "Promo",
          i18nKey: "sidebar.section.produkPromo",
          items: [
            { title: "Bundle / Combo", i18nKey: "sidebar.bundle", href: "/bundle", icon: Package },
            {
              title: "Diskon",
              i18nKey: "sidebar.diskon",
              href: "/discount-list",
              icon: BadgePercent
            },
            {
              title: "Kampanye Promo",
              i18nKey: "sidebar.promo",
              href: "/promo-list",
              icon: Megaphone
            }
          ]
        }
      ]
    },
    {
      id: "inventory",
      icon: Warehouse,
      title: "Inventory & Pembelian",
      i18nKey: "sidebar.section.bahanBakuPembelian",
      sections: [
        {
          title: "Supplier & Bahan Baku",
          i18nKey: "sidebar.section.bahanBakuPembelian",
          items: [
            {
              title: "Kategori Supplier",
              i18nKey: "sidebar.supplierCategory",
              href: "/supplier-category",
              icon: Tag
            },
            { title: "Supplier", i18nKey: "sidebar.supplier", href: "/supplier", icon: Building2 },
            {
              title: "Supplier Scores",
              i18nKey: "sidebar.supplierPerformance",
              href: "/supplier-score-list",
              icon: TrendingUp
            },
            {
              title: "Kategori Bahan Baku",
              i18nKey: "sidebar.ingredientCategory",
              href: "/ingredient-category",
              icon: Tag
            },
            {
              title: "Bahan Baku",
              i18nKey: "sidebar.bahanBaku",
              href: "/ingredient",
              icon: Package
            },
            {
              title: "Permintaan Barang",
              i18nKey: "sidebar.goodsRequest",
              href: "/goods-request",
              icon: ClipboardList
            },
            {
              title: "Purchase Order",
              i18nKey: "sidebar.purchaseOrder",
              href: "/purchase-order",
              icon: ShoppingCart
            },
            {
              title: "Dashboard Utang (AP)",
              i18nKey: "sidebar.apDashboard",
              href: "/ap-dashboard",
              icon: Wallet
            },
            {
              title: "Riwayat Pembayaran",
              i18nKey: "sidebar.purchasePayment",
              href: "/purchase-payment",
              icon: Wallet
            },
            {
              title: "Goods Receipt",
              i18nKey: "sidebar.goodsReceipt",
              href: "/goods-receipt",
              icon: FileText
            },
            {
              title: "Purchase Return",
              i18nKey: "sidebar.purchaseReturn",
              href: "/purchase-return",
              icon: ShoppingCart
            }
          ]
        },
        {
          title: "Gudang & Produksi",
          i18nKey: "sidebar.section.gudangOperasional",
          items: [
            {
              title: "Stock Opname",
              i18nKey: "sidebar.stockOpname",
              href: "/stock-opname",
              icon: ClipboardList
            },
            { title: "Stock Adjustment", href: "/stock-adjustment", icon: Package },
            {
              title: "Transfer Stok",
              i18nKey: "sidebar.transferStok",
              href: "/stock-transfer",
              icon: ArrowRightLeft
            },
            {
              title: "History Stok",
              i18nKey: "sidebar.historyStok",
              href: "/stock-history",
              icon: FileText
            },
            {
              title: "Low Stock",
              i18nKey: "sidebar.lowStock",
              href: "/low-stock",
              icon: TriangleAlert
            },
            {
              title: "Production Order",
              i18nKey: "sidebar.productionOrder",
              href: "/production-order",
              icon: Package
            },
            { title: "BOM", i18nKey: "sidebar.bom", href: "/bom", icon: ClipboardList },
            {
              title: "Delivery Orders",
              i18nKey: "sidebar.deliveryOrders",
              href: "/delivery-orders",
              icon: Truck
            },
            { title: "Driver", i18nKey: "sidebar.driver", href: "/driver-list", icon: Users }
          ]
        }
      ]
    },
    {
      id: "laporan",
      icon: BarChart3,
      title: "Laporan & SDM",
      i18nKey: "sidebar.section.keuanganLaporan",
      sections: [
        {
          title: "Keuangan",
          i18nKey: "sidebar.section.keuanganLaporan",
          items: [
            {
              title: "Kategori Pengeluaran",
              i18nKey: "sidebar.kategoriPengeluaran",
              href: "/expense-category",
              icon: Tag
            },
            {
              title: "Daftar Pengeluaran",
              i18nKey: "sidebar.daftarPengeluaran",
              href: "/expense",
              icon: Receipt
            },
            {
              title: "Akuntansi",
              i18nKey: "sidebar.accounting",
              href: "/accounting",
              icon: Landmark
            },
            {
              title: "Penjualan",
              i18nKey: "sidebar.penjualan",
              href: "/report/sales",
              icon: TrendingUp
            },
            {
              title: "Produk Terlaris",
              i18nKey: "sidebar.produkTerlaris",
              href: "/best-selling",
              icon: BarChart3
            },
            {
              title: "Laporan Harian",
              i18nKey: "sidebar.laporanHarian",
              href: "/report/daily",
              icon: ClipboardList
            },
            {
              title: "Arus Kas",
              i18nKey: "sidebar.arusKas",
              href: "/report/cash-flow",
              icon: Receipt
            },
            {
              title: "Advanced Reporting",
              i18nKey: "sidebar.advancedReporting",
              href: "/advanced-reporting",
              icon: BarChart3
            }
          ]
        }
      ]
    },
    {
      id: "pengaturan",
      icon: Settings,
      title: "Pengaturan",
      i18nKey: "sidebar.section.pengaturan",
      sections: [
        {
          title: "Pengaturan",
          i18nKey: "sidebar.section.pengaturan",
          items: [
            {
              title: "Invoice & Struk",
              i18nKey: "sidebar.invoiceStruk",
              href: "/invoice-page",
              icon: FileText
            },
            { title: "Pajak", i18nKey: "sidebar.pajak", href: "/tax-list", icon: Percent },
            {
              title: "Metode Pembayaran",
              i18nKey: "sidebar.metodePembayaran",
              href: "/type-payment-list",
              icon: CreditCard
            },
            {
              title: "Manajemen Role & Izin",
              i18nKey: "sidebar.roleManagement",
              href: "/role-management",
              icon: Shield
            },
            {
              title: "Backup & Restore",
              i18nKey: "sidebar.backup",
              href: "/backup",
              icon: Database
            },
            {
              title: "Pengaturan Laporan",
              i18nKey: "sidebar.reportSettings",
              href: "/report/settings",
              icon: FileText
            }
          ]
        }
      ]
    }
  ],
  admin: [
    // Admin has no Location category, so its tables live here too.
    salesNavCategory({ withTables: true }),
    {
      id: "produk",
      icon: ShoppingBag,
      title: "Produk & Promo",
      i18nKey: "sidebar.section.produkPromo",
      sections: [
        {
          title: "Produk & Promo",
          i18nKey: "sidebar.section.produkPromo",
          items: [
            { title: "Kategori", i18nKey: "sidebar.kategori", href: "/category-list", icon: Tag },
            {
              title: "Daftar Produk",
              i18nKey: "sidebar.daftarProduk",
              href: "/product-list",
              icon: UtensilsCrossed
            },
            {
              title: "Harga per Toko",
              i18nKey: "sidebar.pricePerStore",
              href: "/price-list-template",
              icon: BadgePercent
            },
            { title: "Paket / Bundle", i18nKey: "sidebar.bundle", href: "/bundle", icon: Package },
            {
              title: "Diskon & Voucher",
              i18nKey: "sidebar.diskon",
              href: "/discount-list",
              icon: BadgePercent
            },
            {
              title: "Kampanye Promo",
              i18nKey: "sidebar.promo",
              href: "/promo-list",
              icon: Megaphone
            }
          ]
        }
      ]
    },
    {
      id: "inventory",
      icon: Warehouse,
      title: "Inventory & Pembelian",
      i18nKey: "sidebar.section.bahanBakuPembelian",
      sections: [
        {
          title: "Supplier & Bahan Baku",
          i18nKey: "sidebar.section.bahanBakuPembelian",
          items: [
            {
              title: "Kategori Supplier",
              i18nKey: "sidebar.supplierCategory",
              href: "/supplier-category",
              icon: Tag
            },
            { title: "Supplier", i18nKey: "sidebar.supplier", href: "/supplier", icon: Building2 },
            {
              title: "Supplier Scores",
              i18nKey: "sidebar.supplierPerformance",
              href: "/supplier-score-list",
              icon: TrendingUp
            },
            {
              title: "Kategori Bahan Baku",
              i18nKey: "sidebar.ingredientCategory",
              href: "/ingredient-category",
              icon: Tag
            },
            {
              title: "Bahan Baku",
              i18nKey: "sidebar.bahanBaku",
              href: "/ingredient",
              icon: Package
            },
            {
              title: "Permintaan Barang",
              i18nKey: "sidebar.goodsRequest",
              href: "/goods-request",
              icon: ClipboardList
            },
            {
              title: "Perjalanan Dinas",
              i18nKey: "sidebar.businessTrip",
              href: "/business-trip",
              icon: Plane
            },
            {
              title: "Purchase Order",
              i18nKey: "sidebar.purchaseOrder",
              href: "/purchase-order",
              icon: ShoppingCart
            },
            {
              title: "Dashboard Utang (AP)",
              i18nKey: "sidebar.apDashboard",
              href: "/ap-dashboard",
              icon: Wallet
            },
            {
              title: "Riwayat Pembayaran",
              i18nKey: "sidebar.purchasePayment",
              href: "/purchase-payment",
              icon: Wallet
            },
            {
              title: "Goods Receipt",
              i18nKey: "sidebar.goodsReceipt",
              href: "/goods-receipt",
              icon: FileText
            },
            {
              title: "Purchase Return",
              i18nKey: "sidebar.purchaseReturn",
              href: "/purchase-return",
              icon: ShoppingCart
            }
          ]
        },
        {
          title: "Gudang & Produksi",
          i18nKey: "sidebar.section.gudangOperasional",
          items: [
            {
              title: "Stock Opname",
              i18nKey: "sidebar.stockOpname",
              href: "/stock-opname",
              icon: ClipboardList
            },
            { title: "Stock Adjustment", href: "/stock-adjustment", icon: Package },
            {
              title: "Transfer Stok",
              i18nKey: "sidebar.transferStok",
              href: "/stock-transfer",
              icon: ArrowRightLeft
            },
            {
              title: "History Stok",
              i18nKey: "sidebar.historyStok",
              href: "/stock-history",
              icon: FileText
            },
            {
              title: "Low Stock",
              i18nKey: "sidebar.lowStock",
              href: "/low-stock",
              icon: TriangleAlert
            },
            {
              title: "Production Order",
              i18nKey: "sidebar.productionOrder",
              href: "/production-order",
              icon: Package
            },
            { title: "BOM", i18nKey: "sidebar.bom", href: "/bom", icon: ClipboardList },
            {
              title: "Delivery Orders",
              i18nKey: "sidebar.deliveryOrders",
              href: "/delivery-orders",
              icon: Truck
            },
            { title: "Driver", i18nKey: "sidebar.driver", href: "/driver-list", icon: Users }
          ]
        }
      ]
    },
    {
      id: "laporan",
      icon: BarChart3,
      title: "Laporan & SDM",
      i18nKey: "sidebar.section.keuanganLaporan",
      sections: [
        {
          title: "Keuangan",
          i18nKey: "sidebar.section.keuanganLaporan",
          items: [
            {
              title: "Kategori Pengeluaran",
              i18nKey: "sidebar.kategoriPengeluaran",
              href: "/expense-category",
              icon: Tag
            },
            {
              title: "Daftar Pengeluaran",
              i18nKey: "sidebar.daftarPengeluaran",
              href: "/expense",
              icon: Receipt
            },
            { title: "Pajak", i18nKey: "sidebar.pajak", href: "/tax-list", icon: Percent },
            {
              title: "Penjualan",
              i18nKey: "sidebar.penjualan",
              href: "/report/sales",
              icon: TrendingUp
            },
            {
              title: "Best Selling",
              i18nKey: "sidebar.produkTerlaris",
              href: "/best-selling",
              icon: BarChart3
            },
            {
              title: "Advanced Reporting",
              i18nKey: "sidebar.advancedReporting",
              href: "/advanced-reporting",
              icon: BarChart3
            }
          ]
        }
      ]
    },
    {
      id: "membershipSdm",
      icon: BookUser,
      title: "Membership & SDM",
      i18nKey: "sidebar.section.membershipSdm",
      sections: [
        {
          title: "Membership",
          i18nKey: "sidebar.section.membership",
          items: [
            {
              title: "Member Tier",
              i18nKey: "sidebar.memberTier",
              href: "/member-tier",
              icon: Award
            },
            {
              title: "Daftar Member",
              i18nKey: "sidebar.daftarMember",
              href: "/member-list",
              icon: Users
            }
          ]
        },
        {
          title: "Organisasi",
          i18nKey: "sidebar.section.sdm",
          items: [
            {
              title: "Departemen",
              i18nKey: "sidebar.departemen",
              href: "/department-list",
              icon: Building2
            },
            {
              title: "Posisi",
              i18nKey: "sidebar.posisi",
              href: "/position-list",
              icon: FileText
            }
          ]
        },
        {
          title: "Karyawan & Shift",
          i18nKey: "sidebar.section.sdm",
          items: [
            {
              title: "Daftar Karyawan",
              i18nKey: "sidebar.daftarKaryawan",
              href: "/employee-list",
              icon: Users
            },
            {
              title: "Shift",
              i18nKey: "sidebar.shift",
              href: "/shift-list",
              icon: CalendarDays
            },
            {
              title: "Shift Saya",
              i18nKey: "sidebar.myShift",
              href: "/my-shift",
              icon: CalendarDays
            },
            {
              title: "Lembur Saya",
              i18nKey: "sidebar.myOvertime",
              href: "/my-overtime",
              icon: AlarmClock
            }
          ]
        }
      ]
    },
    {
      id: "pengaturan",
      icon: Settings,
      title: "Pengaturan",
      i18nKey: "sidebar.section.pengaturan",
      sections: [
        {
          title: "Pengaturan",
          i18nKey: "sidebar.section.pengaturan",
          items: [
            {
              title: "Metode Pembayaran",
              i18nKey: "sidebar.metodePembayaran",
              href: "/type-payment-list",
              icon: CreditCard
            },
            {
              title: "Invoice & Struk",
              i18nKey: "sidebar.invoiceStruk",
              href: "/invoice-page",
              icon: FileText
            },
            {
              title: "Backup & Restore",
              i18nKey: "sidebar.backup",
              href: "/backup",
              icon: Database
            },
            {
              title: "Pengaturan Laporan",
              i18nKey: "sidebar.reportSettings",
              href: "/report/settings",
              icon: FileText
            }
          ]
        }
      ]
    }
  ]
};

// Terapkan sub-grup juga ke navCategories (dipakai NavigationModal)
[navCategories.super_admin, navCategories.admin].forEach((cats) => {
  (cats || []).forEach((cat) => {
    (cat.sections || []).forEach((section) => {
      const mapping = accessMenuSubGroups[section.i18nKey];
      if (!mapping || !Array.isArray(section.items)) return;
      section.items.forEach((item) => {
        if (mapping[item.href]) item.group = mapping[item.href];
      });
    });
  });
});
