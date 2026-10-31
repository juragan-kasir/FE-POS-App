import { useQuery } from "react-query";
import { getCampaigns } from "@/services/promo";
import { getAllProduct } from "@/services/product";
import { getAllCategoryActive } from "@/services/category";
import { getAllMemberTier } from "@/services/member-tier";

const COMBINABLE_LIST_LIMIT = 50;
const PRODUCT_REWARD_TYPES = ["free_item", "buy_x_get_y"];

const asList = (value) => (Array.isArray(value) ? value : []);

export const usePromoOptions = ({
  effectiveStore,
  allStores,
  applicableTo,
  rules,
  rewards,
  isCombinable,
  excludeCampaignId
}) => {
  const hasStoreScope = allStores || !!effectiveStore;
  const needsProducts =
    rules.some((r) => r.ruleType === "buy_x_get_y") ||
    rewards.some((r) => PRODUCT_REWARD_TYPES.includes(r.rewardType));
  const needsTiers = rules.some((r) => r.ruleType === "member_tier");

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["promo-product-options", effectiveStore],
    () => getAllProduct({ location: effectiveStore }),
    { enabled: (needsProducts || applicableTo === "specific_products") && hasStoreScope }
  );
  const productOptions = asList(productsData?.data?.items || productsData?.data).map((p) => ({
    value: String(p.id),
    label: p.nameProduct || `Produk #${p.id}`
  }));

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ["promo-category-options", effectiveStore],
    () => getAllCategoryActive({ location: effectiveStore }),
    { enabled: applicableTo === "specific_categories" && hasStoreScope }
  );
  const categoryOptions = asList(categoriesData?.data || categoriesData?.categories).map((c) => ({
    value: String(c.id),
    label: c.nameCategory || c.name || `Kategori #${c.id}`
  }));

  const { data: tiersData } = useQuery(["promo-tier-options"], () => getAllMemberTier(), {
    enabled: needsTiers || applicableTo === "specific_members"
  });
  const tierOptions = asList(tiersData?.data).map((tier) => ({
    value: String(tier.id),
    label: tier.name || tier.nameTier || `Tier #${tier.id}`
  }));

  const { data: combinableData, isLoading: combinableLoading } = useQuery(
    ["promo-combinable-list", effectiveStore],
    () =>
      getCampaigns({
        store: allStores ? undefined : effectiveStore || undefined,
        status: "active",
        limit: COMBINABLE_LIST_LIMIT
      }),
    { enabled: !!isCombinable && hasStoreScope }
  );
  const combinablePromos = asList(combinableData?.data).filter(
    (promo) => String(promo.id) !== String(excludeCampaignId)
  );

  return {
    productOptions,
    productsLoading,
    categoryOptions,
    categoriesLoading,
    tierOptions,
    combinablePromos,
    combinableLoading
  };
};
