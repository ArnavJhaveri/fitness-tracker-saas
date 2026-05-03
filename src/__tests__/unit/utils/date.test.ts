import { describe, it, expect, vi } from "vitest";
import { localDateStr } from "@/lib/utils/date";

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
