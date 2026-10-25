import {
  buildEmployeeShiftConflictMap,
  findEmployeeShiftConflicts,
  shiftsOverlap
} from "../page/shift/shiftOverlap";

const candidate = (overrides = {}) => ({
  nama_shift: "Pagi",
  tipe_shift: "harian",
  tanggal_mulai: "2026-09-10",
  jam_mulai: "08:00",
  jam_selesai: "17:00",
  ...overrides
});

const existing = (overrides = {}) => ({
  id: 1,
  nama_shift: "Sore",
  tanggal_mulai: "2026-09-10",
  tanggal_selesai: "2026-09-10",
  jam_mulai: "13:00",
  jam_selesai: "21:00",
  karyawan: [7],
  status: "active",
  ...overrides
});

describe("shiftOverlap", () => {
  test("detects overlapping times on the same date", () => {
    expect(shiftsOverlap(candidate(), existing())).toBe(true);
  });

  test("allows back-to-back shifts", () => {
    expect(shiftsOverlap(candidate(), existing({ jam_mulai: "17:00", jam_selesai: "21:00" }))).toBe(
      false
    );
  });

  test("allows the same time on a different date", () => {
    expect(
      shiftsOverlap(
        candidate(),
        existing({ tanggal_mulai: "2026-09-11", tanggal_selesai: "2026-09-11" })
      )
    ).toBe(false);
  });

  test("detects a weekly range intersection", () => {
    expect(
      shiftsOverlap(
        candidate({ tipe_shift: "mingguan", tanggal_selesai: "2026-09-16" }),
        existing({ tanggal_mulai: "2026-09-15", tanggal_selesai: "2026-09-20" })
      )
    ).toBe(true);
  });

  test("detects an overnight shift carrying into the next morning", () => {
    expect(
      shiftsOverlap(
        candidate({ jam_mulai: "22:00", jam_selesai: "06:00" }),
        existing({
          tanggal_mulai: "2026-09-11",
          tanggal_selesai: "2026-09-11",
          jam_mulai: "05:00",
          jam_selesai: "10:00"
        })
      )
    ).toBe(true);
  });

  test("ignores an inactive shift", () => {
    expect(findEmployeeShiftConflicts([existing({ status: "inactive" })], 7, candidate())).toEqual(
      []
    );
  });

  test("checks every shift for an employee instead of only the first", () => {
    const shifts = [
      existing({
        id: 1,
        nama_shift: "Minggu Depan",
        tanggal_mulai: "2026-09-20",
        tanggal_selesai: "2026-09-20"
      }),
      existing({
        id: 2,
        nama_shift: "Bentrok",
        tanggal_mulai: "2026-09-10",
        tanggal_selesai: "2026-09-10"
      })
    ];

    const conflicts = findEmployeeShiftConflicts(shifts, 7, candidate());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].shiftName).toBe("Bentrok");
  });

  test("matches employee ids stored as strings", () => {
    expect(
      findEmployeeShiftConflicts([existing({ karyawan: ["7"] })], 7, candidate())
    ).toHaveLength(1);
  });

  test("builds a conflict map for every affected employee", () => {
    const shifts = [
      existing({ id: 1, karyawan: [7, 8] }),
      existing({
        id: 2,
        karyawan: [8, 9],
        tanggal_mulai: "2026-09-11",
        tanggal_selesai: "2026-09-11"
      }),
      existing({ id: 3, karyawan: [10], status: "inactive" })
    ];

    const conflicts = buildEmployeeShiftConflictMap(shifts, candidate());

    expect(conflicts["7"]).toHaveLength(1);
    expect(conflicts["8"]).toHaveLength(1);
    expect(conflicts["8"][0].shiftId).toBe(1);
    expect(conflicts["9"]).toBeUndefined();
    expect(conflicts["10"]).toBeUndefined();
  });
});
