import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { addIngredient, getAllIngredients } from "@/services/ingredient";
import { linkAvailableUnits, linkUnitCost } from "@/lib/inventory-link";

const P = "page.product.form.inventoryLink";

const formatRp = (value) =>
  value == null ? "-" : `Rp ${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
const formatQty = (value) =>
  Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 });
const digits = (value) => value.replace(/[^0-9]/g, "");

const ingredientsKey = (store) => ["ingredients-for-link", String(store)];

// Active inventory items (ingredients) of one outlet — shared with the
// product form, which reads the linked item's cost from the same cache.
export const useLinkItems = (store) => {
  const { data, isLoading } = useQuery(
    ingredientsKey(store),
    () => getAllIngredients({ store, limit: 999 }),
    { enabled: !!store, refetchOnWindowFocus: false }
  );
  return { items: (data?.data || []).filter((i) => i.status === "active"), isLoading };
};

// FR-07: create the inventory item from the product form (one entry).
const CreateItemDialog = ({ open, onOpenChange, store, defaultName, onCreated }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    name: defaultName || "",
    unit: "pcs",
    baseUnit: "pcs",
    conversionFactor: "1",
    costPrice: "",
    stock: "",
    minStock: ""
  });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const setNumber = (key) => (e) => setValues((v) => ({ ...v, [key]: digits(e.target.value) }));

  const save = async () => {
    if (!values.name.trim()) {
      toast.error(t(`${P}.create.nameRequired`));
      return;
    }
    setSaving(true);
    try {
      const res = await addIngredient({
        name: values.name.trim(),
        unit: values.unit.trim() || "pcs",
        baseUnit: values.baseUnit.trim() || "pcs",
        conversionFactor: values.conversionFactor || "1",
        costPrice: Number(values.costPrice) || 0,
        stock: Number(values.stock) || 0,
        minStock: Number(values.minStock) || 0,
        status: "active",
        store: Number(store)
      });
      await queryClient.invalidateQueries(ingredientsKey(store));
      onCreated(res?.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, { numeric = false } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`link-item-${key}`}>{t(`${P}.create.${key}`)}</Label>
      <Input
        id={`link-item-${key}`}
        value={values[key]}
        inputMode={numeric ? "numeric" : undefined}
        onChange={numeric ? setNumber(key) : set(key)}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`${P}.create.title`)}</DialogTitle>
          <DialogDescription>{t(`${P}.create.desc`)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">{field("name")}</div>
          {field("unit")}
          {field("baseUnit")}
          {field("conversionFactor", { numeric: true })}
          {field("costPrice", { numeric: true })}
          {field("stock", { numeric: true })}
          {field("minStock", { numeric: true })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t(`${P}.create.cancel`)}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {t(`${P}.create.save`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

CreateItemDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  defaultName: PropTypes.string,
  onCreated: PropTypes.func.isRequired
};

// One outlet: pick its item and how many base units one sold unit uses;
// the item's balance, minimum and cost are shown read-only (FR-02).
const LinkRow = ({ store, link, onChange, productName, showStoreName }) => {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const { items, isLoading } = useLinkItems(store.id);
  const item = items.find((i) => String(i.id) === String(link?.ingredientId));
  const qty = link?.qty ?? 1;
  const update = (patch) => onChange({ store: String(store.id), qty, ...link, ...patch });

  return (
    <div className="rounded-lg border border-border p-4 space-y-3" data-testid="inventory-link-row">
      {showStoreName && <p className="text-sm font-semibold text-foreground">{store.name}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="inventory-link-field-item">{t(`${P}.item`)}</Label>
          <Combobox
            id="inventory-link-field-item"
            options={[
              { value: "", label: t(isLoading ? `${P}.loading` : `${P}.selectItem`) },
              ...items.map((i) => ({
                value: String(i.id),
                label: `${i.name} (${i.baseUnit || i.unit})`
              }))
            ]}
            value={link?.ingredientId ? String(link.ingredientId) : ""}
            onChange={(value) => update({ ingredientId: value })}
            placeholder={t(`${P}.selectItem`)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`link-qty-${store.id}`}>
            {t(`${P}.qty`, { unit: item?.baseUnit || "pcs" })}
          </Label>
          <Input
            id={`link-qty-${store.id}`}
            inputMode="numeric"
            value={qty === "" ? "" : String(qty)}
            onChange={(e) => {
              const raw = digits(e.target.value);
              update({ qty: raw ? Number(raw) : "" });
            }}
          />
        </div>
      </div>
      {item ? (
        <dl
          className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"
          data-testid="inventory-link-summary">
          <div>
            <dt className="text-xs text-muted-foreground">{t(`${P}.stock`)}</dt>
            <dd className="font-medium">
              {formatQty(item.stock)} {item.baseUnit}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t(`${P}.minStock`)}</dt>
            <dd className="font-medium">
              {formatQty(item.minStock)} {item.baseUnit}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t(`${P}.unitCost`)}</dt>
            <dd className="font-medium">{formatRp(linkUnitCost(item, qty))}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t(`${P}.available`)}</dt>
            <dd className="font-medium">{formatQty(linkAvailableUnits(item, qty))}</dd>
          </div>
          <div className="col-span-2 md:col-span-4">
            <Link
              to={`/detail-ingredient?id=${item.id}`}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline">
              {t(`${P}.openItem`)}
            </Link>
          </div>
        </dl>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} className="mr-1" />
          {t(`${P}.createItem`)}
        </Button>
      )}
      {creating && (
        <CreateItemDialog
          open={creating}
          onOpenChange={setCreating}
          store={store.id}
          defaultName={productName}
          onCreated={(created) => created?.id && update({ ingredientId: String(created.id) })}
        />
      )}
    </div>
  );
};

LinkRow.propTypes = {
  store: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string
  }).isRequired,
  link: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  productName: PropTypes.string,
  showStoreName: PropTypes.bool
};

// BRD BR-02/FR-06/FR-07: the inventory item a finished good sells from, one
// per outlet that sells it. No stock, minimum or cost is asked for — they
// are the item's.
const InventoryLinkField = ({ stores, value = [], onChange, productName = "", error }) => {
  const { t } = useTranslation();
  const setLink = (next) =>
    onChange([...value.filter((l) => String(l.store) !== String(next.store)), next]);

  return (
    <fieldset className="space-y-3" data-testid="inventory-link-field">
      <legend className="text-sm font-medium text-foreground">{t(`${P}.label`)}</legend>
      <p className="text-xs text-muted-foreground">{t(`${P}.hint`)}</p>
      {stores.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="note">
          {t(`${P}.needsStore`)}
        </p>
      ) : (
        stores.map((store) => (
          <LinkRow
            key={store.id}
            store={store}
            link={value.find((l) => String(l.store) === String(store.id))}
            onChange={setLink}
            productName={productName}
            showStoreName={stores.length > 1 || !!store.name}
          />
        ))
      )}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </fieldset>
  );
};

InventoryLinkField.propTypes = {
  stores: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string
    })
  ).isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  productName: PropTypes.string,
  error: PropTypes.string
};

// Read-only list of a linked product's items per outlet (product detail),
// from GET /product/get-by-id `inventoryLinks`.
export const LinkedItemList = ({ links = [] }) => {
  const { t } = useTranslation();
  if (!links.length) return null;
  return (
    <div className="space-y-2" data-testid="linked-item-list">
      <p className="text-xs text-muted-foreground">{t(`${P}.label`)}</p>
      {links.map((l) => (
        <div
          key={l.bomId ?? l.store}
          className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border border-border/40 text-sm">
          <span className="font-medium">
            {l.storeName ? `${l.storeName} · ` : ""}
            <Link
              to={`/detail-ingredient?id=${l.ingredientId}`}
              className="text-primary underline-offset-2 hover:underline">
              {l.ingredientName}
            </Link>
            {l.qty > 1 ? ` × ${formatQty(l.qty)} ${l.baseUnit}` : ""}
          </span>
          <span className="text-muted-foreground">
            {t(`${P}.stock`)}: {formatQty(l.stock)} {l.baseUnit} · {t(`${P}.minStock`)}:{" "}
            {formatQty(l.minStock)} {l.baseUnit} · {t(`${P}.unitCost`)}: {formatRp(l.unitCost)}
          </span>
        </div>
      ))}
    </div>
  );
};

LinkedItemList.propTypes = { links: PropTypes.array };

export default InventoryLinkField;
