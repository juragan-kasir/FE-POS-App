import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Boxes, UtensilsCrossed } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { Input } from "@/components/ui/input";
import { getIngredientStockSummary } from "@/services/ingredient";
import { formatQuantity } from "@/utils/quantity";
import { getIngredientStockState } from "@/utils/ingredientStockState";
import { todayDateOnly } from "@/utils/dateOnly";

const P = "page.ingredient.summary";
const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

const Qty = ({ value, unit, tone }) => (
  <span className={`font-mono ${tone || ""}`}>
    {formatQuantity(value)} <span className="text-xs text-muted-foreground">{unit}</span>
  </span>
);

// Remaining-stock view read from the stock ledger: ingredient pieces
// (opening → consumed/restored/entered → closing) kept apart from menu
// portions sold. A recorded figure is the book stock, not a physical count.
const IngredientStockSummary = ({ store, needsStore }) => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(todayDateOnly());
  const [endDate, setEndDate] = useState(todayDateOnly());
  const isFiltered = startDate !== todayDateOnly() || endDate !== todayDateOnly();

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["ingredient-stock-summary", store, startDate, endDate],
    () => getIngredientStockSummary({ store, startDate, endDate }),
    { enabled: !needsStore, keepPreviousData: true }
  );

  if (needsStore) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t(`${P}.pickStore`)}
      </div>
    );
  }

  const items = data?.data?.items || [];
  const menuSold = data?.data?.menuSold || [];

  const columns = [
    {
      header: t(`${P}.colIngredient`),
      render: (item) => {
        const state = getIngredientStockState(item);
        return (
          <div>
            <p className="font-medium">{item.name}</p>
            {state !== "recorded" && (
              <span className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {t(`page.ingredient.stockState.${state}`)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: t(`${P}.colOpening`),
      align: "right",
      render: (item) =>
        getIngredientStockState(item) === "uninitialized" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Qty value={item.openingBalance} unit={item.unit} />
        )
    },
    {
      header: t(`${P}.colConsumed`),
      align: "right",
      render: (item) => (
        <Qty
          value={item.consumed}
          unit={item.unit}
          tone={item.consumed > 0 ? "text-destructive" : ""}
        />
      )
    },
    {
      header: t(`${P}.colRestored`),
      align: "right",
      render: (item) => <Qty value={item.restored} unit={item.unit} />
    },
    {
      header: t(`${P}.colAdjusted`),
      align: "right",
      render: (item) => (
        <Qty value={item.adjusted + item.counted + item.received + item.other} unit={item.unit} />
      )
    },
    {
      header: t(`${P}.colClosing`),
      align: "right",
      render: (item) =>
        getIngredientStockState(item) === "uninitialized" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Qty value={item.closingBalance} unit={item.unit} tone="font-semibold" />
        )
    },
    {
      header: t(`${P}.colLastCount`),
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.lastCountedAt
            ? new Date(item.lastCountedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })
            : t(`${P}.neverCounted`)}
        </span>
      )
    }
  ];

  const menuColumns = [
    {
      header: t(`${P}.colMenu`),
      render: (m) => <span className="font-medium">{m.productName || `#${m.productId}`}</span>
    },
    {
      header: t(`${P}.colPortions`),
      align: "right",
      render: (m) => <span className="font-mono">{formatQuantity(m.quantity)}</span>
    }
  ];

  const dateFilters = (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary-start" className={fieldLabelClass}>
          {t(`${P}.startDate`)}
        </label>
        <Input
          id="summary-start"
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary-end" className={fieldLabelClass}>
          {t(`${P}.endDate`)}
        </label>
        <Input
          id="summary-end"
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t(`${P}.explainer`)}</p>
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading || isFetching}
        isError={isError}
        onRetry={refetch}
        emptyMessage={t(`${P}.empty`)}
        emptyIcon={Boxes}
        toolbar={
          <TableToolbar
            title={t(`${P}.title`)}
            isFiltered={isFiltered}
            onReset={() => {
              setStartDate(todayDateOnly());
              setEndDate(todayDateOnly());
            }}>
            {dateFilters}
          </TableToolbar>
        }
      />
      <DataTable
        columns={menuColumns}
        data={menuSold}
        isLoading={isLoading || isFetching}
        isError={isError}
        onRetry={refetch}
        emptyMessage={t(`${P}.menuEmpty`)}
        emptyIcon={UtensilsCrossed}
        toolbar={<TableToolbar title={t(`${P}.menuTitle`)} />}
      />
    </div>
  );
};

export default IngredientStockSummary;
