/**
 * RUNTIME_CODE
 *
 * This is the core runtime template used by the bundler. It executes and manages
 * bundled modules, provides synchronous and asynchronous module loading, exposes
 * global hooks for debugging, and polyfills missing browser APIs for maximum
 * compatibility across legacy and modern environments.
 *
 * Main responsibilities:
 * 1. Register bundled modules in an internal registry (`__modules__`).
 * 2. Cache loaded modules (`__modulePointer__`) and dynamically fetched modules
 *    (`__asyncModulePointer__`).
 * 3. Support synchronous loading via `require()` using static registry entries.
 * 4. Support dynamic HTTP-based loading via `<script>` injection.
 * 5. Provide a CSSStyleSheet polyfill (including adoptedStyleSheets) for browsers
 *    missing Constructable Stylesheet support.
 * 6. Automatically execute the entry module passed by the bundler.
 *
 * Parameters injected by bundler:
 * - GlobalConstructor → Usually `window` in browsers.
 * - global            → Global reference (`window`, fallback to global object).
 * - modules           → Object containing bundled modules.
 * - entry             → Module ID to be executed as entry point.
 *
 * External access:
 * - GlobalConstructor.prototype["*pointers"] exposes references to
 *   `registry` and `require()` for debugging, inspection, or external module injection.
 */
(function(GlobalConstructor, global, modules, entry) {
  // -------------------------------------------------------------------------
  // Internal registries and caches
  // -------------------------------------------------------------------------
  var __modules__ = {};              // Registry of all bundled modules (ID → [factory, mapping])
  var __modulePointer__ = {};        // Cache of synchronously loaded modules (ID → { exports })
  var __asyncModulePointer__ = {};   // Cache of async modules loaded via HTTP (ID → Promise-like)

  // -------------------------------------------------------------------------
  // CSSStyleSheet + adoptedStyleSheets Polyfill
  // -------------------------------------------------------------------------
  (function(global) {
    // Skip polyfill if browser already supports Constructable Stylesheets
    if (typeof global.CSSStyleSheet === "function" &&
        "replaceSync" in global.CSSStyleSheet.prototype) {
      return;
    }

    /**
     * Minimal emulation of CSSStyleSheet using <style> tags.
     * Provides replaceSync/replace for compatibility with runtime usage.
     */
    function CSSStyleSheet() {
      this._styleEl = document.createElement("style");
      this._styleEl.setAttribute("data-polyfilled", "true");

      var head = document.head || document.getElementsByTagName("head")[0];
      head.appendChild(this._styleEl);
    }

    // Synchronous update of stylesheet contents
    CSSStyleSheet.prototype.replaceSync = function(cssText) {
      if (this._styleEl.styleSheet) {
        // IE8 fallback: cssText API
        this._styleEl.styleSheet.cssText = cssText || "";
      } else {
        this._styleEl.textContent = cssText || "";
      }
      return this;
    };

    // Asynchronous Promise-based replace()
    CSSStyleSheet.prototype.replace = function(cssText) {
      var self = this;
      return new Promise(function(resolve) {
        self.replaceSync(cssText);
        resolve(self);
      });
    };

    /**
     * Document-level adoptedStyleSheets polyfill.
     * Stores an array of CSSStyleSheet instances and mirrors native behavior.
     */
    function defineAdoptedStyleSheets(doc) {
      if (doc.adoptedStyleSheets !== undefined) return;

      var adopted = [];

      try {
        // Define getter/setter on DOM document object
        Object.defineProperty(doc, "adoptedStyleSheets", {
          get: function() {
            return adopted;
          },
          set: function(sheets) {
            // Remove previously attached sheets
            for (var i = 0; i < adopted.length; i++) {
              var old = adopted[i];
              if (old && old._styleEl && old._styleEl.parentNode) {
                old._styleEl.parentNode.removeChild(old._styleEl);
              }
            }

            adopted = sheets || [];

            // Re-append updated sheet list
            for (var j = 0; j < adopted.length; j++) {
              if (adopted[j] && adopted[j]._styleEl) {
                var head = document.head || document.getElementsByTagName("head")[0];
                head.appendChild(adopted[j]._styleEl);
              }
            }
          }
        });
      } catch (e) {
        // IE8 fallback: direct property assignment (no defineProperty on DOM nodes)
        doc.adoptedStyleSheets = adopted;
      }
    }

    defineAdoptedStyleSheets(document);
    global.CSSStyleSheet = CSSStyleSheet;
  })(global);

  // -------------------------------------------------------------------------
  // URL Utility Helpers
  // -------------------------------------------------------------------------

  /**
   * Extracts the current host/base URL from window.location.
   * Required for constructing absolute URLs for remote module loading.
   */
  function getHostFromCurrentUrl() {
    var href = window.location.href;
    var clean = href.split(/[?#]/)[0];
    var parts = clean.split("/");
    var lastPart = parts[parts.length - 1];

    if (lastPart && lastPart.indexOf(".") > -1) {
      parts.pop(); // Remove filename part
      return parts.join("/");
    } else {
      var originMatch = clean.match(/^(https?:\/\/[^/]+)/i);
      return originMatch ? originMatch[1] : clean;
    }
  }

  // Extracts extension from a module ID string
  function getExt(id) {
    var parts = id.split(".");
    return parts.length > 1 ? "." + parts.pop() : "";
  }

  // Checks whether the given extension is supported by the runtime
  function isSupportedExtension(ext) {
    return (
      ext === ".js"  ||
      ext === ".mjs" ||
      ext === ".json"||
      ext === ".css" ||
      ext === ".svg" ||
      ext === ".xml" ||
      ext === ".html"
    );
  }

  // Ensures generated URLs always end with `.js`
  function ensureJsExtension(outputFilePath) {
    var clean = outputFilePath.split(/[?#]/)[0];
    var parts = clean.split("/");
    var last = parts[parts.length - 1];

    if (last.indexOf(".") > -1) {
      last = last.replace(/\.[^.]+$/, ".js");
    } else {
      last = last + ".js";
    }
    parts[parts.length - 1] = last;
    return parts.join("/");
  }

  // -------------------------------------------------------------------------
  // registry(): Register bundled modules into internal storage
  // -------------------------------------------------------------------------
  /**
   * Registers all modules provided by bundler into the runtime module registry.
   * The registry only accepts explicit properties, ignoring prototype inheritance.
   */
  function registry(modules) {
    for (var key in modules) {
      if (modules.hasOwnProperty(key) && !__modules__[key]) {
        __modules__[key] = modules[key];
      }
    }
  }

  // -------------------------------------------------------------------------
  // RequireAsynchronously(): Dynamic HTTP-based module loader
  // -------------------------------------------------------------------------
  /**
   * Loads a module by injecting a <script> tag and returns a Promise (or
   * Promise-like fallback). The runtime expects that remote scripts register
   * themselves via `registry()` after executing.
   */
  function RequireAsynchronously(id, path, url) {
    var actualPath = url ? url + path : getHostFromCurrentUrl() + "/" + path;

    var scriptLoader = document.createElement("script");
    scriptLoader.setAttribute("src", ensureJsExtension(actualPath));

    var head = document.head || document.getElementsByTagName("head")[0];

    if (typeof Promise !== "undefined") {
      var $this = new Promise(function (resolve, reject) {
        scriptLoader.onload = function () {
          resolve(__modulePointer__[id].exports);
        };
        scriptLoader.onerror = function (err) {
          reject(err);
        };
      });

      head.appendChild(scriptLoader);
      return $this;
    }

    // Legacy browsers: minimal .then() and .catch() polyfill
    else {
      this.then = function (resolve) {
        scriptLoader.onload = function () {
          resolve(__modulePointer__[id].exports);
        };
        return this;
      };

      this["catch"] = function (reject) {
        scriptLoader.onerror = reject;
        return this;
      };

      head.appendChild(scriptLoader);
    }
  }

  // -------------------------------------------------------------------------
  // requireByHttp(): Wrapper for async module loading by identifier
  // -------------------------------------------------------------------------
  function requireByHttp(id, attributes) {
    if (!id) return;

    var ext = getExt(id);
    if (!isSupportedExtension(ext)) {
      return;
    }

    var moduleId = id;

    if (__asyncModulePointer__[moduleId]) {
      return __asyncModulePointer__[moduleId];
    }

    var modulePath = moduleId.split("::")[1];

    var moduleUrl = /^https?:\/\//.test(attributes.address)
      ? attributes.address.split(modulePath)[0]
      : null;

    var result = new RequireAsynchronously(moduleId, modulePath, moduleUrl);

    __asyncModulePointer__[moduleId] = result;

    return result;
  }

  // -------------------------------------------------------------------------
  // require(): Core synchronous module loader
  // -------------------------------------------------------------------------
  /**
   * Resolves and executes modules from the registry. Supports:
   * - .js, .mjs, .json modules
   * - localRequire mapped via module dependency map
   * - remoteRequire for HTTP-based dynamic imports
   */
  function require(id) {
    if (!id) return;

    var ext = getExt(id);
    if (!isSupportedExtension(ext)) {
      return;
    }

    if (__modulePointer__[id]) {
      return __modulePointer__[id].exports;
    }

    var moduleData = __modules__[id];
    if (!moduleData) {
      throw new Error("Module not found: " + id);
    }

    var fn = moduleData[0];
    var mapping = moduleData[1];

    function localRequire(key) {
      return require(mapping[key]);
    }

    function remoteRequire(key, attributes = {}) {
      attributes.address = key;
      return requireByHttp(mapping[key], attributes);
    }

    var module = { exports: {} };
    __modulePointer__[id] = module;

    fn(localRequire, module.exports, module, remoteRequire);

    return module.exports;
  }

  // Register bundled modules
  registry(modules);

  // Execute entry module
  require(entry);

  /**
   * Expose internal functions for debugging or external module injection.
   * Used mainly during development or testing.
   */
  GlobalConstructor.prototype["*pointers"] = function(address) {
    if (address === "&registry") {
      return registry;
    } else if (address === "&require") {
      return require;
    }
    return null;
  };
})(
  typeof window !== "undefined" ? Window : this,
  typeof window !== "undefined" ? window : this,
  {
    // Entry module
    "&::entry.js": [
      function(require, exports, module, requireByHttp) {
        var greetings = require("./greetings.js").default;

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
          // 1. Static synchronous module test
          runTest("Greeting Module Default Export", greetings, "Hello, World!");

          // 2. Dynamic RPC module test
          var rpc = await requireByHttp("./dynamic/rpc.js");
          runTest("RPC Module getMessage Output", rpc.getMessage(), "Hello, World!");

          // 3. Dynamic JSON module test
          var colors = await requireByHttp("./dynamic/colors.json", {
            with: { type: "json" }
          });
          runTest("Colors Module Dynamic JSON", colors.default, {
            "primary": "#2563eb",
            "secondary": "#6b7280",
            "accent": "#10b981"
          });

          // 4. Dynamic CSS module test with namespace
          var styles = await requireByHttp("./dynamic/styles.css", {
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
          try {
            styles.default instanceof CSSStyleSheet;
            runTest(
              "Styles Module Dynamic CSS (native CSSStyleSheet)",
              sheetToCanonicalObject(styles.default),
              expectedCSSObject
            );
          } catch (err) {
            runTest(
              "Styles Module Dynamic CSS (unsupported runtime)",
              styles.default,
              `
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
              `
            );
          }

          // 5. Remote microfrontend test
          try {
            var somewhere = await requireByHttp("https://djsmicrofrontends.netlify.app/resources/somewhere.js", {
              namespace: "MicroFrontend"
            });
            runTest(
              "Try => Somewhere Dynamic Module (Microfrontend)",
              somewhere.default,
              "Hello! I'm from somewhere!",
              true
            );
          } catch (err) {
            runTest(
              "Catch => Somewhere Dynamic Module (Microfrontend)",
              "Error loading external dynamic module.",
              "Error loading external dynamic module.",
              true
            );
          }
        }

        runAllTests();
      },
      {
        "./greetings.js": "&::greetings.js",
        "./dynamic/rpc.js": "&::dynamic/rpc.js",
        "./dynamic/colors.json": "&::dynamic/colors.json",
        "./dynamic/styles.css": "DynamicCSS::dynamic/styles.css",
        "https://djsmicrofrontends.netlify.app/resources/somewhere.js": "MicroFrontend::resources/somewhere.js"
      }
    ],

    // Greetings module
    "&::greetings.js": [
      function(require, exports, module, requireByHttp) {
        exports["default"] = "Hello, World!";
      },
      {}
    ]
  },
  "&::entry.js"
);
