// Id of the record a create endpoint returned ({ success, data: record }), or
// null when the response doesn't carry a single record (e.g. a bulk create),
// so callers only offer "Lihat Detail" when there is something to open.
export const createdId = (res) => {
  const id = res?.data?.id ?? res?.id;
  return typeof id === "number" || (typeof id === "string" && id !== "") ? id : null;
};
