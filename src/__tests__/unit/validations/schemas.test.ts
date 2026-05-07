import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { createWeightEntrySchema as logWeightSchema } from "@/lib/validations/health";
import { paginationSchema, dateRangeSchema } from "@/lib/validations/shared";

// ─── loginSchema ──────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "Password1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "Password1!" });
    expect(result.success).toBe(false);
    const errors = result.error?.flatten().fieldErrors;
    expect(errors?.email).toBeDefined();
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

// ─── registerSchema ───────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const valid = {
    email: "user@example.com",
    password: "SecurePass1!",
    confirmPassword: "SecurePass1!",
    full_name: "Jane Doe",
  };

  it("accepts a valid registration payload", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a password that is too short", () => {
    const result = registerSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toBeDefined();
  });

  it("rejects a missing full_name", () => {
    const { full_name: _, ...rest } = valid;
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ─── logWeightSchema ──────────────────────────────────────────────────────────

describe("logWeightSchema", () => {
  it("accepts a valid weight entry", () => {
    const result = logWeightSchema.safeParse({
      weight_kg: 75.5,
      logged_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight below 1 kg", () => {
    const result = logWeightSchema.safeParse({
      weight_kg: 0,
      logged_at: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight above 500 kg", () => {
    const result = logWeightSchema.safeParse({
      weight_kg: 501,
      logged_at: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects body_fat_percentage above 70", () => {
    const result = logWeightSchema.safeParse({
      weight_kg: 75,
      body_fat_percentage: 71,
      logged_at: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts body_fat_percentage of 0 (measurement artifact)", () => {
    const result = logWeightSchema.safeParse({
      weight_kg: 75,
      body_fat_percentage: 0,
      logged_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

// ─── paginationSchema ─────────────────────────────────────────────────────────

describe("paginationSchema", () => {
  it("provides sensible defaults", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.parse({ page: "2", per_page: "50" });
    expect(result.page).toBe(2);
    expect(result.per_page).toBe(50);
  });

  it("rejects per_page above 100", () => {
    const result = paginationSchema.safeParse({ per_page: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects page below 1", () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  // Defends against `?page=999999999` — Postgres OFFSET would otherwise
  // do a full-table-skip walk for no possible result.
  it("rejects page > 10_000", () => {
    expect(paginationSchema.safeParse({ page: 10_001 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: 10_000 }).success).toBe(true);
  });
});

// ─── dateRangeSchema ──────────────────────────────────────────────────────────

describe("dateRangeSchema", () => {
  it("accepts valid ISO date strings", () => {
    const result = dateRangeSchema.safeParse({ from: "2025-01-01", to: "2025-12-31" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    expect(dateRangeSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = dateRangeSchema.safeParse({ from: "01/01/2025" });
    expect(result.success).toBe(false);
  });

  // Cross-field invariant: callers don't have to defensively swap from/to.
  it("rejects from > to", () => {
    const result = dateRangeSchema.safeParse({ from: "2025-12-31", to: "2025-01-01" });
    expect(result.success).toBe(false);
  });

  it("accepts from === to (single-day range)", () => {
    expect(dateRangeSchema.safeParse({ from: "2025-06-15", to: "2025-06-15" }).success).toBe(true);
  });
});
