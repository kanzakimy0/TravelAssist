import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarDays,
  fromDateValue,
  moveCalendarDate,
  toDateValue,
} from "../src/features/start-flow/lib/calendar.ts";

test("local dates round-trip without timezone shifts", () => {
  for (const value of ["2026-01-01", "2026-12-31", "2028-02-29"]) {
    assert.equal(toDateValue(fromDateValue(value)), value);
  }
});

test("calendar has 42 consecutive days, beginning on Monday", () => {
  const days = calendarDays(fromDateValue("2026-09-15"));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(toDateValue(days[0]), "2026-08-31");
  assert.equal(toDateValue(days.at(-1)), "2026-10-11");
  assert.equal(new Set(days.map(toDateValue)).size, 42);
});

test("leap day appears in the February calendar", () => {
  assert.ok(
    calendarDays(fromDateValue("2028-02-01")).some(
      (day) => toDateValue(day) === "2028-02-29",
    ),
  );
});

test("arrow navigation crosses year boundaries", () => {
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2026-12-31"), "ArrowRight")),
    "2027-01-01",
  );
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2027-01-01"), "ArrowLeft")),
    "2026-12-31",
  );
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2027-01-01"), "ArrowUp")),
    "2026-12-25",
  );
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2026-12-31"), "ArrowDown")),
    "2027-01-07",
  );
});

test("Home/End move to Monday/Sunday", () => {
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2026-09-05"), "Home")),
    "2026-08-31",
  );
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2026-09-05"), "End")),
    "2026-09-06",
  );
});

test("PageUp/PageDown clamp to the last valid day of the month", () => {
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2026-01-31"), "PageDown")),
    "2026-02-28",
  );
  assert.equal(
    toDateValue(moveCalendarDate(fromDateValue("2028-03-31"), "PageUp")),
    "2028-02-29",
  );
});

test("navigation leaves its input date unchanged", () => {
  const input = fromDateValue("2026-09-05");
  moveCalendarDate(input, "PageDown");
  assert.equal(toDateValue(input), "2026-09-05");
});
