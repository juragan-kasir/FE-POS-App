// BE answers 409 { code: "SKU_TAKEN", field: "sku" } when the typed SKU is
// already used by another product of the tenant (deleted ones included).
// The response interceptor has already put the localized text in `message`.
export const isSkuTaken = (err) => err?.response?.data?.code === "SKU_TAKEN";

// Puts the refusal on the SKU field and sends the user back to the step that
// holds it, instead of a modal far away from the field to fix.
export const showSkuTaken = ({ err, form, setCurrentStep, fallback }) => {
  form.setError("sku", { type: "server", message: err?.response?.data?.message || fallback });
  setCurrentStep(1);
};
