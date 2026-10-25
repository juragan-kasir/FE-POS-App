import { parseDateOnly } from "@/utils/dateOnly";

const parseTimeToMinutes = (value) => {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
};

const normalizeShift = (shift) => {
  const start = parseDateOnly(shift?.tanggal_mulai);
  if (!start) return null;

  const rawEnd = parseDateOnly(shift?.tanggal_selesai);
  const end = shift?.tipe_shift === "harian" || !rawEnd ? start : rawEnd < start ? start : rawEnd;

  const startMinutes = parseTimeToMinutes(shift?.jam_mulai);
  const endMinutes = parseTimeToMinutes(shift?.jam_selesai);
  if (startMinutes == null || endMinutes == null) return null;

  return { start, end, startMinutes, endMinutes };
};

const intervalFor = (normalized, day) => {
  if (day < normalized.start || day > normalized.end) return null;
  const start = new Date(day);
  start.setHours(Math.floor(normalized.startMinutes / 60), normalized.startMinutes % 60, 0, 0);
  const end = new Date(day);
  end.setHours(Math.floor(normalized.endMinutes / 60), normalized.endMinutes % 60, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
};

const daysAround = (first, last) => {
  const days = [];
  for (let offset = -1; offset <= 1; offset += 1) {
    days.push(addDays(first, offset));
    days.push(addDays(last, offset));
  }
  return [...new Map(days.map((day) => [day.getTime(), day])).values()];
};

const rangesAdjacent = (a, b) =>
  addDays(a.end, 1).getTime() === b.start.getTime() ||
  addDays(b.end, 1).getTime() === a.start.getTime();

export const shiftsOverlap = (first, second) => {
  const a = normalizeShift(first);
  const b = normalizeShift(second);
  if (!a || !b) return false;

  const intersects = a.start <= b.end && b.start <= a.end;
  if (!intersects && !rangesAdjacent(a, b)) return false;

  const checkDays = daysAround(
    intersects ? new Date(Math.max(a.start.getTime(), b.start.getTime())) : a.end,
    intersects ? new Date(Math.min(a.end.getTime(), b.end.getTime())) : b.start
  );

  const aIntervals = checkDays.map((day) => intervalFor(a, day)).filter(Boolean);
  const bIntervals = checkDays.map((day) => intervalFor(b, day)).filter(Boolean);

  return aIntervals.some(([aStart, aEnd]) =>
    bIntervals.some(([bStart, bEnd]) => aStart < bEnd && bStart < aEnd)
  );
};

const isInactive = (shift) =>
  shift?.status === "inactive" || shift?.status === false || shift?.status === 0;

const toConflict = (shift) => ({
  shiftId: shift.id ?? shift._id,
  shiftName: shift.nama_shift || shift.shiftName || "-",
  startTime: String(shift.jam_mulai || shift.startTime || "").slice(0, 5),
  endTime: String(shift.jam_selesai || shift.endTime || "").slice(0, 5),
  tanggalMulai: shift.tanggal_mulai,
  tanggalSelesai: shift.tanggal_selesai,
  storeId: shift.store
});

export const buildEmployeeShiftConflictMap = (shifts, candidate, { excludeShiftId } = {}) => {
  const map = {};
  (shifts || [])
    .filter((shift) => !isInactive(shift))
    .filter((shift) => !excludeShiftId || String(shift.id ?? shift._id) !== String(excludeShiftId))
    .filter((shift) => shiftsOverlap(candidate, shift))
    .forEach((shift) => {
      const conflict = toConflict(shift);
      (shift.karyawan || []).forEach((employeeId) => {
        const key = String(employeeId);
        if (!map[key]) map[key] = [];
        map[key].push(conflict);
      });
    });
  return map;
};

export const findEmployeeShiftConflicts = (shifts, employeeId, candidate) => {
  const candidateId = candidate?.id ?? candidate?._id;
  const conflicts = buildEmployeeShiftConflictMap(shifts, candidate, {
    excludeShiftId: candidateId
  });
  return conflicts[String(employeeId)] || [];
};
