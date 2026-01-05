# DJS (Distributed JavaScript Modules)

DJS is a lightweight, versioned JavaScript runtime and module execution model designed for **browser-based runtimes, bundlers, and compiler outputs**. Each version folder (e.g. `1.0.0`, `1.0.1`, `1.0.2`) contains a **fully self-contained runtime**, allowing predictable, reproducible builds and long-term compatibility guarantees.

Starting from newer versions (≥ **1.0.2**), DJS evolves from a simple module executor into a **runtime-grade loader** with dynamic HTTP imports, CSS polyfills, micro‑frontend compatibility, and deterministic test tooling.

---

## Key Concepts

* **Runtime-first design** — optimized for generated bundles, not authoring
* **Versioned runtimes** — behavior is locked per version
* **Namespace-based module IDs** — avoids collisions across bundles
* **Browser-compatible execution** — works in real browsers and mocked environments
* **Microfrontend-friendly** — external bundles can self-register safely

---

## Features (Latest Runtime)

* Distributed JavaScript module execution
* Synchronous and asynchronous (`HTTP`) module loading
* Versioned runtime directories for stable behavior
* Namespace-based module resolution (`Namespace::path`)
* Built-in CSSStyleSheet + `adoptedStyleSheets` polyfill
* Dynamic `<script>` injection for remote modules
* Internal module caching (sync + async)
* Micro-frontend safe registry injection
* Deterministic Node.js + Browser test parity

---

## Module Namespace System

Every module in DJS is uniquely identified by:

```
<namespace>::<path>
```

### Default Namespace

The default namespace is:

```js
&
```

Examples:

```js
&::entry.js
&::dynamic/rpc.js
&::resources/colors.json
```

The default namespace:

* Requires **no configuration**
* Is always available
* Is used by standard bundled modules

---

### Custom Namespaces

Custom namespaces are designed for **dynamic assets**, **CSS**, and **micro‑frontend modules**.

Examples:

```js
DynamicCSS::dynamic/styles.css
MicroFrontend::resources/somewhere.js
```

Use cases:

* Dynamic CSS injection
* External bundles / microfrontends
* Isolated asset groups
* Cross-bundle interoperability

Each namespace maintains its own registry entry and cache.

---

## Runtime Architecture (≥ 1.0.2)

Each runtime version includes:

* **Internal module registry** (`__modules__`)
* **Synchronous cache** (`__modulePointer__`)
* **Async HTTP cache** (`__asyncModulePointer__`)
* **`require(id)`** — synchronous resolver
* **`requireByHttp(id)`** — async HTTP-based loader
* **`registry(modules)`** — external injection hook

---

## Factory Function Contract

Every module in DJS is executed through a **factory function** with a **fixed, explicit signature**:

```js
function (require, exports, module, requireByHttp) {
  // module code
}
```

This signature is **mandatory and stable across all versions**.
Bundlers **must always emit factories with all four parameters**, even if some are unused.

### Parameter Responsibilities

* **`require`**

  * Synchronous module resolver
  * Used for static, intra-bundle dependencies

* **`exports`**

  * Named export container
  * Compatible with CommonJS-style exports

* **`module`**

  * Metadata object (`{ exports }`)
  * Enables `module.exports` interoperability and future extensions

* **`requireByHttp`**

  * Asynchronous loader for HTTP / remote modules
  * Used for dynamic imports, CSS, JSON, and microfrontend bundles

```js
const feature = await requireByHttp("https://cdn.example.com/feature.js", {
  namespace: "RemoteFeature"
});
```

### Design Rationale

The fixed factory signature provides:

* Predictable code generation for bundlers
* Zero runtime branching or feature detection
* Safe minification and argument mangling
* Backward compatibility across runtime versions
* First-class support for microfrontends and lazy loading

> In DJS, every module receives **all runtime capabilities by default**.
> Using them is optional; providing them is not.

---

## CSS Runtime Support

Newer runtimes include a **CSSStyleSheet polyfill**, enabling support for:

* `new CSSStyleSheet()`
* `replaceSync()` / `replace()`
* `document.adoptedStyleSheets`

### Behavior

* **Modern browsers** → native `CSSStyleSheet`
* **Legacy browsers** → `<style>`-based polyfill

Dynamic CSS modules can export:

* `exports.default` → `CSSStyleSheet` or string
* `exports.raw` → raw CSS text (always available)

This guarantees consistent styling behavior across environments.

---

## Folder Structure Example

```
djs/
├─ 1.0.0/
│  ├─ runtime.js
│  └─ template.js
├─ 1.0.1/
│  ├─ runtime.js
│  ├─ env.mock.js
│  ├─ run.test.js
│  └─ test.html
├─ 1.0.2/
│  ├─ dynamic/
│  ├─ resources/
│  ├─ env.mock.js
│  ├─ run.test.js
│  ├─ runtime.js
│  ├─ template.js
│  └─ test.html
├─ LICENSE
└─ README.md
```

---

## Testing & Mock Environment

DJS provides a **custom browser mock** (`env.mock.js`) that simulates:

* `window` / `document`
* `<script>` injection
* `window.location`
* Async dynamic imports

### Test Coverage

* Static module resolution
* Async HTTP module loading
* JSON imports
* Dynamic CSS modules
* Namespace isolation
* Microfrontend external modules

Run tests:

```bash
node 1.0.2/run.test.js
```

All tests are designed to behave **identically** in:

* Node.js (mocked DOM)
* Real browsers (`test.html`)

---

## Browser Testing

Each version may include `test.html` for real browser validation.

Supported environments:

* Static HTTP servers
* Live Server
* Sandboxes

Validated behaviors:

* Runtime execution
* Namespace resolution
* CSS injection
* Async loading consistency

---

## Intended Usage

DJS is **not a framework**. It is a **runtime target**.

Typical flow:

1. Bundler loads `template.js`
2. Injects module graph + entry ID
3. Emits a final runtime bundle
4. Runtime executes deterministically in browser

It is ideal for:

* Custom bundlers
* Educational compilers
* Microfrontend platforms
* Runtime research & experimentation

---

## Example: Using DJS as a Custom Bundler Runtime

Below is a **minimal but realistic example** of how DJS can be used as the runtime layer for a custom JavaScript bundler.

### 1. Input Source Files

```js
// src/index.js
import msg from "./message.js";
console.log(msg);
```

```js
// src/message.js
export default "Hello from DJS runtime";
```

---

### 2. Bundler Output (Generated Code)

Your bundler transforms the module graph into a DJS-compatible bundle.
**Each module is emitted as a factory with the fixed 4-parameter contract**:

```js
(function (GlobalConstructor, global, modules, entry) {
  /* runtime.js content (copied or injected here) */
})(
  typeof window !== "undefined" ? Window : this,
  typeof window !== "undefined" ? window : this,
  {
    "&::index.js": [
      function (require, exports, module, requireByHttp) {
        const msg = require("./message.js").default;
        console.log(msg);
      },
      { "./message.js": "&::message.js" }
    ],

    "&::message.js": [
      function (require, exports, module, requireByHttp) {
        exports.default = "Hello from DJS runtime";
      },
      {}
    ]
  },
  "&::index.js"
);
```

Key points:

* Factory functions **always receive 4 parameters**
* Unused parameters are intentionally kept for contract stability
* `requireByHttp` enables future async / remote imports without changing output shape

---

### 3. Lightweight Mode (Runtime Externalized)

If the runtime is loaded separately (e.g. via `<script src="runtime.js">`):

```js
(function (global, modules, entry) {
  global["*pointers"]("&registry")(modules);
  global["*pointers"]("&require")(entry);
})(window,
  {
    "&::index.js": [
      function (require, exports, module) {
        console.log("Hello from lightweight bundle");
      },
      {}
    ]
  },
  "&::index.js"
);
```

This mode is useful for:

* Multiple bundles sharing one runtime
* Microfrontend architectures
* Reducing duplicated runtime code

---

### 4. Dynamic / HTTP Module Usage

Inside bundled code, async modules can be loaded dynamically:

```js
const remote = await requireByHttp(
  "https://example.com/feature.js",
  { namespace: "RemoteFeature" }
);

remote.default();
```

The remote script must self-register using DJS hooks:

```js
(function (global, modules, entry) {
  global["*pointers"]("&registry")(modules);
  global["*pointers"]("&require")(entry);
})(window,
  {
    "RemoteFeature::feature.js": [
      function (require, exports) {
        exports.default = () => console.log("Loaded remotely");
      },
      {}
    ]
  },
  "RemoteFeature::feature.js"
);
```

---

### 5. What Your Bundler Must Do

At minimum, a DJS-compatible bundler needs to:

* Normalize module IDs → `Namespace::path`
* Convert ES modules to CommonJS-style factories
* Produce a dependency mapping per module
* Inject modules + entry ID into `template.js`

Everything else (execution, caching, loading, isolation) is handled by the runtime.

---

---

## Versioning Policy

* Each version folder is immutable
* No breaking changes inside a version
* New capabilities are introduced via new versions

This guarantees long-term reproducibility.

---

## License

MIT
