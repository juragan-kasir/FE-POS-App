import React, { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Modal from "@/components/organism/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { adjustIngredientStock } from "@/services/ingredient";
import { toQuantity, formatQuantity } from "@/utils/quantity";
import { getIngredientStockState } from "@/utils/ingredientStockState";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const P = "page.ingredient.adjust";
const fieldLabelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

// Opening stock / count / correction for one ingredient through the
// audited adjust-stock endpoint. The server computes the change from its
// own locked value, so a sale landing meanwhile is never overwritten.
const AdjustIngredientStockModal = ({ ingredient, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const stockState = getIngredientStockState(ingredient);
  const recorded = stockState === "recorded";
  const [type, setType] = useState(recorded ? "add" : "set");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState(recorded ? "" : t(`${P}.openingNote`));
  const [error, setError] = useState(null);
  const unit = ingredient?.baseUnit || ingredient?.unit || "pcs";

  const mutation = useMutation(
    () =>
      adjustIngredientStock(ingredient.id, {
        type,
        quantity: Number(quantity.replace(",", ".")),
        notes: notes.trim() || null
      }),
    {
      onSuccess: (res) => {
        toast.success(t(`${P}.toastSuccess`), {
          description: t(`${P}.toastSuccessDesc`, {
            name: ingredient.name,
            before: formatQuantity(res?.data?.quantityBefore),
            after: formatQuantity(res?.data?.quantityAfter),
            unit
          })
        });
        queryClient.invalidateQueries(["ingredients"]);
        queryClient.invalidateQueries(["ingredient-stock-summary"]);
        onClose();
      },
      onError: (err) => {
        const message =
          err?.response?.data?.code === "INGREDIENT_STOCK_CONFLICT"
            ? t(`${P}.errorInsufficient`)
            : err?.response?.status === 403
              ? t(`${P}.errorForbidden`)
              : err?.response?.data?.message || err.message;
        setError(message);
      }
    }
  );

  // Modal convention: false keeps it open (validation error / request running).
  const submit = () => {
    const n = Number(String(quantity).replace(",", "."));
    if (quantity === "" || !Number.isFinite(n) || n < 0 || (type !== "set" && n === 0)) {
      setError(t(`${P}.errorQuantity`));
      return false;
    }
    setError(null);
    mutation.mutate();
    return false;
  };

  const current = toQuantity(ingredient?.stock);
  const n = Number(String(quantity).replace(",", "."));
  const preview = !Number.isFinite(n)
    ? null
    : type === "set"
      ? n
      : type === "add"
        ? current + n
        : current - n;

  return (
    <Modal
      type="form"
      open={!!ingredient}
      onOpenChange={(next) => !next && !mutation.isLoading && onClose()}
      title={t(`${P}.title`, { name: ingredient?.name || "" })}
      description={recorded ? t(`${P}.description`) : t(`${P}.descriptionOpening`)}
      confirmText={t(`${P}.save`)}
      loading={mutation.isLoading}
      onConfirm={submit}>
      <div className="space-y-4 py-2">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">{t(`${P}.current`)}: </span>
          {stockState === "uninitialized" ? (
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {t("page.ingredient.stockState.uninitialized")}
            </span>
          ) : (
            <>
              <span className="font-mono font-semibold">
                {formatQuantity(current)} {unit}
              </span>
              {stockState === "unrecorded" && (
                <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {t("page.ingredient.stockState.unrecorded")}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass}>{t(`${P}.type`)}</label>
          <Combobox
            options={[
              { value: "set", label: t(`${P}.typeSet`) },
              { value: "add", label: t(`${P}.typeAdd`) },
              { value: "subtract", label: t(`${P}.typeSubtract`) }
            ]}
            value={type}
            onChange={(v) => {
              setType(v || "set");
              setError(null);
            }}
            placeholder={t(`${P}.type`)}
            searchPlaceholder={t("common.search")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="adjust-qty" className={fieldLabelClass}>
            {t(`${P}.quantity`, { unit })} <span className="text-destructive">*</span>
          </label>
          <Input
            id="adjust-qty"
            inputMode="decimal"
            autoComplete="off"
            value={quantity}
            aria-invalid={!!error || undefined}
            onChange={(e) => {
              setQuantity(e.target.value.replace(/[^0-9.,]/g, ""));
              setError(null);
            }}
          />
          {quantity !== "" && preview !== null && (
            <p className="text-xs text-muted-foreground">
              {t(`${P}.preview`, { value: formatQuantity(preview), unit })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="adjust-notes" className={fieldLabelClass}>
            {t(`${P}.notes`)}
          </label>
          <Textarea
            id="adjust-notes"
            rows={2}
            maxLength={FIELD_LIMITS.DESCRIPTION}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default AdjustIngredientStockModal;
