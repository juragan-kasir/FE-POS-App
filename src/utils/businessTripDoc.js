import { dateLocale } from "@/lib/locale";

const fmtNum = (n) => Number(n || 0).toLocaleString("id-ID");

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" });
};

export const buildTripRows = (trip, t = (k) => k) => {
  const employees = trip.employees?.length ? trip.employees : [];
  const budgetItems = trip.budgetItems?.length ? trip.budgetItems : [];
  const declaredBudget = Number(trip.budget || 0);
  const breakdownTotal = budgetItems.reduce((s, b) => s + Number(b.total || 0), 0);

  const rows = [];
  rows.push([t("document.brandName")]);
  rows.push([t("document.brandAddress")]);
  rows.push([]);
  rows.push([t("page.businessTrip.detail.spdTitle")]);
  rows.push([`${t("document.no")}:`, trip.tripNumber]);
  rows.push([`${t("page.businessTrip.detail.submittedAt")}:`, fmtDate(new Date())]);
  rows.push([]);

  // SECTION I — employees
  rows.push([t("page.businessTrip.detail.sectionEmployee")]);
  rows.push([
    t("page.businessTrip.detail.employee"),
    employees[0]?.employeeUser?.fullName || employees[0]?.employeeName || "",
    "",
    t("page.businessTrip.detail.position"),
    employees[0]?.employeePosition || ""
  ]);
  rows.push([
    t("page.businessTrip.detail.destination"),
    trip.destination || "",
    "",
    t("page.businessTrip.detail.costCenter"),
    trip.storeData?.name || ""
  ]);
  rows.push([]);

  // SECTION II — trip detail
  rows.push([t("page.businessTrip.detail.sectionTrip")]);
  rows.push([t("page.businessTrip.detail.purpose"), trip.tripPurpose || ""]);
  rows.push([t("page.businessTrip.detail.destination"), trip.destination || ""]);
  rows.push([
    t("page.businessTrip.detail.departureDate"),
    fmtDate(trip.departureDate),
    "",
    t("page.businessTrip.detail.returnDate"),
    fmtDate(trip.returnDate)
  ]);
  rows.push([]);

  // SECTION III — RAB
  rows.push([t("page.businessTrip.detail.sectionRab")]);
  rows.push([
    t("page.businessTrip.rab.no"),
    t("page.businessTrip.rab.komponen"),
    t("page.businessTrip.rab.qty"),
    t("page.businessTrip.rab.satuan"),
    t("page.businessTrip.rab.tarif"),
    t("page.businessTrip.rab.total"),
    t("page.businessTrip.rab.catatan")
  ]);
  budgetItems.forEach((b, i) => {
    rows.push([
      i + 1,
      b.komponen || "",
      b.qty != null ? fmtNum(b.qty) : "",
      b.satuan || "",
      b.tarif != null ? fmtNum(b.tarif) : "",
      b.total != null ? fmtNum(b.total) : "",
      b.catatan || ""
    ]);
  });
  rows.push([t("page.businessTrip.rab.totalEstimate"), "", "", "", "", fmtNum(breakdownTotal)]);
  rows.push([t("page.businessTrip.rab.cashAdvance"), "", "", "", "", fmtNum(declaredBudget)]);
  if (declaredBudget > 0 && budgetItems.length > 0 && breakdownTotal !== declaredBudget) {
    rows.push([
      t("page.businessTrip.rab.mismatchWarning"),
      "",
      "",
      "",
      "",
      fmtNum(Math.abs(declaredBudget - breakdownTotal))
    ]);
  }
  rows.push([]);

  // SECTION IV — approval
  rows.push([t("page.businessTrip.detail.sectionApproval")]);
  rows.push([
    t("page.businessTrip.detail.approverApplicant"),
    t("page.businessTrip.detail.approverManager"),
    t("page.businessTrip.detail.approverHead"),
    t("page.businessTrip.detail.approverFinance")
  ]);
  rows.push([
    employees[0]?.employeeUser?.fullName || employees[0]?.employeeName || "",
    "",
    trip.approvedByUser?.fullName || "",
    ""
  ]);

  return rows;
};
