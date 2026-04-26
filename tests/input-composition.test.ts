import { describe, expect, test } from "vitest";
import { shouldDeferSearchRender } from "../src/sidepanel/inputComposition";

describe("shouldDeferSearchRender", () => {
  test("defers rendering while the search input is in a composition session", () => {
    expect(shouldDeferSearchRender(new Event("input"), true)).toBe(true);
  });

  test("defers rendering for composing input events", () => {
    const event = new InputEvent("input", { isComposing: true });

    expect(shouldDeferSearchRender(event, false)).toBe(true);
  });

  test("allows rendering for normal input events", () => {
    const event = new InputEvent("input", { isComposing: false });

    expect(shouldDeferSearchRender(event, false)).toBe(false);
  });
});
