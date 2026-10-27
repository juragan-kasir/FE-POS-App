/**
 * Validate values against a zod schema and return deduplicated list of missing field labels.
 * @param {object} values - form values
 * @param {z.ZodObject} schema - zod schema to validate against
 * @param {Record<string, string>} fieldLabels - map of field names to display labels
 * @param {Array<{name: string, message: string}>} [extraErrors] - additional manual errors (e.g. photo)
 * @returns {string[]} array of missing field labels
 */
export function getMissingFields(values, schema, fieldLabels = {}, extraErrors = []) {
  const result = schema.safeParse(values);
  const fields = [];

  if (!result.success) {
    const seen = new Set();
    result.error.errors.forEach((err) => {
      const name = err.path[0];
      if (!seen.has(name)) {
        seen.add(name);
        fields.push(fieldLabels[name] || name);
      }
    });
  }

  extraErrors.forEach(({ name }) => {
    if (!fields.includes(fieldLabels[name] || name)) {
      fields.push(fieldLabels[name] || name);
    }
  });

  return fields;
}

// zod reports in English ("String must contain at least 1 character(s)");
// map each issue to a short message a user can act on.
const fieldMessage = (err, t) => {
  const missing =
    (err.code === "invalid_type" && (err.received === "undefined" || err.received === "null")) ||
    (err.code === "too_small" &&
      (((err.type === "string" || err.type === "array") && err.minimum <= 1) ||
        (err.type === "number" && err.minimum === 1)));
  if (missing) return t("fieldError.required", { defaultValue: "Wajib diisi" });
  if (err.code === "invalid_string" && err.validation === "email") {
    return t("fieldError.email", { defaultValue: "Format email tidak valid" });
  }
  if (err.code === "too_small") {
    return err.type === "string"
      ? t("fieldError.minChars", {
          min: err.minimum,
          defaultValue: `Minimal ${err.minimum} karakter`
        })
      : t("fieldError.min", { min: err.minimum, defaultValue: `Minimal ${err.minimum}` });
  }
  if (err.code === "too_big") {
    return err.type === "string"
      ? t("fieldError.maxChars", {
          max: err.maximum,
          defaultValue: `Maksimal ${err.maximum} karakter`
        })
      : t("fieldError.max", { max: err.maximum, defaultValue: `Maksimal ${err.maximum}` });
  }
  // custom()/refine() messages are written for users already.
  if (err.code === "custom" && err.message) return err.message;
  return t("fieldError.invalid", { defaultValue: "Isian tidak valid" });
};

/**
 * Validate values against a zod schema and return one message per field.
 * @param {object} values - form values
 * @param {z.ZodTypeAny} schema - zod schema to validate against
 * @param {(key: string, options?: object) => string} t - i18next t
 * @returns {Record<string, string>} first message per top-level field name
 */
export function getFieldErrors(values, schema, t) {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors = {};
  result.error.errors.forEach((err) => {
    const name = err.path[0];
    if (name !== undefined && !(name in errors)) errors[name] = fieldMessage(err, t);
  });
  return errors;
}
