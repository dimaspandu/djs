/**
 * Dynamic JSON-like module for color definitions.
 * Used to test async module loading.
 */
(function(global, modules, entry) {
  global["*pointers"]("&registry")(modules);
  global["*pointers"]("&require")(entry);
})(
  typeof window !== "undefined" ? window : this,
  {
    "&::dynamic/colors.json": [
      function(require, exports, module, requireByHttp) {
        exports.default = {
          primary: "#2563eb",
          secondary: "#6b7280",
          accent: "#10b981"
        };
      },
      {}
    ]
  },
  "&::dynamic/colors.json"
);
