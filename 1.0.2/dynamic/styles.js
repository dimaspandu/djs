/**
 * Dynamic CSS module — returns either raw CSS text or a CSSStyleSheet object.
 * Supports both modern and legacy browsers via the CSSStyleSheet polyfill.
 */
(function(global, modules, entry) {
  global["*pointers"]("&registry")(modules);
  global["*pointers"]("&require")(entry);
})(
  typeof window !== "undefined" ? window : this,
  {
    "DynamicCSS::dynamic/styles.css": [
      function(require, exports, module, requireByHttp) {
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
        
        exports.raw = raw;

        if (typeof CSSStyleSheet === "undefined") {
          exports.default = raw;
        } else {
          var sheet = new CSSStyleSheet();
          sheet.replaceSync(raw);
          exports.default = sheet;
        }
      },
      {}
    ]
  },
  "DynamicCSS::dynamic/styles.css"
);
