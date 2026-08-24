import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./auth.store";
import http from "@/api/http";

vi.mock("@/api/http", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("Auth Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize with null user", () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it("should set tokens correctly", () => {
    const store = useAuthStore();
    store.saveTokens({ access: "a1", refresh: "r1" });
    expect(sessionStorage.getItem("access_token")).toBe("a1");
    expect(store.isAuthenticated).toBe(true);
  });
});
