/**
 * Example of an external CSS resource module (Microfrontend-compatible).
 * Defines simple global CSS rules and exports them as a stylesheet or raw text.
 */
(function(global, modules, entry) {
  global["*pointers"]("&registry")(modules);
  global["*pointers"]("&require")(entry);
})(
  typeof window !== "undefined" ? window : this,
  {
    "MicroFrontend::resources/somewhere.js": [
      function(require, exports, module) {
        exports.default = "Hello! I'm from somewhere!";
      },
      {}
    ]
  },
  "MicroFrontend::resources/somewhere.js"
);
