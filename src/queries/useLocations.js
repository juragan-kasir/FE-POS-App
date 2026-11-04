import { useQuery } from "react-query";
import { getAllLocation, getPublicLocations } from "@/services/location";
import { qk } from "./keys";
import { REFERENCE } from "./policies";

// Store list (GET /location/get-location-mine): only the outlets the
// signed-in account may work in (PGA-09). `status`: "active"
// (default, what the BE returns without a status) or "all" (archived too).
// Returns the plain useQuery result, so call sites keep their destructuring;
// `options` (enabled, select, onSuccess, retry …) override the policy.
export const useLocations = (status = "active", options = {}) =>
  useQuery(qk.locations.list(status), () => getAllLocation(status === "all" ? "all" : undefined), {
    ...REFERENCE,
    ...options
  });

// Sign-up form only (GET /location/get-location-public): there is no session
// yet, so it cannot use the scoped list above.
export const usePublicLocations = (options = {}) =>
  useQuery(qk.locations.public(), () => getPublicLocations(), {
    ...REFERENCE,
    ...options
  });
