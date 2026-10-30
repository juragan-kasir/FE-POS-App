import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { DollarSign } from "lucide-react";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ProductPriceCostFields from "@/page/product/ProductPriceCostFields";
import InventoryModeField from "@/page/product/InventoryModeField";
import InventoryLinkField from "@/page/product/InventoryLinkField";

// Step 2 of the product form (inventory mode, inventory-item links, price,
// cost, stock, points), shared by Tambah and Edit Produk. Edit passes what
// only an existing product has: its id and saved mode, a note under the
// item links, the BOM costing, and the per-store price card as children.
const ProductPricingStep = ({
  form,
  linksItem,
  linkStores,
  inventoryLinks,
  onInventoryLinksChange,
  linkError,
  linkedCost,
  productId,
  savedMode,
  inventoryLinkNote,
  costing,
  costingStore,
  children
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
          <DollarSign size={18} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {t("page.product.form.priceSection")}
          </h3>
        </div>

        <div className="mb-5">
          <InventoryModeField
            productId={productId}
            savedMode={savedMode}
            value={form.watch("inventoryMode")}
            onChange={(mode) => form.setValue("inventoryMode", mode, { shouldDirty: true })}
          />
        </div>

        {linksItem && (
          <div className="mb-5">
            <InventoryLinkField
              stores={linkStores}
              value={inventoryLinks}
              onChange={onInventoryLinksChange}
              productName={form.watch("nameProduct")}
              error={linkError}
            />
            {inventoryLinkNote}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProductPriceCostFields
            form={form}
            costing={costing}
            storeId={costingStore}
            linkedCost={linkedCost}
          />
          {!linksItem && (
            <>
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.stock")}</FormLabel>
                    {form.watch("inventoryMode") === "make_to_order" && (
                      <p className="text-xs text-muted-foreground">
                        {t("page.product.form.inventoryMode.stockUnused")}
                      </p>
                    )}
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={
                        field.value !== undefined && field.value !== ""
                          ? Number(field.value).toLocaleString("id-ID")
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        field.onChange(raw ? Number(raw) : "");
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.minStock")}</FormLabel>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={
                        field.value !== undefined && field.value !== ""
                          ? Number(field.value).toLocaleString("id-ID")
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        field.onChange(raw ? Number(raw) : "");
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <FormField
            control={form.control}
            name="point"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("page.product.form.point")}</FormLabel>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={
                    field.value !== undefined && field.value !== ""
                      ? Number(field.value).toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    field.onChange(raw ? Number(raw) : "");
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("page.product.form.pointInfo")}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="redeemPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("page.product.form.redeemPoints")}</FormLabel>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={
                    field.value !== undefined && field.value !== ""
                      ? Number(field.value).toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    field.onChange(raw ? Number(raw) : "");
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("page.product.form.redeemPointsInfo")}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      {children}
    </>
  );
};

ProductPricingStep.propTypes = {
  form: PropTypes.object.isRequired,
  linksItem: PropTypes.bool,
  linkStores: PropTypes.array,
  inventoryLinks: PropTypes.array,
  onInventoryLinksChange: PropTypes.func.isRequired,
  linkError: PropTypes.string,
  linkedCost: PropTypes.any,
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  savedMode: PropTypes.string,
  inventoryLinkNote: PropTypes.node,
  costing: PropTypes.any,
  costingStore: PropTypes.any,
  children: PropTypes.node
};

export default ProductPricingStep;
