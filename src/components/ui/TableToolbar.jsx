import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";

const TableToolbar = ({ title, onReset, isFiltered, children }) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const filters = React.Children.toArray(children).filter(Boolean);
  const filtersId = React.useId();

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-foreground shrink-0">{title}</h4>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="gap-2 h-9 lg:hidden"
          aria-expanded={showFilters}
          aria-controls={filtersId}
          onClick={() => setShowFilters(!showFilters)}>
          <ListFilter size={16} />
          {t("common.filter")}
        </Button>
      </div>
      <div
        id={filtersId}
        className={`${showFilters ? "flex" : "hidden"} lg:flex flex-row flex-wrap items-end gap-3 w-full`}>
        {filters.map((filter, i) => (
          <div key={i} className="flex flex-col gap-1.5 flex-1 min-w-[150px] empty:hidden">
            {filter}
          </div>
        ))}
        {onReset && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <span
              aria-hidden="true"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground invisible">
              &nbsp;
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5"
              onClick={onReset}
              disabled={isFiltered === undefined ? false : !isFiltered}>
              <RotateCcw size={14} />
              {t("common.resetFilter")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableToolbar;
