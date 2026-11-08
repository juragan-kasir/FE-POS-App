import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { quantityBreaksOf, repriceLine, roundQty, lineTotalOf } from "@/utils/quantityPrice";

export const orderList = create(
  persist(
    (set, get) => ({
      order: [],
      addOrder: (product) => {
        const id = product.id || product.ID || product.idProduct || product._id;
        const isBundle = Boolean(product.isBundle);
        // W3-4 (K3): selected options and modifiers are kept separately so
        // checkout can send them as the server prices them. Lines with
        // different selections are distinct; bundles get their own key space
        // so a bundle never merges with a product that shares its id.
        const selectedOptions = Array.isArray(product.selectedOptions)
          ? product.selectedOptions
          : [];
        const selectedModifiers = Array.isArray(product.selectedModifiers)
          ? product.selectedModifiers
          : [];
        const choiceKey = [...selectedOptions, ...selectedModifiers]
          .map((entry) => entry?.name)
          .filter(Boolean)
          .join("|");
        const cartKey = isBundle
          ? `bundle:${id}`
          : `${id}_${choiceKey || product.variantName || ""}`;
        const existing = get().order.find((item) => item.cartKey === cartKey);
        if (existing) {
          // F9-02: increment by this line's own current price, not the
          // catalog price passed in — a line's price can have diverged from
          // the catalog via an authorized override (updateItemPrice), and
          // re-adding the same product must keep totalPrice = price * count.
          return set((state) => ({
            order: state.order.map((item) => {
              if (item.cartKey === cartKey) {
                // Retail R1: a quantity break may change the unit price.
                return repriceLine(item, (item.count || 0) + 1);
              }
              return item;
            })
          }));
        }
        const price = Number(product.price || product.sellPrice || 0);
        // Retail R1: grosir breaks replace the catalog unit price; the
        // option/modifier markup (price minus catalog unit) stays on top.
        const quantityBreaks = isBundle ? [] : quantityBreaksOf(product.priceTiers);
        const catalogUnit = Number(product.catalogUnitPrice ?? price);
        const markup = Number.isFinite(catalogUnit) ? Math.max(price - catalogUnit, 0) : 0;
        return set((state) => ({
          order: [
            ...state.order,
            {
              id,
              cartKey,
              nameProduct: product.nameProduct || product.name,
              variantName: product.variantName || null,
              price,
              count: 1,
              totalPrice: price,
              priceOverridden: false,
              // W3-4 (K1): true only when `price` came from the server's
              // effectivePrice/bundlePrice, so checkout may echo it as
              // expectedPrice.
              priceAuthoritative: product.priceAuthoritative === true,
              ...(quantityBreaks.length ? { quantityBreaks, listPrice: price, markup } : {}),
              ...(isBundle ? { isBundle: true, bundleId: id } : {}),
              ...(selectedOptions.length ? { selectedOptions } : {}),
              ...(selectedModifiers.length ? { selectedModifiers } : {}),
              image: product.image || product.imageProduct || product.photo || null,
              unit: product.unit || "",
              // Retail R1: sold by weight / volume (kg, liter), so the count
              // may be a fraction with up to three decimals.
              ...(product.allowDecimalQty ? { allowDecimalQty: true } : {}),
              sku: product.sku || "",
              point: product.point || 0,
              redeemPoints: product.redeemPoints || 0
            }
          ]
        }));
      },

      // W3-4 (W3-2 409 PRICE_CHANGED): applies server-confirmed unit prices
      // only when the cashier explicitly chooses to — never silently. These
      // are catalog prices, not overrides, so priceOverridden stays false.
      applyServerPrices: (updates) => {
        const byKey = new Map();
        (updates || []).forEach((update) => {
          const price = Number(update?.price);
          if (update?.cartKey && Number.isInteger(price) && price >= 0) {
            byKey.set(update.cartKey, price);
          }
        });
        if (!byKey.size) return;
        return set((state) => ({
          order: state.order.map((item) => {
            if (!byKey.has(item.cartKey)) return item;
            const price = byKey.get(item.cartKey);
            return {
              ...item,
              price,
              totalPrice: price * (item.count || 1),
              // The server price is for this count; stop re-pricing locally.
              quantityBreaks: [],
              priceOverridden: false,
              priceAuthoritative: true
            };
          })
        }));
      },
      addingProduct: (item) => {
        return set((state) => {
          return {
            order: [...state.order, item]
          };
        });
      },

      // Decrement Product
      decrementOrder: (decrementOrder) => {
        return set((state) => {
          return {
            order: state.order.map((items) => {
              if (items.cartKey === decrementOrder.cartKey) {
                return repriceLine(items, items.count - 1);
              } else {
                // F9-08: keep the same reference for every other line so a
                // memoized cart row can bail on re-rendering via a plain
                // reference-equality check on its own `item` prop.
                return items;
              }
            })
          };
        });
      },

      // Increment Product
      incrementOrder: (incrementOrder) => {
        return set((state) => {
          return {
            order: state.order.map((items) => {
              if (items.cartKey === incrementOrder.cartKey) {
                return repriceLine(items, items.count + 1);
              } else {
                return items;
              }
            })
          };
        });
      },

      // Set a line's quantity directly (typed into the cart). Whole units
      // unless the product sells by weight (three decimals). Re-prices the
      // line, so a grosir break follows the new quantity.
      setQuantity: (target, quantity) => {
        const key = target?.cartKey || target?.id;
        return set((state) => ({
          order: state.order.map((item) => {
            if ((item.cartKey || item.id) !== key) return item;
            const raw = Number(quantity);
            const qty = item.allowDecimalQty ? roundQty(raw) : Math.round(raw);
            if (!Number.isFinite(qty) || qty <= 0) return item;
            return repriceLine(item, qty);
          })
        }));
      },

      // Delete Product
      handleDeleteOrder: (deleteItems) => {
        const deleteKey = deleteItems?.cartKey || deleteItems?.id;
        return set((state) => {
          return {
            order: state.order.filter((items) => {
              const itemKey = items?.cartKey || items?.id;
              return itemKey !== deleteKey;
            })
          };
        });
      },

      // Update Choose Option Product
      handleUpdateOptionProduct: (val, option, idOrder) => {
        return set((state) => {
          return {
            order: state.order.map((items) => {
              if (items?.id === idOrder) {
                return {
                  ...items,
                  options: items.options.map((opt) => {
                    if (opt?.nameSubCategory === option?.nameSubCategory && option?.isMultiple) {
                      return {
                        ...opt,
                        option: val
                          ? [...opt.option, option]
                          : opt.option.filter((value) => value.name !== option.name)
                      };
                    } else if (
                      opt?.nameSubCategory === option?.nameSubCategory &&
                      !option?.isMultiple
                    ) {
                      return {
                        ...opt,
                        option: option.option,
                        value: val,
                        dataOption: option.dataOption
                      };
                    } else {
                      return { ...opt };
                    }
                  })
                };
              } else {
                return { ...items };
              }
            })
          };
        });
      },

      // Reset Order After Checkout
      resetOrder: () => {
        return set(() => {
          return {
            order: []
          };
        });
      },

      // Update Item Price (override) — F7-01: reject non-finite/negative
      // values here too, not just in the CartPanel UI, so this action can
      // never leave the cart in a NaN/negative-price state no matter what
      // calls it.
      // Price override is transient, order-specific, admin-only (enforced server-side),
      // and distinguishable via priceOverridden boolean even when price equals catalog.
      updateItemPrice: (target, newPrice) => {
        if (newPrice === "" || newPrice === null || newPrice === undefined) return;
        const price = Number(newPrice);
        if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) return;
        return set((state) => {
          return {
            order: state.order.map((items) => {
              const matchKey = target.cartKey || target.id;
              const itemKey = items.cartKey || items.id;
              if (itemKey === matchKey) {
                return {
                  ...items,
                  price,
                  totalPrice: lineTotalOf(price, items.count || 1),
                  priceOverridden: true
                };
              }
              return items;
            })
          };
        });
      }
    }),
    {
      name: "order-list",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
