/**
 * Dynamic CSS module bootstrap.
 *
 * This wrapper registers bundled modules into the internal module registry
 * and immediately executes the specified entry module.
 *
 * The CSS module exported by the entry supports:
 * - Modern browsers: returns a CSSStyleSheet instance (Constructable Stylesheets)
 * - Legacy browsers: returns raw CSS text as a string
 */
(function (global, modules, entry) {
  // Register all bundled modules into the runtime registry
  global["*pointers"]("&registry")(modules);

  // Execute the entry module and resolve its exports
  global["*pointers"]("&require")(entry);
})(
  // Resolve the global object in both browser and non-browser environments
  typeof window !== "undefined" ? window : this,

  // Module definitions map
  {
    "DynamicCSS::dynamic/styles.css": [
      /**
       * CSS module factory.
       *
       * This function is executed by the module loader when the CSS module
       * is required. It exposes:
       * - exports.raw     → raw CSS string
       * - exports.default → CSSStyleSheet or raw string (fallback)
       */
      function (require, exports, module, requireByHttp) {
        /**
         * Raw CSS source.
         *
         * Defined as a template literal to preserve formatting and allow
         * future extensions such as variable interpolation.
         */
        var raw = (`
          :root {
            --accent: #2563eb;
          }

          body {
            font-family: sans-serif;
            background: #f6f7fb;
            padding: 20px;
          }

          h1 {
            color: var(--accent);
          }

          p.styled {
            color: #10b981;
            font-weight: bold;
          }
        `);

        // Always expose the raw CSS string
        exports.raw = raw;

        /**
         * Feature detection for Constructable Stylesheets.
         *
         * If CSSStyleSheet is not available, fall back to exporting
         * the raw CSS string so it can be injected via <style> tags.
         */
        if (typeof CSSStyleSheet === "undefined") {
          exports.default = raw;
        } else {
          /**
           * Modern browser path.
           *
           * Create a CSSStyleSheet instance and synchronously populate it
           * with the CSS source for use with adoptedStyleSheets.
           */
          var sheet = new CSSStyleSheet();
          sheet.replaceSync(raw);
          exports.default = sheet;
        }
      },
      {}
    ]
  },

  // Entry module identifier
  "DynamicCSS::dynamic/styles.css"
);
