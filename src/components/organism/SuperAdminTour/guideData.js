import {
  Calculator,
  DollarSign,
  Store,
  Package,
  Tag,
  UtensilsCrossed,
  BookUser,
  Award,
  Users,
  FileText,
  CalendarDays,
  ClipboardList,
  TriangleAlert,
  ChefHat,
  ShoppingCart,
  ArrowRightLeft,
  TrendingUp,
  BarChart3,
  Receipt,
  Percent,
  CreditCard,
  Shield,
  BadgePercent,
  Table,
  Settings,
  Eye,
  HelpCircle,
  Truck,
  Plus,
  Network,
  Briefcase,
  LayoutDashboard,
  User,
  LogIn,
  UserPlus,
  KeyRound,
  LayoutGrid,
  Monitor,
  BellDot,
  UserCog,
  MapPinned
} from "lucide-react";
import { isPublicRegistrationEnabled } from "@/utils/publicRegistration";

const guideData = [
  {
    id: "auth",
    titleKey: "sidebar.auth",
    icon: LogIn,
    pages: [
      {
        path: "/login",
        icon: LogIn,
        titleKey: "sidebar.login",
        descKey: "guide.auth.login.s1desc",
        actions: ["view"]
      },
      // D-08: shown only while public sign-up is open.
      ...(isPublicRegistrationEnabled()
        ? [
            {
              path: "/register",
              icon: UserPlus,
              titleKey: "sidebar.register",
              descKey: "guide.auth.register.s1desc",
              actions: ["add"]
            }
          ]
        : []),
      {
        path: "/reset-password",
        icon: KeyRound,
        titleKey: "sidebar.resetPassword",
        descKey: "guide.auth.reset.s1desc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "dashboard",
    titleKey: "sidebar.dashboardSuperAdmin",
    icon: LayoutDashboard,
    pages: [
      {
        path: "/dashboard-super-admin",
        icon: LayoutDashboard,
        titleKey: "sidebar.dashboardSuperAdmin",
        descKey: "guide.dashboard.s8desc",
        actions: ["view"]
      },
      {
        path: "/dashboard-admin",
        icon: LayoutGrid,
        titleKey: "sidebar.dashboardAdmin",
        descKey: "guide.dashboard.s8desc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "cashier",
    titleKey: "sidebar.cashier",
    icon: Calculator,
    pages: [
      {
        path: "/home",
        icon: Calculator,
        titleKey: "sidebar.cashier",
        descKey: "guide.page.cashier.desc",
        actions: ["view", "add"]
      },
      {
        path: "/cash-register/current",
        icon: DollarSign,
        titleKey: "sidebar.cashRegister",
        descKey: "guide.page.cashRegister.desc",
        actions: ["view", "add"]
      },
      {
        path: "/cash-register/open-close",
        icon: DollarSign,
        titleKey: "sidebar.cashRegister.openClose",
        descKey: "guide.page.cashRegister.openClose.desc",
        actions: ["add"]
      },
      {
        path: "/cash-register/history",
        icon: FileText,
        titleKey: "sidebar.cashRegister.history",
        descKey: "guide.page.cashRegister.history.desc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "location",
    titleKey: "sidebar.kelolaToko",
    icon: Store,
    pages: [
      {
        path: "/location-list",
        icon: Store,
        titleKey: "sidebar.kelolaToko",
        descKey: "guide.location.s11adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-location",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addLocation.title",
        parentPath: "/location-list",
        actions: ["add"]
      },
      {
        path: "/edit-location",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/location-list",
        descKey: "guide.addLocation.title",
        actions: ["edit"]
      },
      {
        path: "/detail-location",
        icon: MapPinned,
        titleKey: "breadcrumb.detail",
        parentPath: "/location-list",
        descKey: "guide.addLocation.title",
        actions: ["view"]
      },
      {
        path: "/store-geospatial",
        icon: MapPinned,
        titleKey: "sidebar.storeGeospatial",
        descKey: "guide.page.storeGeospatial.desc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "product",
    titleKey: "sidebar.produk",
    icon: Package,
    pages: [
      {
        path: "/category-list",
        icon: Tag,
        titleKey: "sidebar.kategori",
        descKey: "guide.category.s12adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-category",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addCategory.title",
        parentPath: "/category-list",
        actions: ["add"]
      },
      {
        path: "/edit-category",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/category-list",
        descKey: "guide.addCategory.title",
        actions: ["edit"]
      },
      {
        path: "/detail-category",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/category-list",
        descKey: "guide.addCategory.title",
        actions: ["view"]
      },
      {
        path: "/product-list",
        icon: UtensilsCrossed,
        titleKey: "sidebar.daftarProduk",
        descKey: "guide.product.s14adesc",
        actions: ["add", "edit", "view", "delete", "import", "export"]
      },
      {
        path: "/add-product",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addProduct.title",
        parentPath: "/product-list",
        actions: ["add"]
      },
      {
        path: "/edit-product",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/product-list",
        descKey: "guide.addProduct.title",
        actions: ["edit"]
      }
    ]
  },
  {
    id: "procurement",
    titleKey: "sidebar.pengadaan",
    icon: ShoppingCart,
    pages: [
      {
        path: "/supplier",
        icon: Truck,
        titleKey: "sidebar.supplier",
        descKey: "guide.supplier.s13adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-supplier",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addSupplier.title",
        parentPath: "/supplier",
        actions: ["add"]
      },
      {
        path: "/edit-supplier",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/supplier",
        descKey: "guide.addSupplier.title",
        actions: ["edit"]
      },
      {
        path: "/ingredient",
        icon: Package,
        titleKey: "sidebar.bahanBaku",
        descKey: "guide.page.ingredient.desc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-ingredient",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/ingredient",
        descKey: "guide.addIngredient.title",
        actions: ["add"]
      },
      {
        path: "/edit-ingredient",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/ingredient",
        descKey: "guide.addIngredient.title",
        actions: ["edit"]
      },
      {
        path: "/purchase-order",
        icon: ShoppingCart,
        titleKey: "sidebar.purchaseOrder",
        descKey: "guide.page.purchaseOrder.desc",
        actions: ["add", "edit", "view"]
      },
      {
        path: "/add-purchase-order",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/purchase-order",
        descKey: "guide.page.addPurchaseOrder.desc",
        actions: ["add"]
      }
    ]
  },
  {
    id: "customer",
    titleKey: "sidebar.pelanggan",
    icon: BookUser,
    pages: [
      {
        path: "/member-tier",
        icon: Award,
        titleKey: "sidebar.memberTier",
        descKey: "guide.tier.s23adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-member-tier",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addMemberTier.title",
        parentPath: "/member-tier",
        actions: ["add"]
      },
      {
        path: "/detail-member-tier",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/member-tier",
        descKey: "guide.addMemberTier.title",
        actions: ["view"]
      },
      {
        path: "/member-list",
        icon: BookUser,
        titleKey: "sidebar.daftarMember",
        descKey: "guide.member.s15adesc",
        actions: ["add", "edit", "view"]
      },
      {
        path: "/add-member",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addMember.title",
        parentPath: "/member-list",
        actions: ["add"]
      },
      {
        path: "/edit-member",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/member-list",
        descKey: "guide.addMember.title",
        actions: ["edit"]
      }
    ]
  },
  {
    id: "employee",
    titleKey: "sidebar.karyawan",
    icon: Users,
    pages: [
      {
        path: "/department-list",
        icon: Network,
        titleKey: "sidebar.departemen",
        descKey: "guide.department.s17adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-department",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addDepartment.title",
        parentPath: "/department-list",
        actions: ["add"]
      },
      {
        path: "/edit-department",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/department-list",
        descKey: "guide.addDepartment.title",
        actions: ["edit"]
      },
      {
        path: "/detail-department",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/department-list",
        descKey: "guide.addDepartment.title",
        actions: ["view"]
      },
      {
        path: "/position-list",
        icon: Briefcase,
        titleKey: "sidebar.posisi",
        descKey: "guide.position.s18adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-position",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addPosition.title",
        parentPath: "/position-list",
        actions: ["add"]
      },
      {
        path: "/edit-position",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/position-list",
        descKey: "guide.addPosition.title",
        actions: ["edit"]
      },
      {
        path: "/detail-position",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/position-list",
        descKey: "guide.addPosition.title",
        actions: ["view"]
      },
      {
        path: "/employee-list",
        icon: Users,
        titleKey: "sidebar.daftarKaryawan",
        descKey: "guide.employee.s16adesc",
        actions: ["add", "view", "edit-access"]
      },
      {
        path: "/add-employee",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addEmployee.title",
        parentPath: "/employee-list",
        actions: ["add"]
      },
      {
        path: "/edit-employee",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/employee-list",
        descKey: "guide.addEmployee.title",
        actions: ["edit"]
      },
      {
        path: "/detail-employee",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/employee-list",
        descKey: "guide.addEmployee.title",
        actions: ["view"]
      },
      {
        path: "/shift-list",
        icon: CalendarDays,
        titleKey: "sidebar.shift",
        descKey: "guide.shift.s26adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-shift",
        icon: Plus,
        titleKey: "breadcrumb.add",
        descKey: "guide.addShift.title",
        parentPath: "/shift-list",
        actions: ["add"]
      },
      {
        path: "/edit-shift",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/shift-list",
        descKey: "guide.addShift.title",
        actions: ["edit"]
      }
    ]
  },
  {
    id: "transaction",
    titleKey: "sidebar.transaksi",
    icon: CreditCard,
    pages: [
      {
        path: "/discount-list",
        icon: Percent,
        titleKey: "sidebar.diskon",
        descKey: "guide.page.discount.desc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-discount",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/discount-list",
        descKey: "guide.page.addDiscount.desc",
        actions: ["add"]
      },
      {
        path: "/edit-discount",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/discount-list",
        descKey: "guide.page.addDiscount.desc",
        actions: ["edit"]
      },
      {
        path: "/type-payment-list",
        icon: CreditCard,
        titleKey: "sidebar.metodePembayaran",
        descKey: "guide.payment.s26bdesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-type-payment",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/type-payment-list",
        descKey: "guide.addTypePayment.title",
        actions: ["add"]
      },
      {
        path: "/edit-type-payment",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/type-payment-list",
        descKey: "guide.addTypePayment.title",
        actions: ["edit"]
      }
    ]
  },
  {
    id: "stockManagement",
    titleKey: "sidebar.manajemenStok",
    icon: ClipboardList,
    pages: [
      {
        path: "/stock-opname",
        icon: ClipboardList,
        titleKey: "sidebar.stockOpname",
        descKey: "guide.stock.s27adesc",
        actions: ["add", "view"]
      },
      {
        path: "/add-stock-opname",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/stock-opname",
        descKey: "guide.addStockOpname.title",
        actions: ["add"]
      },
      {
        path: "/stock-opname/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/stock-opname",
        descKey: "guide.addStockOpname.title",
        actions: ["view"]
      },
      {
        path: "/stock-history",
        icon: FileText,
        titleKey: "sidebar.historyStok",
        descKey: "guide.stock.s27bdesc",
        actions: ["view"]
      },
      {
        path: "/low-stock",
        icon: TriangleAlert,
        titleKey: "sidebar.lowStock",
        descKey: "guide.stock.s27cdesc",
        actions: ["view"]
      },
      {
        path: "/low-stock-all",
        icon: TriangleAlert,
        titleKey: "sidebar.lowStockAll",
        descKey: "guide.stock.s27cdesc",
        actions: ["view"]
      },
      {
        path: "/kitchen-display",
        icon: ChefHat,
        titleKey: "sidebar.kitchenDisplay",
        descKey: "guide.page.kitchenDisplay.desc",
        actions: ["view"]
      },
      {
        path: "/production-order",
        icon: Package,
        titleKey: "sidebar.productionOrder",
        descKey: "guide.page.productionOrder.desc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-production-order",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/production-order",
        descKey: "guide.page.addProductionOrder.desc",
        actions: ["add"]
      },
      {
        path: "/production-order/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/production-order",
        descKey: "guide.page.addProductionOrder.desc",
        actions: ["view"]
      },
      {
        path: "/bom",
        icon: ClipboardList,
        titleKey: "sidebar.bom",
        descKey: "guide.page.bom.desc",
        actions: ["add", "view", "delete"]
      },
      {
        path: "/bom/add",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/bom",
        descKey: "guide.page.addBom.desc",
        actions: ["add"]
      },
      {
        path: "/bom/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/bom",
        descKey: "guide.page.addBom.desc",
        actions: ["view"]
      },
      {
        path: "/goods-receipt",
        icon: FileText,
        titleKey: "sidebar.goodsReceipt",
        descKey: "guide.page.goodsReceipt.desc",
        actions: ["add", "view", "delete"]
      },
      {
        path: "/add-goods-receipt",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/goods-receipt",
        descKey: "guide.page.addGoodsReceipt.desc",
        actions: ["add"]
      },
      {
        path: "/goods-receipt/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/goods-receipt",
        descKey: "guide.page.addGoodsReceipt.desc",
        actions: ["view"]
      },
      {
        path: "/sales-return",
        icon: ShoppingCart,
        titleKey: "sidebar.salesReturn",
        descKey: "guide.page.salesReturn.desc",
        actions: ["view"]
      },
      {
        path: "/sales-return/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/sales-return",
        descKey: "guide.page.salesReturn.desc",
        actions: ["view"]
      },
      {
        path: "/purchase-return",
        icon: ShoppingCart,
        titleKey: "sidebar.purchaseReturn",
        descKey: "guide.page.purchaseReturn.desc",
        actions: ["view"]
      },
      {
        path: "/purchase-return/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/purchase-return",
        descKey: "guide.page.purchaseReturn.desc",
        actions: ["view"]
      },
      {
        path: "/stock-transfer",
        icon: ArrowRightLeft,
        titleKey: "sidebar.transferStok",
        descKey: "guide.page.stockTransfer.desc",
        actions: ["view", "add", "delete"]
      },
      {
        path: "/add-stock-transfer",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/stock-transfer",
        descKey: "guide.page.addStockTransfer.desc",
        actions: ["add"]
      },
      {
        path: "/stock-transfer/detail",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/stock-transfer",
        descKey: "guide.page.addStockTransfer.desc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "expense",
    titleKey: "sidebar.pengeluaran",
    icon: Receipt,
    pages: [
      {
        path: "/expense-category",
        icon: Tag,
        titleKey: "sidebar.kategoriPengeluaran",
        descKey: "guide.page.expenseCategory.desc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-expense-category",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/expense-category",
        descKey: "guide.page.expenseCategory.desc",
        actions: ["add"]
      },
      {
        path: "/edit-expense-category",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/expense-category",
        descKey: "guide.page.expenseCategory.desc",
        actions: ["edit"]
      },
      {
        path: "/tax-list",
        icon: Percent,
        titleKey: "sidebar.pajak",
        descKey: "guide.tax.s20adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-tax",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/tax-list",
        descKey: "guide.addTax.title",
        actions: ["add"]
      },
      {
        path: "/edit-tax",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/tax-list",
        descKey: "guide.addTax.title",
        actions: ["edit"]
      },
      {
        path: "/expense",
        icon: Receipt,
        titleKey: "sidebar.daftarPengeluaran",
        descKey: "guide.page.expense.desc",
        actions: ["add", "edit", "view", "approve"]
      },
      {
        path: "/add-expense",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/expense",
        descKey: "guide.page.expense.desc",
        actions: ["add"]
      },
      {
        path: "/edit-expense",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/expense",
        descKey: "guide.page.expense.desc",
        actions: ["edit"]
      }
    ]
  },
  {
    id: "report",
    titleKey: "sidebar.laporan",
    icon: BarChart3,
    pages: [
      {
        path: "/report/sales",
        icon: TrendingUp,
        titleKey: "sidebar.penjualan",
        descKey: "guide.sales.s28adesc",
        actions: ["view", "export"]
      },
      {
        path: "/best-selling",
        icon: BarChart3,
        titleKey: "sidebar.produkTerlaris",
        descKey: "guide.bestselling.s28bdesc",
        actions: ["view", "export"]
      },
      {
        path: "/report/daily",
        icon: ClipboardList,
        titleKey: "sidebar.laporanHarian",
        descKey: "guide.dailyReport.s25adesc",
        actions: ["view"]
      },
      {
        path: "/report/cash-flow",
        icon: Receipt,
        titleKey: "sidebar.arusKas",
        descKey: "guide.cashflow.s25cdesc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "settings",
    titleKey: "sidebar.pengaturan",
    icon: Settings,
    pages: [
      {
        path: "/invoice-page",
        icon: FileText,
        titleKey: "sidebar.invoiceStruk",
        descKey: "guide.settings.s19adesc",
        actions: ["add", "edit", "view"]
      },
      {
        path: "/role-management",
        icon: Shield,
        titleKey: "sidebar.roleManagement",
        descKey: "guide.role.s22adesc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-role",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/role-management",
        descKey: "guide.page.addRole.desc",
        actions: ["add"]
      },
      {
        path: "/edit-role/:id",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/role-management",
        descKey: "guide.page.addRole.desc",
        actions: ["edit"]
      },
      {
        path: "/detail-role/:id",
        icon: Eye,
        titleKey: "breadcrumb.detail",
        parentPath: "/role-management",
        descKey: "guide.page.addRole.desc",
        actions: ["view"]
      },
      {
        path: "/price-list-template",
        icon: BadgePercent,
        titleKey: "sidebar.pricePerStore",
        descKey: "guide.page.pricePerStore.desc",
        actions: ["view", "edit"]
      },
      {
        path: "/table-list",
        icon: Table,
        titleKey: "sidebar.meja",
        descKey: "guide.page.table.desc",
        actions: ["add", "edit", "view", "delete", "update-status"]
      },
      {
        path: "/reservation",
        icon: CalendarDays,
        titleKey: "sidebar.reservation",
        descKey: "guide.page.reservation.desc",
        actions: ["add", "edit", "view", "delete"]
      },
      {
        path: "/add-reservation",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/reservation",
        descKey: "guide.page.reservation.desc",
        actions: ["add"]
      },
      {
        path: "/edit-reservation",
        icon: Settings,
        titleKey: "breadcrumb.edit",
        parentPath: "/reservation",
        descKey: "guide.page.reservation.desc",
        actions: ["edit"]
      }
    ]
  },
  {
    id: "userAccount",
    titleKey: "sidebar.akun",
    icon: User,
    pages: [
      {
        path: "/user-list",
        icon: Users,
        titleKey: "sidebar.adminList",
        descKey: "guide.page.adminList.desc",
        actions: ["add", "view"]
      },
      {
        path: "/add-user",
        icon: Plus,
        titleKey: "breadcrumb.add",
        parentPath: "/user-list",
        descKey: "guide.page.addAdmin.desc",
        actions: ["add"]
      },
      {
        path: "/profile",
        icon: UserCog,
        titleKey: "sidebar.profile",
        descKey: "guide.page.profile.desc",
        actions: ["view", "edit"]
      },
      {
        path: "/notification",
        icon: BellDot,
        titleKey: "sidebar.notification",
        descKey: "guide.page.notification.desc",
        actions: ["view"]
      }
    ]
  },
  {
    id: "other",
    titleKey: "sidebar.lainnya",
    icon: Monitor,
    pages: [
      {
        path: "/customer-display",
        icon: Monitor,
        titleKey: "sidebar.customerDisplay",
        descKey: "guide.page.customerDisplay.desc",
        actions: ["view"]
      },
      {
        path: "/support",
        icon: HelpCircle,
        titleKey: "guide.support.s24a",
        descKey: "guide.support.s24adesc",
        actions: ["view"]
      }
    ]
  }
];

export default guideData;
