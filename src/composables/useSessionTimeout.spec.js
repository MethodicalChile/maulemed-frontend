import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent } from "vue";
import { useSessionTimeout } from "./useSessionTimeout";

describe("useSessionTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize correctly", () => {
    const onTimeout = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        return useSessionTimeout(onTimeout, 1000, 500);
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.vm.showWarning).toBe(false);
  });

  it("should trigger onTimeout after timeout duration", () => {
    const onTimeout = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        return useSessionTimeout(onTimeout, 1000, 500);
      },
      template: "<div></div>",
    });

    mount(TestComponent);

    // Set activity explicitly to ensure predictable behavior
    sessionStorage.setItem("lastActivity", (Date.now() - 100).toString());

    // Advance time beyond timeout
    vi.advanceTimersByTime(1000);

    expect(onTimeout).toHaveBeenCalled();
  });
});
