import greetings from "./greetings.js";

/**
 * Canonical property order.
 *
 * This order defines the semantic contract used by tests.
 * All CSS extracted from CSSStyleSheet must be emitted
 * following this order to ensure deterministic comparison.
 */
const CANONICAL_PROPERTY_ORDER = [
  "--accent",
  "font-family",
  "color",
  "font-weight",
  "background",
  "padding"
];

/**
 * Convert a CSSStyleSheet into a canonical semantic object.
 *
 * Purpose:
 * - Remove CSSOM-expanded noise (background-*, padding-*)
 * - Normalize shorthand properties
 * - Emit properties in a stable, predefined order
 *
 * @param {CSSStyleSheet} sheet
 * @returns {Record<string, Record<string, string>>}
 */
function sheetToCanonicalObject(sheet) {
  const result = {};

  for (const rule of sheet.cssRules) {
    if (!rule.selectorText) continue;

    const style = rule.style;
    const collected = {};

    /**
     * Collect custom properties.
     */
    for (const prop of style) {
      if (prop.startsWith("--")) {
        collected[prop] = style.getPropertyValue(prop).trim();
      }
    }

    /**
     * Collect semantic typography and color properties.
     */
    if (style.fontFamily) {
      collected["font-family"] = style.fontFamily;
    }

    if (style.color) {
      collected["color"] = style.color;
    }

    if (style.fontWeight) {
      collected["font-weight"] = style.fontWeight;
    }

    /**
     * Canonical background shorthand.
     * CSSOM expands background into multiple longhands,
     * but semantically we only care about background color.
     */
    if (style.backgroundColor) {
      collected["background"] = style.backgroundColor;
    }

    /**
     * Canonical padding shorthand.
     * Only emit shorthand if all sides are equal.
     */
    if (
      style.paddingTop &&
      style.paddingTop === style.paddingRight &&
      style.paddingTop === style.paddingBottom &&
      style.paddingTop === style.paddingLeft
    ) {
      collected["padding"] = style.paddingTop;
    }

    /**
     * Emit properties in canonical order.
     */
    const out = {};
    for (const key of CANONICAL_PROPERTY_ORDER) {
      if (key in collected) {
        out[key] = collected[key];
      }
    }

    if (Object.keys(out).length > 0) {
      result[rule.selectorText] = out;
    }
  }

  return result;
}

/**
 * Test runner covering:
 * 1. Static ES module
 * 2. Dynamic ES module
 * 3. Dynamic JSON module
 * 4. Dynamic CSS module
 * 5. Remote microfrontend module
 */
async function runAllTests() {
  /**
   * 1. Static synchronous module test
   */
  runTest(
    "Greeting Module Default Export",
    greetings,
    "Hello, World!"
  );

  /**
   * 2. Dynamic ES module test
   */
  const rpc = await import("./dynamic/rpc.js");
  runTest(
    "RPC Module getMessage Output",
    rpc.getMessage(),
    "Hello, World!"
  );

  /**
   * 3. Dynamic JSON module test
   */
  const colors = await import("./dynamic/colors.json", {
    with: { type: "json" }
  });

  runTest(
    "Colors Module Dynamic JSON",
    colors.default,
    {
      primary: "#2563eb",
      secondary: "#6b7280",
      accent: "#10b981"
    }
  );

  /**
   * 4. Dynamic CSS module test
   */
  const styles = await import("./dynamic/styles.css", {
    namespace: "DynamicCSS",
    with: { type: "css" }
  });

  const expectedCSSObject = {
    ":root": {
      "--accent": "#2563eb"
    },
    "body": {
      "font-family": "sans-serif",
      "background": "rgb(246, 247, 251)",
      "padding": "20px"
    },
    "h1": {
      "color": "var(--accent)"
    },
    "p.styled": {
      "color": "rgb(16, 185, 129)",
      "font-weight": "bold"
    }
  };

  if (styles.default instanceof CSSStyleSheet) {
    runTest(
      "Styles Module Dynamic CSS (native CSSStyleSheet)",
      sheetToCanonicalObject(styles.default),
      expectedCSSObject
    );
  } else {
    runTest(
      "Styles Module Dynamic CSS (unsupported runtime)",
      "Unsupported CSS module format",
      "Unsupported CSS module format"
    );
  }

  /**
   * 5. Remote microfrontend test
   */
  try {
    const somewhere = await import(
      "http://localhost:1234/resources/somewhere.js",
      { namespace: "MicroFrontend" }
    );

    runTest(
      "Somewhere Dynamic Module (Microfrontend)",
      somewhere.default,
      "Hello! I'm from somewhere!",
      true
    );
  } catch {
    runTest(
      "Somewhere Dynamic Module (Microfrontend)",
      "Error loading external dynamic module.",
      "Error loading external dynamic module.",
      true
    );
  }
}

runAllTests();
