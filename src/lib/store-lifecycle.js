/**
 * HB-2 R1: authoritative store lifecycle field for location payloads.
 *
 * The UI sends `status` ("draft" | "active" | "inactive") as the single
 * lifecycle input and never sends `isActive`: FormData stringifies booleans,
 * so isActive:"false" would arrive truthy and the BE must not interpret it.
 *
 * - saveAsDraft always resolves to "draft" (existing draft behavior).
 * - otherwise the lifecycle control must have been touched; an untouched
 *   control resolves to undefined so a configuration-only edit carries no
 *   lifecycle field (normalizePayload drops undefined in both JSON and
 *   FormData modes).
 */
export const resolveSubmitStatus = ({ saveAsDraft, lifecycleTouched, isActive } = {}) => {
  if (saveAsDraft) return "draft";
  if (!lifecycleTouched) return undefined;
  return isActive ? "active" : "inactive";
};

// The one way back to "active" for a store taken out of service. The edit form
// may not activate an inactive/closed/archived store (BE
// STORE_ACTIVATION_NOT_PERMITTED); "Aktifkan Kembali" (/reactivate-location)
// does, with a reason and an audit row. Terminal states never come back.
export const REACTIVATABLE_STATUSES = Object.freeze(["archived", "inactive", "closed"]);

export const isReactivatableStatus = (status) => REACTIVATABLE_STATUSES.includes(status);
