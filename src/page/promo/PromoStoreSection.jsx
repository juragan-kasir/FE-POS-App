import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { useLocations } from "@/queries/useLocations";

const PromoStoreSection = ({ storeScope }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: locationsData,
    isLoading: locationsLoading,
    isFetching: locationsFetching
  } = useLocations("active");

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Megaphone size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {t("page.bundle.form.storeSection.title")}
            </h3>
            <p className="text-xs text-white/80 mt-0.5">
              {t("page.bundle.form.storeSection.desc")}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <StoreSelectCard
          locations={locationsData?.data || []}
          selectedStores={storeScope.selectedStores}
          onChange={storeScope.handleStoreChange}
          isSuperAdmin={true}
          user={{ store: null }}
          t={t}
          title={t("page.bundle.form.storeSection.title")}
          description={t("page.bundle.form.storeSection.desc")}
          noStoreLabel={t("page.bundle.form.storeSection.noStore")}
          addStoreLabel={t("page.bundle.form.storeSection.addStore")}
          storeInfoLabel={t("page.bundle.form.storeInfo")}
          allStores={storeScope.allStores}
          onAllStoresChange={storeScope.handleAllStoresChange}
          navigate={navigate}
          mandatory={true}
          locationsLoading={locationsLoading || locationsFetching}
        />
      </div>
    </div>
  );
};

export default PromoStoreSection;
