import { z } from "zod";

export const buildSupplierSchema = (t) =>
  z.object({
    name: z.string().min(1, t("page.supplier.validation.nameRequired")),
    contactPerson: z.string().optional().or(z.literal("")),
    phone: z.string().min(1, t("page.supplier.validation.phoneRequired")).max(16),
    email: z
      .string()
      .email(t("page.supplier.validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
    store: z.string().optional(),
    paymentType: z.enum(["cbd", "cad", "tempo"]).default("cbd"),
    tempoDays: z.number().default(0),
    categoryId: z.number().optional().nullable(),
    mobile: z.string().optional().or(z.literal("")),
    whatsapp: z.string().optional().or(z.literal("")),
    fax: z.string().optional().or(z.literal("")),
    website: z.string().optional().or(z.literal("")),
    taxInclude: z.boolean().default(true),
    taxType: z.string().optional().or(z.literal("")),
    taxNumber: z.string().optional().or(z.literal("")),
    taxName: z.string().optional().or(z.literal("")),
    nitku: z.string().optional().or(z.literal("")),
    taxTransactionType: z.string().optional().or(z.literal("")),
    defaultDiscount: z.number().default(0),
    defaultDescription: z.string().optional().or(z.literal(""))
  });

export const SUPPLIER_FORM_DEFAULTS = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  isActive: true,
  paymentType: "cbd",
  tempoDays: 0,
  categoryId: null,
  mobile: "",
  whatsapp: "",
  fax: "",
  website: "",
  taxInclude: true,
  taxType: "",
  taxNumber: "",
  taxName: "",
  nitku: "",
  taxTransactionType: "",
  defaultDiscount: 0,
  defaultDescription: ""
};

export const buildSupplierFieldLabels = (t) => ({
  name: t("page.supplier.form.name"),
  phone: t("page.supplier.form.phone")
});

const supplierStatus = (values, isDraft) => {
  if (isDraft) return "draft";
  return values.isActive ? "active" : "inactive";
};

export const buildSupplierPayload = ({
  values,
  isDraft,
  selectedStore,
  contacts,
  bankAccounts,
  products
}) => ({
  ...values,
  status: supplierStatus(values, isDraft),
  store: selectedStore,
  categoryId: values.categoryId || null,
  contacts: contacts.map((c) => ({
    fullName: c.fullName,
    position: c.position || null,
    email: c.email || null,
    phone: c.phone || null
  })),
  bankAccounts: bankAccounts.map((b) => ({
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    accountName: b.accountName,
    isDefault: b.isDefault || false,
    status: b.status || "active"
  })),
  products: products.map((p) => ({
    name: p.name,
    price: p.price,
    unit: p.unit || "pcs",
    leadTime: p.leadTime || 0,
    leadTimeUnit: p.leadTimeUnit || "hari",
    qualityRating: p.qualityRating || 0,
    minOrderQty: p.minOrderQty || 1,
    notes: p.notes || ""
  }))
});
