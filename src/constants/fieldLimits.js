// Field-length standard (BA DR-28, 2026-10-24): the FE maximum per field
// kind. The BE refuses anything longer with 400 (VALUE_TOO_LONG / per-field
// zod limits); the DB column is never narrower than these.
//
// A column that stays narrower than the standard keeps its own length — see
// CURRENT_DB_LIMITS. (Tenant name, URL columns and the stock transfer reason
// were widened by batch B5 and now take the standard.)
export const FIELD_LIMITS = Object.freeze({
  PERSON_NAME: 100,
  BUSINESS_NAME: 150,
  SHORT_LABEL: 50,
  UNIT: 20,
  REGION: 50,
  POSTAL_CODE: 10,
  ADDRESS: 255,
  PHONE: 20,
  EMAIL: 254,
  URL: 2048,
  DOCUMENT_NUMBER: 50,
  CODE: 50,
  BARCODE: 50,
  REFERENCE: 255,
  NPWP: 20,
  NITKU: 22,
  BANK_ACCOUNT: 34,
  VEHICLE_PLATE: 15,
  HEX_COLOR: 9,
  SHORT_NOTE: 140,
  DESCRIPTION: 255
});

// Columns that stay narrower than the standard.
export const CURRENT_DB_LIMITS = Object.freeze({
  ACCOUNT_CODE: 20 // account.code VARCHAR(20)
});
