import { describe, it, expect, vi } from "vitest";
import { dayBefore, isValidISODate, localDateStr, localDateStrInTz } from "@/lib/utils/date";

describe("localDateStr", () => {
  it("formats the current date correctly", () => {
    // Pin to a known date so the test is deterministic regardless of timezone.
    const fixed = new Date(2025, 7, 15); // 15 Aug 2025, local time
    expect(localDateStr(fixed)).toBe("2025-08-15");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2025, 0, 5); // 5 Jan 2025
    expect(localDateStr(d)).toBe("2025-01-05");
  });

  it("handles the last day of a month correctly", () => {
    const d = new Date(2025, 1, 28); // 28 Feb 2025
    expect(localDateStr(d)).toBe("2025-02-28");
  });

  it("defaults to today when no argument is passed", () => {
    // Freeze Date to a specific moment so the test is deterministic.
    const frozen = new Date(2025, 11, 31); // 31 Dec 2025
    vi.useFakeTimers();
    vi.setSystemTime(frozen);

    expect(localDateStr()).toBe("2025-12-31");

    vi.useRealTimers();
  });

  it("uses local getters — not UTC — so the date is correct in every timezone", () => {
    // Create a date that is 1 Jan 2026 UTC but still 31 Dec 2025 in UTC-5.
    // localDateStr must return the LOCAL date, not the UTC one.
    // We simulate this by constructing a Date whose local fields we control.
    const d = new Date(2026, 0, 1, 0, 0, 0); // 1 Jan 2026 local midnight
    const result = localDateStr(d);
    // The year portion must be 2026 (local), not 2025.
    expect(result.startsWith("2026")).toBe(true);
  });
});

describe("localDateStrInTz", () => {
  it("formats today's date in the supplied IANA timezone", () => {
    // Pin to a moment that crosses a UTC date boundary, so the same instant
    // is on different calendar days in different timezones.
    // 2026-05-07 23:30 UTC = 2026-05-08 11:30 NZST = 2026-05-07 16:30 PDT
    const instant = new Date(Date.UTC(2026, 4, 7, 23, 30));
    expect(localDateStrInTz("UTC", instant)).toBe("2026-05-07");
    expect(localDateStrInTz("Pacific/Auckland", instant)).toBe("2026-05-08");
    expect(localDateStrInTz("America/Los_Angeles", instant)).toBe("2026-05-07");
  });

  it("falls back to UTC date when the timezone is invalid", () => {
    const instant = new Date(Date.UTC(2026, 4, 7, 0, 0));
    expect(localDateStrInTz("Not/AReal_Zone", instant)).toBe("2026-05-07");
  });

  it("returns YYYY-MM-DD shape always", () => {
    const instant = new Date(Date.UTC(2026, 0, 5, 12, 0));
    expect(localDateStrInTz("UTC", instant)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("dayBefore", () => {
  it("returns the previous calendar day", () => {
    expect(dayBefore("2026-04-01")).toBe("2026-03-31");
    expect(dayBefore("2026-01-01")).toBe("2025-12-31");
  });

  it("handles month boundaries (including the leap-year case)", () => {
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2024-03-01")).toBe("2024-02-29"); // 2024 is a leap year
  });

  it("is DST-safe — uses UTC midnight, not local midnight", () => {
    // 2026-03-08 is the US spring-forward day. In a local-time-based
    // implementation, midnight 03-08 minus 86_400_000 ms could land at 23:00
    // 03-07 (skipping the DST hour) and stringify to "2026-03-07" anyway —
    // correct number, wrong reason. Test that 2026-03-09 → 2026-03-08
    // regardless of host timezone.
    expect(dayBefore("2026-03-09")).toBe("2026-03-08");
  });

  it("throws on malformed input rather than returning a wrong value", () => {
    expect(() => dayBefore("not-a-date")).toThrow();
    expect(() => dayBefore("2026/04/01")).toThrow();
  });
});

describe("isValidISODate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidISODate("2026-05-07")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true); // leap year
    expect(isValidISODate("2026-12-31")).toBe(true);
  });

  it("rejects non-real dates that pass a naive regex", () => {
    expect(isValidISODate("2026-13-01")).toBe(false); // month > 12
    expect(isValidISODate("2026-02-30")).toBe(false); // Feb 30 doesn't exist
    expect(isValidISODate("2025-02-29")).toBe(false); // 2025 is not a leap year
    expect(isValidISODate("2026-13-45")).toBe(false);
  });

  it("rejects strings that don't match the YYYY-MM-DD shape", () => {
    expect(isValidISODate("")).toBe(false);
    expect(isValidISODate("2026/05/07")).toBe(false);
    expect(isValidISODate("26-05-07")).toBe(false);
    expect(isValidISODate("2026-5-7")).toBe(false); // requires zero-padding
  });
});
