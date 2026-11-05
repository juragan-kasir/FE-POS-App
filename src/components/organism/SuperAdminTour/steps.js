import {
  Rocket,
  Search,
  Languages,
  Sun,
  LifeBuoy,
  Bell,
  User,
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Store,
  FolderTree,
  Truck,
  Package,
  Award,
  Users,
  BarChart3,
  List,
  Plus,
  Download,
  Upload,
  CheckCircle2,
  Briefcase,
  Network,
  Settings,
  Image,
  MapPin,
  FileText,
  Save,
  Eye,
  Percent,
  Tag,
  Shield,
  HelpCircle,
  Mail,
  Phone,
  MessageCircle,
  BookOpen,
  ClipboardList,
  Receipt,
  CalendarDays,
  CreditCard,
  LogIn,
  UserPlus,
  KeyRound,
  Calculator,
  DollarSign,
  ChefHat,
  ArrowRightLeft,
  BadgePercent,
  Table,
  Monitor,
  BellDot,
  MapPinned
} from "lucide-react";
import { isPublicRegistrationEnabled } from "@/utils/publicRegistration";

export const superAdminSteps = [
  // ── Header (always visible from any page) ──
  {
    id: "welcome",
    page: null,
    icon: Rocket,
    titleKey: "guide.dashboard.s1",
    descKey: "guide.dashboard.s1desc",
    actionKey: "guide.dashboard.start"
  },
  {
    id: "header-search",
    page: null,
    target: '[data-tour="header-search"]',
    icon: Search,
    titleKey: "guide.dashboard.s2",
    descKey: "guide.dashboard.s2desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "header-translation",
    page: null,
    target: '[data-tour="header-translation"]',
    icon: Languages,
    titleKey: "guide.dashboard.s3",
    descKey: "guide.dashboard.s3desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "header-theme",
    page: null,
    target: '[data-tour="header-theme"]',
    icon: Sun,
    titleKey: "guide.dashboard.s4",
    descKey: "guide.dashboard.s4desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "header-tour",
    page: null,
    target: '[data-tour="header-tour"]',
    icon: LifeBuoy,
    titleKey: "guide.dashboard.s5",
    descKey: "guide.dashboard.s5desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "header-notification",
    page: null,
    target: '[data-tour="header-notification"]',
    icon: Bell,
    titleKey: "guide.dashboard.s6",
    descKey: "guide.dashboard.s6desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "header-user",
    page: null,
    target: '[data-tour="header-user"]',
    icon: User,
    titleKey: "guide.dashboard.s7",
    descKey: "guide.dashboard.s7desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Dashboard ──
  {
    id: "dashboard-stats",
    page: "/dashboard-super-admin",
    target: '[data-tour="dashboard-stats"]',
    icon: LayoutDashboard,
    titleKey: "guide.dashboard.s8",
    descKey: "guide.dashboard.s8desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "dashboard-chart",
    page: "/dashboard-super-admin",
    target: '[data-tour="dashboard-chart"]',
    icon: TrendingUp,
    titleKey: "guide.dashboard.s9",
    descKey: "guide.dashboard.s9desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "dashboard-orders",
    page: "/dashboard-super-admin",
    target: '[data-tour="dashboard-orders"]',
    icon: ShoppingCart,
    titleKey: "guide.dashboard.s10",
    descKey: "guide.dashboard.s10desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Kasir / POS ──
  {
    id: "cashier",
    page: "/home",
    icon: Calculator,
    titleKey: "sidebar.cashier",
    descKey: "guide.page.cashier.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Cash Register ──
  {
    id: "cash-register",
    page: "/cash-register/current",
    icon: DollarSign,
    titleKey: "sidebar.cashRegister",
    descKey: "guide.page.cashRegister.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Kelola Toko ──
  {
    id: "location-intro",
    page: "/location-list",
    icon: Store,
    titleKey: "guide.location.s11a",
    descKey: "guide.location.s11adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "location-stat-total",
    page: "/location-list",
    target: '[data-tour="location-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.location.s11b",
    descKey: "guide.location.s11bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "location-stat-active",
    page: "/location-list",
    target: '[data-tour="location-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.location.s11c",
    descKey: "guide.location.s11cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "location-stat-inactive",
    page: "/location-list",
    target: '[data-tour="location-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.location.s11d",
    descKey: "guide.location.s11ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "location-stat-cities",
    page: "/location-list",
    target: '[data-tour="location-stat-cities"]',
    icon: BarChart3,
    titleKey: "guide.location.s11e",
    descKey: "guide.location.s11edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "location-add",
    page: "/location-list",
    target: '[data-tour="location-add"]',
    icon: Plus,
    titleKey: "guide.location.s11f",
    descKey: "guide.location.s11fdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "location-table",
    page: "/location-list",
    target: '[data-tour="location-table"]',
    icon: List,
    titleKey: "guide.location.s11g",
    descKey: "guide.location.s11gdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Kategori ──
  {
    id: "category-intro",
    page: "/category-list",
    icon: FolderTree,
    titleKey: "guide.category.s12a",
    descKey: "guide.category.s12adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "category-stat-total",
    page: "/category-list",
    target: '[data-tour="category-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.category.s12b",
    descKey: "guide.category.s12bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "category-stat-active",
    page: "/category-list",
    target: '[data-tour="category-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.category.s12c",
    descKey: "guide.category.s12cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "category-stat-inactive",
    page: "/category-list",
    target: '[data-tour="category-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.category.s12d",
    descKey: "guide.category.s12ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "category-add",
    page: "/category-list",
    target: '[data-tour="category-add"]',
    icon: Plus,
    titleKey: "guide.category.s12h",
    descKey: "guide.category.s12hdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "category-table",
    page: "/category-list",
    target: '[data-tour="category-table"]',
    icon: List,
    titleKey: "guide.category.s12i",
    descKey: "guide.category.s12idesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Produk ──
  {
    id: "product-intro",
    page: "/product-list",
    icon: Package,
    titleKey: "guide.product.s14a",
    descKey: "guide.product.s14adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "product-import",
    page: "/product-list",
    target: '[data-tour="product-import"]',
    icon: Upload,
    titleKey: "guide.product.s14b",
    descKey: "guide.product.s14bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "product-export",
    page: "/product-list",
    target: '[data-tour="product-export"]',
    icon: Download,
    titleKey: "guide.product.s14c",
    descKey: "guide.product.s14cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "product-add",
    page: "/product-list",
    target: '[data-tour="product-add"]',
    icon: Plus,
    titleKey: "guide.product.s14d",
    descKey: "guide.product.s14ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "product-search",
    page: "/product-list",
    target: '[data-tour="product-search"]',
    icon: Search,
    titleKey: "guide.product.s14e",
    descKey: "guide.product.s14edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "product-table",
    page: "/product-list",
    target: '[data-tour="product-table"]',
    icon: List,
    titleKey: "guide.product.s14f",
    descKey: "guide.product.s14fdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Supplier ──
  {
    id: "supplier-intro",
    page: "/supplier",
    icon: Truck,
    titleKey: "guide.supplier.s13a",
    descKey: "guide.supplier.s13adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "supplier-stat-total",
    page: "/supplier",
    target: '[data-tour="supplier-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.supplier.s13b",
    descKey: "guide.supplier.s13bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "supplier-stat-active",
    page: "/supplier",
    target: '[data-tour="supplier-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.supplier.s13c",
    descKey: "guide.supplier.s13cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "supplier-stat-inactive",
    page: "/supplier",
    target: '[data-tour="supplier-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.supplier.s13d",
    descKey: "guide.supplier.s13ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "supplier-add",
    page: "/supplier",
    target: '[data-tour="supplier-add"]',
    icon: Plus,
    titleKey: "guide.supplier.s13e",
    descKey: "guide.supplier.s13edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "supplier-search",
    page: "/supplier",
    target: '[data-tour="supplier-search"]',
    icon: Search,
    titleKey: "guide.supplier.s13f",
    descKey: "guide.supplier.s13fdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "supplier-table",
    page: "/supplier",
    target: '[data-tour="supplier-table"]',
    icon: List,
    titleKey: "guide.supplier.s13g",
    descKey: "guide.supplier.s13gdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Bahan Baku ──
  {
    id: "ingredient-intro",
    page: "/ingredient",
    icon: Package,
    titleKey: "sidebar.bahanBaku",
    descKey: "guide.page.ingredient.desc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "ingredient-stat-total",
    page: "/ingredient",
    target: '[data-tour="ingredient-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.ingredient.s14a",
    descKey: "guide.ingredient.s14adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "ingredient-stat-active",
    page: "/ingredient",
    target: '[data-tour="ingredient-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.ingredient.s14b",
    descKey: "guide.ingredient.s14bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "ingredient-stat-low",
    page: "/ingredient",
    target: '[data-tour="ingredient-stat-low"]',
    icon: BarChart3,
    titleKey: "guide.ingredient.s14c",
    descKey: "guide.ingredient.s14cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "ingredient-add",
    page: "/ingredient",
    target: '[data-tour="ingredient-add"]',
    icon: Plus,
    titleKey: "guide.ingredient.s14d",
    descKey: "guide.ingredient.s14ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "ingredient-search",
    page: "/ingredient",
    target: '[data-tour="ingredient-search"]',
    icon: Search,
    titleKey: "guide.ingredient.s14e",
    descKey: "guide.ingredient.s14edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "ingredient-table",
    page: "/ingredient",
    target: '[data-tour="ingredient-table"]',
    icon: List,
    titleKey: "guide.ingredient.s14f",
    descKey: "guide.ingredient.s14fdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Purchase Order ──
  {
    id: "purchase-order",
    page: "/purchase-order",
    icon: ShoppingCart,
    titleKey: "sidebar.purchaseOrder",
    descKey: "guide.page.purchaseOrder.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Pelanggan ──
  // ── Member Tier ──
  {
    id: "tier-intro",
    page: "/member-tier",
    icon: Award,
    titleKey: "guide.tier.s23a",
    descKey: "guide.tier.s23adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tier-stat-active",
    page: "/member-tier",
    target: '[data-tour="tier-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.tier.s23b",
    descKey: "guide.tier.s23bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tier-stat-members",
    page: "/member-tier",
    target: '[data-tour="tier-stat-members"]',
    icon: BarChart3,
    titleKey: "guide.tier.s23c",
    descKey: "guide.tier.s23cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tier-stat-growth",
    page: "/member-tier",
    target: '[data-tour="tier-stat-growth"]',
    icon: BarChart3,
    titleKey: "guide.tier.s23d",
    descKey: "guide.tier.s23ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tier-add",
    page: "/member-tier",
    target: '[data-tour="tier-add"]',
    icon: Plus,
    titleKey: "guide.tier.s23e",
    descKey: "guide.tier.s23edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tier-search",
    page: "/member-tier",
    target: '[data-tour="tier-search"]',
    icon: Search,
    titleKey: "guide.tier.s23f",
    descKey: "guide.tier.s23fdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tier-table",
    page: "/member-tier",
    target: '[data-tour="tier-table"]',
    icon: List,
    titleKey: "guide.tier.s23g",
    descKey: "guide.tier.s23gdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Daftar Member ──
  {
    id: "member-intro",
    page: "/member-list",
    icon: Award,
    titleKey: "guide.member.s15a",
    descKey: "guide.member.s15adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "member-add",
    page: "/member-list",
    target: '[data-tour="member-add"]',
    icon: Plus,
    titleKey: "guide.member.s15b",
    descKey: "guide.member.s15bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "member-search",
    page: "/member-list",
    target: '[data-tour="member-search"]',
    icon: Search,
    titleKey: "guide.member.s15c",
    descKey: "guide.member.s15cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "member-table",
    page: "/member-list",
    target: '[data-tour="member-table"]',
    icon: List,
    titleKey: "guide.member.s15d",
    descKey: "guide.member.s15ddesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Karyawan ──
  // ── Departemen ──
  {
    id: "department-intro",
    page: "/department-list",
    icon: Network,
    titleKey: "guide.department.s17a",
    descKey: "guide.department.s17adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-stat-total",
    page: "/department-list",
    target: '[data-tour="department-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.department.s17b",
    descKey: "guide.department.s17bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-stat-active",
    page: "/department-list",
    target: '[data-tour="department-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.department.s17c",
    descKey: "guide.department.s17cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-stat-inactive",
    page: "/department-list",
    target: '[data-tour="department-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.department.s17d",
    descKey: "guide.department.s17ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-stat-nodesc",
    page: "/department-list",
    target: '[data-tour="department-stat-nodesc"]',
    icon: BarChart3,
    titleKey: "guide.department.s17e",
    descKey: "guide.department.s17edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-add",
    page: "/department-list",
    target: '[data-tour="department-add"]',
    icon: Plus,
    titleKey: "guide.department.s17i",
    descKey: "guide.department.s17idesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-search",
    page: "/department-list",
    target: '[data-tour="department-search"]',
    icon: Search,
    titleKey: "guide.department.s17j",
    descKey: "guide.department.s17jdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "department-table",
    page: "/department-list",
    target: '[data-tour="department-table"]',
    icon: List,
    titleKey: "guide.department.s17k",
    descKey: "guide.department.s17kdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Posisi ──
  {
    id: "position-intro",
    page: "/position-list",
    icon: Briefcase,
    titleKey: "guide.position.s18a",
    descKey: "guide.position.s18adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "position-stat-total",
    page: "/position-list",
    target: '[data-tour="position-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.position.s18b",
    descKey: "guide.position.s18bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "position-stat-active",
    page: "/position-list",
    target: '[data-tour="position-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.position.s18c",
    descKey: "guide.position.s18cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "position-stat-inactive",
    page: "/position-list",
    target: '[data-tour="position-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.position.s18d",
    descKey: "guide.position.s18ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "position-add",
    page: "/position-list",
    target: '[data-tour="position-add"]',
    icon: Plus,
    titleKey: "guide.position.s18h",
    descKey: "guide.position.s18hdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "position-search",
    page: "/position-list",
    target: '[data-tour="position-search"]',
    icon: Search,
    titleKey: "guide.position.s18i",
    descKey: "guide.position.s18idesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "position-table",
    page: "/position-list",
    target: '[data-tour="position-table"]',
    icon: List,
    titleKey: "guide.position.s18j",
    descKey: "guide.position.s18jdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Daftar Karyawan ──
  {
    id: "employee-intro",
    page: "/employee-list",
    icon: Users,
    titleKey: "guide.employee.s16a",
    descKey: "guide.employee.s16adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "employee-stat-total",
    page: "/employee-list",
    target: '[data-tour="employee-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.employee.s16b",
    descKey: "guide.employee.s16bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "employee-stat-active",
    page: "/employee-list",
    target: '[data-tour="employee-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.employee.s16c",
    descKey: "guide.employee.s16cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "employee-stat-inactive",
    page: "/employee-list",
    target: '[data-tour="employee-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.employee.s16d",
    descKey: "guide.employee.s16ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "employee-add",
    page: "/employee-list",
    target: '[data-tour="employee-add"]',
    icon: Plus,
    titleKey: "guide.employee.s16e",
    descKey: "guide.employee.s16edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "employee-table",
    page: "/employee-list",
    target: '[data-tour="employee-table"]',
    icon: List,
    titleKey: "guide.employee.s16f",
    descKey: "guide.employee.s16fdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Shift ──
  {
    id: "shift-intro",
    page: "/shift-list",
    icon: CalendarDays,
    titleKey: "guide.shift.s26a",
    descKey: "guide.shift.s26adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "shift-add",
    page: "/shift-list",
    target: '[data-tour="shift-add"]',
    icon: Plus,
    titleKey: "guide.shift.s26b",
    descKey: "guide.shift.s26bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "shift-table",
    page: "/shift-list",
    target: '[data-tour="shift-table"]',
    icon: List,
    titleKey: "guide.shift.s26c",
    descKey: "guide.shift.s26cdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Manajemen Stok ──
  {
    id: "stock-opname",
    page: "/stock-opname",
    icon: ClipboardList,
    titleKey: "guide.stock.s27a",
    descKey: "guide.stock.s27adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "stock-history",
    page: "/stock-history",
    icon: FileText,
    titleKey: "guide.stock.s27b",
    descKey: "guide.stock.s27bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "low-stock",
    page: "/low-stock",
    icon: BarChart3,
    titleKey: "guide.stock.s27c",
    descKey: "guide.stock.s27cdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Kitchen Display ──
  {
    id: "kitchen-display",
    page: "/kitchen-display",
    icon: ChefHat,
    titleKey: "sidebar.kitchenDisplay",
    descKey: "guide.page.kitchenDisplay.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Production Order ──
  {
    id: "production-order",
    page: "/production-order",
    icon: Package,
    titleKey: "sidebar.productionOrder",
    descKey: "guide.page.productionOrder.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── BOM ──
  {
    id: "bom",
    page: "/bom",
    icon: ClipboardList,
    titleKey: "sidebar.bom",
    descKey: "guide.page.bom.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Goods Receipt ──
  {
    id: "goods-receipt",
    page: "/goods-receipt",
    icon: FileText,
    titleKey: "sidebar.goodsReceipt",
    descKey: "guide.page.goodsReceipt.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Sales Return ──
  {
    id: "sales-return",
    page: "/sales-return",
    icon: ShoppingCart,
    titleKey: "sidebar.salesReturn",
    descKey: "guide.page.salesReturn.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Purchase Return ──
  {
    id: "purchase-return",
    page: "/purchase-return",
    icon: ShoppingCart,
    titleKey: "sidebar.purchaseReturn",
    descKey: "guide.page.purchaseReturn.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Stock Transfer ──
  {
    id: "stock-transfer",
    page: "/stock-transfer",
    icon: ArrowRightLeft,
    titleKey: "sidebar.transferStok",
    descKey: "guide.page.stockTransfer.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Laporan ──
  {
    id: "sales-report",
    page: "/report/sales",
    icon: ShoppingCart,
    titleKey: "guide.sales.s28a",
    descKey: "guide.sales.s28adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "best-selling",
    page: "/best-selling",
    icon: TrendingUp,
    titleKey: "guide.bestselling.s28b",
    descKey: "guide.bestselling.s28bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "daily-report",
    page: "/report/daily",
    icon: ClipboardList,
    titleKey: "guide.dailyReport.s25a",
    descKey: "guide.dailyReport.s25adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "cash-flow",
    page: "/report/cash-flow",
    icon: Receipt,
    titleKey: "guide.cashflow.s25c",
    descKey: "guide.cashflow.s25cdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Pengaturan ──
  // ── Invoice/Struk ──
  {
    id: "settings-intro",
    page: "/invoice-page",
    icon: Settings,
    titleKey: "guide.settings.s19a",
    descKey: "guide.settings.s19adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "settings-logo",
    page: "/invoice-page",
    target: '[data-tour="invoice-logo"]',
    icon: Image,
    titleKey: "guide.settings.s19b",
    descKey: "guide.settings.s19bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "settings-address",
    page: "/invoice-page",
    target: '[data-tour="invoice-address"]',
    icon: MapPin,
    titleKey: "guide.settings.s19c",
    descKey: "guide.settings.s19cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "settings-footer",
    page: "/invoice-page",
    target: '[data-tour="invoice-footer"]',
    icon: FileText,
    titleKey: "guide.settings.s19d",
    descKey: "guide.settings.s19ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "settings-save",
    page: "/invoice-page",
    target: '[data-tour="invoice-save"]',
    icon: Save,
    titleKey: "guide.settings.s19e",
    descKey: "guide.settings.s19edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "settings-preview",
    page: "/invoice-page",
    target: '[data-tour="invoice-preview"]',
    icon: Eye,
    titleKey: "guide.settings.s19f",
    descKey: "guide.settings.s19fdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Pajak ──
  {
    id: "tax-intro",
    page: "/tax-list",
    icon: Percent,
    titleKey: "guide.tax.s20a",
    descKey: "guide.tax.s20adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tax-stat-total",
    page: "/tax-list",
    target: '[data-tour="tax-stat-total"]',
    icon: BarChart3,
    titleKey: "guide.tax.s20b",
    descKey: "guide.tax.s20bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tax-stat-active",
    page: "/tax-list",
    target: '[data-tour="tax-stat-active"]',
    icon: BarChart3,
    titleKey: "guide.tax.s20c",
    descKey: "guide.tax.s20cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tax-stat-inactive",
    page: "/tax-list",
    target: '[data-tour="tax-stat-inactive"]',
    icon: BarChart3,
    titleKey: "guide.tax.s20d",
    descKey: "guide.tax.s20ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tax-add",
    page: "/tax-list",
    target: '[data-tour="tax-add"]',
    icon: Plus,
    titleKey: "guide.tax.s20e",
    descKey: "guide.tax.s20edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tax-search",
    page: "/tax-list",
    target: '[data-tour="tax-search"]',
    icon: Search,
    titleKey: "guide.tax.s20f",
    descKey: "guide.tax.s20fdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "tax-table",
    page: "/tax-list",
    target: '[data-tour="tax-table"]',
    icon: List,
    titleKey: "guide.tax.s20g",
    descKey: "guide.tax.s20gdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Metode Pembayaran ──
  {
    id: "payment-list",
    page: "/type-payment-list",
    icon: CreditCard,
    titleKey: "guide.payment.s26b",
    descKey: "guide.payment.s26bdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Manajemen Role ──
  {
    id: "role-intro",
    page: "/role-management",
    icon: Shield,
    titleKey: "guide.role.s22a",
    descKey: "guide.role.s22adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "role-add",
    page: "/role-management",
    target: '[data-tour="role-add"]',
    icon: Plus,
    titleKey: "guide.role.s22b",
    descKey: "guide.role.s22bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "role-table",
    page: "/role-management",
    target: '[data-tour="role-table"]',
    icon: List,
    titleKey: "guide.role.s22c",
    descKey: "guide.role.s22cdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Harga per Toko ──
  {
    id: "price-per-store",
    page: "/price-list-template",
    icon: BadgePercent,
    titleKey: "sidebar.pricePerStore",
    descKey: "guide.page.pricePerStore.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Meja ──
  {
    id: "table",
    page: "/table-list",
    icon: Table,
    titleKey: "sidebar.meja",
    descKey: "guide.page.table.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Support ──
  {
    id: "support-intro",
    page: "/support",
    icon: HelpCircle,
    titleKey: "guide.support.s24a",
    descKey: "guide.support.s24adesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "support-contact-email",
    page: "/support",
    target: '[data-tour="support-contact-email"]',
    icon: Mail,
    titleKey: "guide.support.s24b",
    descKey: "guide.support.s24bdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "support-contact-phone",
    page: "/support",
    target: '[data-tour="support-contact-phone"]',
    icon: Phone,
    titleKey: "guide.support.s24c",
    descKey: "guide.support.s24cdesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "support-contact-chat",
    page: "/support",
    target: '[data-tour="support-contact-chat"]',
    icon: MessageCircle,
    titleKey: "guide.support.s24d",
    descKey: "guide.support.s24ddesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "support-faq",
    page: "/support",
    target: '[data-tour="support-faq"]',
    icon: HelpCircle,
    titleKey: "guide.support.s24e",
    descKey: "guide.support.s24edesc",
    actionKey: "guide.dashboard.next"
  },
  {
    id: "support-resources",
    page: "/support",
    target: '[data-tour="support-resources"]',
    icon: BookOpen,
    titleKey: "guide.support.s24f",
    descKey: "guide.support.s24fdesc",
    actionKey: "guide.dashboard.next"
  },

  // ── Auth Pages ──
  {
    id: "auth-login",
    page: "/login",
    icon: LogIn,
    titleKey: "sidebar.login",
    descKey: "guide.auth.login.s1desc",
    actionKey: "guide.dashboard.next"
  },
  // D-08: shown only while public sign-up is open.
  ...(isPublicRegistrationEnabled()
    ? [
        {
          id: "auth-register",
          page: "/register",
          icon: UserPlus,
          titleKey: "sidebar.register",
          descKey: "guide.auth.register.s1desc",
          actionKey: "guide.dashboard.next"
        }
      ]
    : []),
  {
    id: "auth-reset",
    page: "/reset-password",
    icon: KeyRound,
    titleKey: "sidebar.resetPassword",
    descKey: "guide.auth.reset.s1desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Dashboard Admin ──
  {
    id: "dashboard-admin",
    page: "/dashboard-admin",
    icon: LayoutDashboard,
    titleKey: "sidebar.dashboardAdmin",
    descKey: "guide.dashboard.s8desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Discount ──
  {
    id: "discount",
    page: "/discount-list",
    icon: Percent,
    titleKey: "sidebar.diskon",
    descKey: "guide.page.discount.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Expense Category ──
  {
    id: "expense-category",
    page: "/expense-category",
    icon: Tag,
    titleKey: "sidebar.kategoriPengeluaran",
    descKey: "guide.page.expenseCategory.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Expense ──
  {
    id: "expense",
    page: "/expense",
    icon: Receipt,
    titleKey: "sidebar.daftarPengeluaran",
    descKey: "guide.page.expense.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Reservation ──
  {
    id: "reservation",
    page: "/reservation",
    icon: CalendarDays,
    titleKey: "sidebar.reservation",
    descKey: "guide.page.reservation.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Customer Display ──
  {
    id: "customer-display",
    page: "/customer-display",
    icon: Monitor,
    titleKey: "sidebar.customerDisplay",
    descKey: "guide.page.customerDisplay.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Admin Users ──
  {
    id: "admin-users",
    page: "/user-list",
    icon: Users,
    titleKey: "sidebar.adminList",
    descKey: "guide.page.adminList.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Profile ──
  {
    id: "profile",
    page: "/profile",
    icon: User,
    titleKey: "sidebar.profile",
    descKey: "guide.page.profile.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Notification ──
  {
    id: "notification",
    page: "/notification",
    icon: BellDot,
    titleKey: "sidebar.notification",
    descKey: "guide.page.notification.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Store Map ──
  {
    id: "store-geospatial",
    page: "/store-geospatial",
    icon: MapPinned,
    titleKey: "sidebar.storeGeospatial",
    descKey: "guide.page.storeGeospatial.desc",
    actionKey: "guide.dashboard.next"
  },

  // ── Done ──
  {
    id: "complete",
    page: null,
    icon: CheckCircle2,
    titleKey: "guide.dashboard.complete",
    descKey: "guide.dashboard.complete.desc",
    actionKey: "guide.dashboard.finish"
  }
];
