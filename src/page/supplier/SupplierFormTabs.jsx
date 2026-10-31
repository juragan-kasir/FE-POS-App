import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Phone, Receipt, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SupplierGeneralFields from "./SupplierGeneralFields";
import SupplierStatusField from "./SupplierStatusField";
import SupplierContactsSection from "./SupplierContactsSection";
import SupplierPurchaseFields from "./SupplierPurchaseFields";
import SupplierBankAccountsSection from "./SupplierBankAccountsSection";
import SupplierTaxFields from "./SupplierTaxFields";

const TABS = [
  { value: "general", icon: User, labelKey: "page.supplier.tabs.general", fallback: "Umum" },
  { value: "contacts", icon: Phone, labelKey: "page.supplier.tabs.contacts", fallback: "Kontak" },
  {
    value: "purchase",
    icon: CreditCard,
    labelKey: "page.supplier.tabs.purchase",
    fallback: "Pembelian"
  },
  { value: "tax", icon: Receipt, labelKey: "page.supplier.tabs.tax", fallback: "Pajak" }
];

const SupplierFormTabs = ({
  idPrefix,
  form,
  categoryOptions,
  hasStatusInGeneralTab,
  contacts,
  onContactsChange,
  bankAccounts,
  onBankAccountsChange
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* ponytail: tab scroll horizontal di layar sempit */}
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="grid w-full grid-cols-4 min-w-[440px]">
          {TABS.map(({ value, icon: Icon, labelKey, fallback }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon size={14} />
              {t(labelKey, fallback)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="general" className="space-y-6 mt-4">
        <SupplierGeneralFields form={form} categoryOptions={categoryOptions} />
        {hasStatusInGeneralTab && <SupplierStatusField form={form} />}
      </TabsContent>

      <TabsContent value="contacts" className="space-y-4 mt-4">
        <SupplierContactsSection
          idPrefix={idPrefix}
          contacts={contacts}
          onChange={onContactsChange}
        />
      </TabsContent>

      <TabsContent value="purchase" className="space-y-6 mt-4">
        <SupplierPurchaseFields form={form} />
        <SupplierBankAccountsSection
          idPrefix={idPrefix}
          bankAccounts={bankAccounts}
          onChange={onBankAccountsChange}
        />
      </TabsContent>

      <TabsContent value="tax" className="space-y-6 mt-4">
        <SupplierTaxFields form={form} />
      </TabsContent>
    </Tabs>
  );
};

export default SupplierFormTabs;
