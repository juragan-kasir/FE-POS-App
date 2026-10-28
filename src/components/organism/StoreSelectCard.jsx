import React from "react";
import PropTypes from "prop-types";
import { Store, Plus, Check, Info, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const StoreSelectCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full rounded-lg" />
    <Skeleton className="h-[72px] w-full rounded-lg" />
  </div>
);

const StoreSelectCard = ({
  locations,
  selectedStores,
  onChange,
  isSuperAdmin,
  user,
  t,
  title,
  description,
  noStoreLabel,
  addStoreLabel,
  storeInfoLabel,
  allStores,
  onAllStoresChange,
  navigate,
  mandatory,
  locationsLoading
}) => {
  // A super_admin with exactly one store has nothing to pick: an empty
  // choice becomes that store, while a record already set to "Semua Toko"
  // (global, also covers stores added later) keeps that meaning.
  const singleStore = isSuperAdmin && !locationsLoading && locations.length === 1;
  const singleStoreId = singleStore ? locations[0].id : null;
  React.useEffect(() => {
    if (singleStoreId != null && !allStores && selectedStores.length === 0) {
      onChange([singleStoreId]);
    }
  }, [singleStoreId, allStores, selectedStores.length, onChange]);

  if (singleStore) {
    return (
      <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Store size={16} className="shrink-0" />
        <span>
          {storeInfoLabel}{" "}
          <strong className="text-foreground">
            {allStores ? t("page.category.form.storeSection.allStores") : locations[0].name}
          </strong>
        </span>
      </div>
    );
  }

  if (!isSuperAdmin) {
    if (allStores) {
      return (
        <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Store size={16} className="shrink-0" />
          <span>
            {storeInfoLabel}{" "}
            <strong className="text-foreground">
              {t("page.category.form.storeSection.allStores")}
            </strong>
          </span>
        </div>
      );
    }
    if (selectedStores.length > 0 || user?.store) {
      const storeName =
        locations.find((l) => l.id === selectedStores[0])?.name ||
        user?.storeName ||
        `Toko #${selectedStores[0] || user?.store || ""}`;
      return (
        <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Store size={16} className="shrink-0" />
          <span>
            {storeInfoLabel} <strong className="text-foreground">{storeName}</strong>
          </span>
        </div>
      );
    }
    return null;
  }

  const allSelected = locations.length > 0 && selectedStores.length === locations.length;

  const handleSelectAll = () => {
    onChange(allSelected ? [] : locations.map((l) => l.id));
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <Store size={20} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {title}
            {mandatory && <span className="text-destructive ml-0.5">*</span>}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {locations.length > 0 && !allStores && (
          <span className="text-xs text-muted-foreground shrink-0">
            {t("page.product.add.storeSection.selected", { count: selectedStores.length })}
          </span>
        )}
      </div>
      {locationsLoading ? (
        <StoreSelectCardSkeleton />
      ) : locations.length === 0 ? (
        <div className="flex items-center gap-3 pl-9">
          <p className="text-sm text-muted-foreground">{noStoreLabel}</p>
          <Button
            variant="success"
            size="sm"
            onClick={() => navigate("/add-location")}
            className="gap-1.5 shrink-0">
            <Plus size={16} />
            {addStoreLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ponytail: tab segmented — Semua Toko vs pilih spesifik, state ikut allStores */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
            {[
              { id: "all", label: t("page.category.form.storeSection.allStores"), icon: Store },
              {
                id: "specific",
                label: t("page.category.form.storeSection.specificTab"),
                icon: LayoutGrid
              }
            ].map((tab) => {
              const isActive = allStores ? tab.id === "all" : tab.id === "specific";
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (isActive) return;
                    if (tab.id === "all") {
                      onAllStoresChange?.(true);
                      onChange([]);
                    } else {
                      onAllStoresChange?.(false);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <TabIcon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {allStores ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border/50">
              <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {t("page.category.form.storeSection.allStoresDesc")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      allSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground"
                    }`}>
                    {allSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  {t("common.selectAll")}
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => {
                  const isChecked = selectedStores.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() =>
                        onChange(
                          isChecked
                            ? selectedStores.filter((id) => id !== loc.id)
                            : [...selectedStores, loc.id]
                        )
                      }
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        isChecked
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}>
                      {loc.name}
                      {isChecked && <Check size={14} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

StoreSelectCard.propTypes = {
  locations: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.number.isRequired, name: PropTypes.string })
  ),
  selectedStores: PropTypes.arrayOf(PropTypes.number),
  onChange: PropTypes.func.isRequired,
  isSuperAdmin: PropTypes.bool,
  user: PropTypes.shape({ store: PropTypes.number, storeName: PropTypes.string }),
  t: PropTypes.func.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  noStoreLabel: PropTypes.string,
  addStoreLabel: PropTypes.string,
  storeInfoLabel: PropTypes.string,
  allStores: PropTypes.bool,
  onAllStoresChange: PropTypes.func,
  navigate: PropTypes.func.isRequired,
  mandatory: PropTypes.bool,
  locationsLoading: PropTypes.bool
};

export default StoreSelectCard;
