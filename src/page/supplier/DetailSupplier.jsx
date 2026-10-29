import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Plus,
  Edit3,
  Lightbulb,
  ShoppingCart,
  Package,
  Star,
  Clock,
  CreditCard,
  Receipt,
  Globe,
  Smartphone,
  Printer,
  MessageCircle,
  Landmark,
  CalendarDays,
  Percent,
  Store,
  FileText,
  Wallet
} from "lucide-react";
import { useCookies } from "react-cookie";
import AbortController from "@/components/organism/abort-controller";
import { useTranslation } from "react-i18next";
import { getSupplierById } from "@/services/supplier";
import { getPaymentsBySupplier } from "@/services/purchase-payment";
import SupplierPaymentModal from "@/components/organism/supplier-payment-modal";
import { FormalDocument, PrintButton } from "@/components/document/FormalDocument";
import { getDocumentSpecForSupplier } from "@/components/document/documentMappers";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/DataTable";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext
} from "@/components/ui/pagination";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";

const statusMap = {
  pending: { class: "bg-yellow-100 text-yellow-800" },
  ordered: { class: "bg-blue-100 text-blue-800" },
  received: { class: "bg-green-100 text-green-800" },
  cancelled: { class: "bg-red-100 text-red-800" }
};
const statusKeys = {
  pending: "pending",
  ordered: "ordered",
  received: "received",
  cancelled: "cancelled"
};

// ponytail: price dari BE kini string (bigint pg) — Number() sebelum diformat
const rupiah = (value) => formatCurrencyRupiah(Number(value) || 0);

const DetailSupplier = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const [activeTab, setActiveTab] = useState("general");
  const [paymentModal, setPaymentModal] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);

  const {
    data: supplierData,
    isLoading,
    isFetching,
    isError,
    refetch
  } = useQuery(["supplier-detail", id], () => getSupplierById({ id }), { enabled: !!id });
  const supplier = supplierData?.data || {};
  const printSpec = supplier.id ? getDocumentSpecForSupplier(supplier, t) : null;

  const { data: paymentData, isLoading: loadingPayments } = useQuery(
    ["supplier-payments", id],
    () => getPaymentsBySupplier(id),
    { enabled: !!id }
  );
  const { purchaseOrders = [], summary = {} } = paymentData?.data || {};

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.supplier.detail.noId")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isFetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2 space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const poColumns = [
    {
      header: t("page.supplier.detail.table.noPo"),
      render: (po) => <span className="font-medium">{po.orderNumber || `PO-${po.id}`}</span>
    },
    {
      header: t("page.supplier.detail.table.date"),
      render: (po) => (po.orderDate ? new Date(po.orderDate).toLocaleDateString("id") : "-")
    },
    {
      header: t("page.supplier.detail.table.total"),
      align: "right",
      render: (po) => `Rp ${(po.finalAmount || 0).toLocaleString("id-ID")}`
    },
    {
      header: t("page.supplier.detail.table.status"),
      render: (po) => {
        const st = statusMap[po.status] || statusMap.pending;
        const stKey = statusKeys[po.status] || "pending";
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${st.class}`}>
            {t(`page.supplier.detail.status.${stKey}`)}
          </span>
        );
      }
    },
    {
      header: t("page.supplier.detail.table.terbayar"),
      align: "right",
      render: (po) => {
        const paid = (po.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const left = (po.finalAmount || 0) - paid;
        return (
          <div className="text-right">
            <p className="text-xs text-green-600">
              {t("page.supplier.detail.table.rpPrefix")} {paid.toLocaleString("id-ID")}
            </p>
            {left > 0 && (
              <p className="text-xs text-red-500">
                {t("page.supplier.detail.table.sisa")} Rp {left.toLocaleString("id-ID")}
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: t("page.supplier.detail.table.aksi"),
      render: (po) =>
        po.status !== "cancelled" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary"
            onClick={() => navigate(`/purchase-order/detail?id=${po.id}`)}>
            {t("page.supplier.detail.table.detail")}
          </Button>
        )
    }
  ];

  const taxInfo = [
    {
      label: t("page.supplier.ui.taxIncluded"),
      icon: Receipt,
      value: supplier.taxInclude ? "Ya" : "Tidak"
    },
    {
      label: t("page.taxConfig.form.type"),
      icon: Receipt,
      value: supplier.taxType ? String(supplier.taxType).toUpperCase() : null,
      badge: true
    },
    {
      label: t("page.supplier.ui.taxTransaction"),
      icon: Receipt,
      value: supplier.taxTransactionType
        ? supplier.taxTransactionType === "purchase"
          ? "Pembelian"
          : supplier.taxTransactionType === "sales"
            ? "Penjualan"
            : String(supplier.taxTransactionType)
        : null
    },
    { label: t("page.supplier.ui.npwpTaxNumber"), icon: CreditCard, value: supplier.taxNumber },
    { label: t("page.taxConfig.form.name"), icon: Receipt, value: supplier.taxName },
    { label: "NITKU", icon: CreditCard, value: supplier.nitku }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.supplier.detail.breadcrumb.list"),
            href: "/supplier",
            i18nKey: "page.supplier.detail.breadcrumb.list"
          },
          { label: isLoading ? "..." : supplier.name || "Detail" }
        ]}
        title={isLoading ? t("common.loading") : supplier.name || "-"}
        description={
          supplier.website
            ? `${supplier.website} · ${t("page.supplier.detail.subtitle")}`
            : t("page.supplier.detail.subtitle")
        }
        backLink="/supplier"
        dynamicInfo={false}>
        <PrintButton />
        {supplier.status !== "inactive" && supplier.status !== "draft" && (
          <Button variant="success" onClick={() => navigate(`/add-purchase-order?supplier=${id}`)}>
            <ShoppingCart size={14} className="mr-1.5" />
            {t("page.supplier.detail.createPo", "Buat PO")}
          </Button>
        )}
        <Button onClick={() => navigate(`/edit-supplier?id=${id}`)}>
          <Edit3 size={14} className="mr-1.5" />
          {t("page.supplier.detail.editSupplier")}
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* ponytail: 6 tab terlalu sempit di ponsel — scroll horizontal */}
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="grid w-full grid-cols-6 min-w-[660px]">
            <TabsTrigger value="general">
              {t("page.supplier.detail.tabs.general", "Informasi Umum")}
            </TabsTrigger>
            <TabsTrigger value="contacts">
              {t("page.supplier.detail.tabs.contacts", "Kontak")}
            </TabsTrigger>
            <TabsTrigger value="purchase">
              {t("page.supplier.detail.tabs.purchase", "Pembelian / Produk")}
            </TabsTrigger>
            <TabsTrigger value="tax">{t("page.supplier.detail.tabs.tax", "Pajak")}</TabsTrigger>
            <TabsTrigger value="bank">
              {t("page.supplier.detail.tabs.bank", "Rekening Bank")}
            </TabsTrigger>
            <TabsTrigger value="debt">
              {t("page.supplier.detail.tabs.debt", "Saldo Utang")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: General / Informasi Umum */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Profil */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("page.supplier.detail.section.informasiSupplier")}
              </h3>
              <div className="space-y-2.5 text-sm">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-28 shrink-0">
                      {t("document.contactPerson")}
                    </span>
                    <span className="font-medium">{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.description && (
                  <div className="flex items-start gap-2">
                    <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground w-28 shrink-0">
                      {t("page.role.detail.descLabel")}
                    </span>
                    <span>{supplier.description}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground w-28 shrink-0">
                      {t("document.address")}
                    </span>
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
              <div className="border-t pt-3 mt-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays size={12} className="shrink-0" />
                  <span>
                    {t("page.supplier.ui.created")}{" "}
                    {supplier.createdAt
                      ? format(new Date(supplier.createdAt), "dd MMM yyyy HH:mm")
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={12} className="shrink-0" />
                  <span>
                    {t("page.supplier.ui.modified")}{" "}
                    {supplier.updatedAt
                      ? format(new Date(supplier.updatedAt), "dd MMM yyyy HH:mm")
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={12} className="shrink-0" />
                  <span>
                    {t("common.createdBy")}:{" "}
                    {supplier.createdByUser?.fullName || supplier.createdByUser?.userName || "-"}
                  </span>
                </div>
                {supplier.modifiedBy && (
                  <div className="flex items-center gap-2">
                    <User size={12} className="shrink-0" />
                    <span>
                      {t("common.modifiedBy")}:{" "}
                      {supplier.modifiedByUser?.fullName ||
                        supplier.modifiedByUser?.userName ||
                        supplier.modifiedBy}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Kanal kontak */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("page.supplier.ui.contactChannels")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                {[
                  {
                    icon: Phone,
                    label: t("document.phone"),
                    value: supplier.phone,
                    href: supplier.phone ? `tel:${supplier.phone}` : null
                  },
                  {
                    icon: Smartphone,
                    label: t("page.supplier.form.mobile"),
                    value: supplier.mobile,
                    href: supplier.mobile ? `tel:${supplier.mobile}` : null
                  },
                  {
                    icon: MessageCircle,
                    label: "WhatsApp",
                    value: supplier.whatsapp,
                    href: supplier.whatsapp
                      ? `https://wa.me/${String(supplier.whatsapp).replace(/[^0-9]/g, "")}`
                      : null
                  },
                  {
                    icon: Mail,
                    label: "Email",
                    value: supplier.email,
                    href: supplier.email ? `mailto:${supplier.email}` : null
                  },
                  {
                    icon: Printer,
                    label: t("page.supplier.form.fax"),
                    value: supplier.fax,
                    href: null
                  },
                  {
                    icon: Globe,
                    label: t("page.supplier.form.website"),
                    value: supplier.website,
                    href: supplier.website
                      ? supplier.website.startsWith("http")
                        ? supplier.website
                        : `https://${supplier.website}`
                      : null
                  }
                ].map(({ icon: Icon, label, value, href }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      {value ? (
                        <a
                          href={href}
                          target={href?.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className={`text-sm font-medium truncate block max-w-[180px] ${
                            href ? "hover:text-primary hover:underline" : ""
                          }`}>
                          {value}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground/50">-</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cabang terhubung */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Store size={14} />
                {t("page.supplier.ui.linkedBranches")}
              </h3>
              {supplier.store?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {supplier.store.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Building2 size={12} />
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/50">
                  {t("page.supplier.ui.notLinkedToABranch")}
                </p>
              )}
            </Card>

            {/* Termin pembayaran */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Wallet size={14} />
                {t("page.purchasePayment.detail.paymentInfo")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.typePayment.list.title")}
                  </p>
                  <Badge variant="outline" className="capitalize font-semibold">
                    {supplier.paymentType === "cbd"
                      ? t("page.supplier.detail.termCbd")
                      : supplier.paymentType === "tempo"
                        ? t("page.supplier.detail.termCredit")
                        : supplier.paymentType || "-"}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.supplier.ui.paymentTerms")}
                  </p>
                  <p className="text-sm font-medium">
                    {supplier.paymentType === "tempo" ? `${supplier.tempoDays ?? 0} hari` : "-"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Percent size={11} /> {t("page.supplier.ui.defaultDiscount")}
                  </p>
                  <p className="text-sm font-medium">{Number(supplier.defaultDiscount || 0)}%</p>
                </div>
              </div>
              {supplier.defaultDescription && (
                <p className="text-xs text-muted-foreground italic mt-2.5">
                  {t("page.supplier.ui.defaultNote")} {supplier.defaultDescription}
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Contacts */}
        <TabsContent value="contacts" className="mt-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t("page.supplier.detail.tabs.contacts", "Kontak")}
            </h3>
            {supplier.contacts && supplier.contacts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">#</TableHead>
                    <TableHead className="font-semibold">
                      {t("page.supplier.detail.contacts.name", "Nama")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("page.supplier.detail.contacts.phone", "Telepon")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("page.supplier.detail.contacts.email", "Email")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("page.supplier.detail.contacts.position", "Jabatan")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.contacts.map((contact, idx) => (
                    <TableRow key={contact.id || idx}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{contact.fullName || "-"}</TableCell>
                      <TableCell>{contact.phone || "-"}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{contact.position || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <User size={24} className="text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("page.supplier.detail.contacts.empty", "Belum ada data kontak")}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab: Purchase / Products */}
        <TabsContent value="purchase" className="mt-4">
          {isSuperAdmin && supplier.products && supplier.products.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("page.supplier.products.availableProducts")}
                </h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {supplier.products.length}{" "}
                  {t("page.supplier.products.productCount", { count: supplier.products.length })
                    .split(" ")
                    .pop()}
                </span>
              </div>
              {(() => {
                const totalItems = supplier.products.length;
                const totalPages = Math.ceil(totalItems / productPageSize);
                const startIdx = (productPage - 1) * productPageSize;
                const pagedProducts = supplier.products.slice(startIdx, startIdx + productPageSize);

                return (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 font-semibold">#</TableHead>
                            <TableHead className="font-semibold">
                              {t("page.supplier.products.table.name")}
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              {t("page.supplier.products.price")}
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              {t("page.supplier.products.table.unit")}
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              {t("page.supplier.products.table.leadTime")}
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              {t("page.supplier.products.table.quality")}
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              {t("page.supplier.products.table.minOrder")}
                            </TableHead>
                            <TableHead className="font-semibold">
                              {t("page.supplier.products.table.notes")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedProducts.map((product, idx) => (
                            <TableRow key={product.id}>
                              <TableCell className="text-xs text-muted-foreground">
                                {startIdx + idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {rupiah(product.price)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                                  {product.unit || "pcs"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Clock size={12} className="text-muted-foreground" />
                                  <span className="text-sm">
                                    {product.leadTime || 0} {product.leadTimeUnit || "hari"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={12}
                                      className={
                                        i < Math.floor(Number(product.qualityRating) || 0)
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-muted-foreground"
                                      }
                                    />
                                  ))}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {Number(product.qualityRating) || 0}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {product.minOrderQty || 1}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                                {product.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile card list */}
                    <div className="md:hidden divide-y">
                      {pagedProducts.map((product, idx) => (
                        <div key={product.id} className="py-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="text-xs text-muted-foreground mt-0.5 shrink-0">
                                {startIdx + idx + 1}.
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{product.name}</p>
                                <p className="text-lg font-bold text-primary mt-0.5">
                                  {rupiah(product.price)}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                              {product.unit || "pcs"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1.5">
                              <Clock size={12} className="text-muted-foreground shrink-0" />
                              <span className="text-xs">
                                {product.leadTime || 0} {product.leadTimeUnit || "hari"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1.5">
                              <span className="text-xs text-muted-foreground shrink-0">
                                {t("page.supplier.products.table.minOrder")}:
                              </span>
                              <span className="text-xs font-medium">
                                {product.minOrderQty || 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-2.5 py-1.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  className={
                                    i < Math.floor(Number(product.qualityRating) || 0)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }
                                />
                              ))}
                              <span className="text-xs text-muted-foreground ml-0.5">
                                {Number(product.qualityRating) || 0}
                              </span>
                            </div>
                          </div>
                          {product.notes && (
                            <p className="text-xs text-muted-foreground italic">{product.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 pt-4 border-t mt-4">
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {t("page.supplier.ui.showing")} {startIdx + 1}–
                          {Math.min(startIdx + productPageSize, totalItems)} {t("common.ui.of")}{" "}
                          {totalItems}
                        </p>
                        <Combobox
                          options={[
                            { value: "2", label: "2" },
                            { value: "5", label: "5" },
                            { value: "10", label: "10" },
                            { value: "20", label: "20" },
                            { value: "25", label: "25" },
                            { value: "50", label: "50" },
                            { value: "100", label: "100" }
                          ]}
                          value={String(productPageSize)}
                          onChange={(v) => {
                            setProductPageSize(Number(v));
                            setProductPage(1);
                          }}
                          placeholder="10"
                          searchPlaceholder={t("common.search.generic")}
                        />
                      </div>

                      <Pagination className="sm:justify-end justify-center">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                              className={
                                productPage <= 1
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (productPage <= 3) {
                              pageNum = i + 1;
                            } else if (productPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = productPage - 2 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  isActive={pageNum === productPage}
                                  onClick={() => setProductPage(pageNum)}
                                  className="cursor-pointer">
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setProductPage((p) => Math.min(totalPages, p + 1))}
                              className={
                                productPage >= totalPages
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  </>
                );
              })()}
            </Card>
          )}

          {isSuperAdmin && supplier.products && supplier.products.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Package size={24} className="text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("page.supplier.products.noProducts")}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Tax */}
        <TabsContent value="tax" className="mt-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("page.supplier.detail.tabs.tax", "Pajak")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taxInfo.map(({ label, icon: Icon, value, badge }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {value ? (
                      badge ? (
                        <Badge variant="outline" className="font-semibold mt-0.5">
                          {value}
                        </Badge>
                      ) : (
                        <p className="text-sm font-medium truncate">{value}</p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground/50">-</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Rekening Bank */}
        <TabsContent value="bank" className="mt-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Landmark size={14} />
              {t("page.supplier.bankAccounts.title")}
            </h3>
            {supplier.bankAccounts?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {supplier.bankAccounts.map((acc, i) => (
                  <div
                    key={acc.id || i}
                    className="flex items-start gap-3 p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Landmark size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{acc.bankName || "-"}</p>
                      <p className="text-sm font-mono tracking-wider">{acc.accountNumber || "-"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        a.n. {acc.accountName || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Landmark size={24} className="text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("page.supplier.ui.noBankAccountsRegisteredYet")}
                </p>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => navigate(`/edit-supplier?id=${id}`)}>
                  <Plus size={13} className="mr-1" />
                  {t("page.supplier.ui.addViaEditSupplier")}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab: Debt / Saldo Utang */}
        <TabsContent value="debt" className="mt-4">
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 text-center flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("page.supplier.detail.card.totalPesanan")}
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-foreground">
                    Rp {(summary.totalOrdered || 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {purchaseOrders.length} {t("page.supplier.detail.card.transaksi")}
                  </p>
                </div>
              </Card>

              <Card className="p-5 text-center flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("page.supplier.detail.card.sisaHutang")}
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p
                    className={`text-2xl font-bold ${(summary.balance || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                    Rp {(summary.balance || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </Card>

              <Card className="p-5 text-center flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("page.supplier.detail.card.totalPaid", "Total Dibayar")}
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-green-600">
                    Rp {(summary.totalPaid || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </Card>
            </div>

            {/* Action button */}
            <div className="flex justify-end">
              {supplier.status !== "inactive" && supplier.status !== "draft" && (
                <Button
                  onClick={() => setPaymentModal(true)}
                  className="gap-1.5"
                  disabled={(summary.balance || 0) <= 0}
                  title={
                    (summary.balance || 0) <= 0
                      ? t("page.supplier.detail.noBalanceToPay")
                      : undefined
                  }>
                  <Plus size={18} /> {t("page.supplier.detail.catatPembayaran")}
                </Button>
              )}
            </div>

            {/* PO table or empty state */}
            {loadingPayments ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="space-y-4">
                <Card className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <ShoppingCart size={24} className="text-muted-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("page.supplier.detail.emptyTitle")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.supplier.detail.emptyDesc")}
                      </p>
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      className="mt-1"
                      onClick={() => navigate(`/add-purchase-order?supplier=${id}`)}>
                      <Plus size={14} className="mr-1" />
                      {t("page.supplier.detail.createPo")}
                    </Button>
                  </div>
                </Card>
                <Card className="p-5 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb size={16} className="text-primary" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {t("page.supplier.detail.tips.title")}
                      </p>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {t("page.supplier.detail.tips.1")}
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {t("page.supplier.detail.tips.2")}
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {t("page.supplier.detail.tips.3")}
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <DataTable
                columns={poColumns}
                data={purchaseOrders}
                isLoading={false}
                emptyMessage={t("page.supplier.detail.emptyMessage")}
                emptyIcon={Building2}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SupplierPaymentModal
        open={paymentModal}
        onOpenChange={setPaymentModal}
        supplierId={id}
        purchaseOrders={purchaseOrders}
        onSuccess={() => queryClient.invalidateQueries(["supplier-payments", id])}
      />
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
};

export default DetailSupplier;
