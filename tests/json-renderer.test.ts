import { describe, expect, test } from "vitest";
import { renderJsonWithStructuredMatches } from "../src/sidepanel/jsonRenderer";

describe("renderJsonWithStructuredMatches", () => {
  test("highlights only the object that contains both siid and piid for an sp query", () => {
    const html = renderJsonWithStructuredMatches(
      {
        result: [
          { siid: 2, piid: 2, value: 4 },
          { siid: 2, piid: 6, value: 0 }
        ]
      },
      "sp:2.2"
    );

    expect(countMatches(html, "json-object-match")).toBe(1);
    expect(matchedBlocks(html)[0]).toContain("&quot;piid&quot;: 2");
    expect(matchedBlocks(html)[0]).not.toContain("&quot;piid&quot;: 6");
    expect(html).toContain('<span class="json-object-match">    {');
    expect(html).not.toContain('    <span class="json-object-match">{');
    expect(matchedBlocks(html)[0].trimEnd()).toMatch(/},$/);
    expect(html).not.toContain("}</span>,");
  });

  test("highlights only the object that contains both siid and aiid for an sa query", () => {
    const html = renderJsonWithStructuredMatches(
      {
        params: [
          { siid: 2, aiid: 3, value: true },
          { siid: 2, piid: 3, value: false }
        ]
      },
      "sa:2.3"
    );

    expect(countMatches(html, "json-object-match")).toBe(1);
    expect(matchedBlocks(html)[0]).toContain("&quot;aiid&quot;: 3");
    expect(matchedBlocks(html)[0]).not.toContain("&quot;piid&quot;: 3");
  });

  test("matches numeric strings against numeric query values", () => {
    const html = renderJsonWithStructuredMatches({ siid: "2", piid: "2" }, "sp:2.2");

    expect(countMatches(html, "json-object-match")).toBe(1);
  });

  test("highlights multiple matching objects for multiple query pairs", () => {
    const html = renderJsonWithStructuredMatches(
      [{ siid: 2, piid: 2 }, { siid: 2, aiid: 3 }, { siid: 2, piid: 6 }],
      "sp:2.2 sa:2.3"
    );

    expect(countMatches(html, "json-object-match")).toBe(2);
  });
});

function countMatches(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function matchedBlocks(html: string): string[] {
  return Array.from(html.matchAll(/<span class="json-object-match">([\s\S]*?)<\/span>/g)).map(
    (match) => match[1]
  );
}
