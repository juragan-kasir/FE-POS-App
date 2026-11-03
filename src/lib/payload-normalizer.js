/**
 * Utility to normalize form payloads before sending to API services.
 * Handles store context, JSON serialization, and optional field cleanup.
 */

export const normalizePayload = (data, options = {}) => {
  // clearableFields: keys sent as "" when empty instead of being dropped, so
  // an edit can clear them. The BE leaves a field it does not receive
  // unchanged (PGA-08), so dropping an emptied field would keep its old value.
  const {
    isFormData = true,
    jsonFields = [],
    storeField = "store",
    clearableFields = []
  } = options;

  if (isFormData) {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      // Handle store fields specifically
      if (key === storeField || key === "stores") {
        if (Array.isArray(value)) {
          formData.append(key, value.length > 0 ? JSON.stringify(value) : "");
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
        return;
      }

      // Handle JSON fields
      if (jsonFields.includes(key)) {
        formData.append(key, JSON.stringify(value));
        return;
      }

      // Handle file arrays: append every File under the same key (multiple upload)
      if (Array.isArray(value) && value.every((v) => v instanceof File)) {
        value.forEach((v) => formData.append(key, v));
        return;
      }

      // Handle standard fields
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      } else if (clearableFields.includes(key)) {
        formData.append(key, "");
      }
    });
    return formData;
  }

  // Handle JSON payload
  const normalized = { ...data };
  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined || normalized[key] === null || normalized[key] === "") {
      if (clearableFields.includes(key)) normalized[key] = "";
      else delete normalized[key];
    }
  });
  return normalized;
};
