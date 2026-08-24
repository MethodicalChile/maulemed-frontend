import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import Skeleton from "./Skeleton.vue";

describe("Skeleton", () => {
  it("renders correctly", () => {
    const wrapper = mount(Skeleton);
    expect(wrapper.classes()).toContain("animate-pulse");
  });
});
