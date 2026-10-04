# DJS (Distributed JavaScript Runtime)

DJS is a lightweight, versioned JavaScript runtime and module execution model designed for **browser-based runtimes, bundlers, and compiler outputs**. Each version folder (e.g. `1.0.0`, `1.0.1`, `1.0.2`) contains a **fully self-contained runtime**, allowing predictable, reproducible builds and long-term compatibility guarantees.

`src/` holds the **latest runtime snapshot** (`1.1.0`). Released version folders are never modified; `src/` is where new capabilities land before the next tag is cut.

**Why "Distributed"?** DJS enables modules to be loaded from multiple sources (local, remote, or microfrontend bundles) while maintaining isolated namespaces. Each module executes in its own scope, preventing collisions when integrating code from different origins or build pipelines.

Starting from newer versions (≥ **1.0.2**), DJS evolves from a simple module executor into a **runtime-grade loader** with dynamic HTTP imports, CSS polyfills, micro‑frontend compatibility, and deterministic test tooling. As of **1.1.0**, the latest runtime in `src/` also accepts `.jsx` module IDs.

---

## Key Concepts

* **Runtime-first design** — optimized for generated bundles, not authoring
* **Versioned runtimes** — behavior is locked per version
* **Namespace-based module IDs** — avoids collisions across bundles
* **Browser-compatible execution** — works in real browsers and mocked environments
* **Microfrontend-friendly** — external bundles can self-register safely

---

## Features (Latest Runtime)

* Module execution with namespace isolation
* Synchronous and asynchronous (`HTTP`) module loading
* Versioned runtime directories for stable behavior
* Namespace-based module resolution (`Namespace::path`)
* Supported module extensions: `.js`, `.mjs`, `.jsx`, `.json`, `.css`, `.svg`, `.xml`, `.html`
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

### Supported Extensions

`require()` and `requireByHttp()` resolve module IDs through an explicit allowlist. An unsupported extension is ignored and returns nothing.

| Extension | Support |
| --------- | ------- |
| `.js`     | all versions |
| `.mjs`    | all versions |
| `.jsx`    | ≥ 1.1.0 (`src/`) |
| `.json`   | all versions |
| `.css`    | all versions |
| `.svg`    | all versions |
| `.xml`    | all versions |
| `.html`   | all versions |

```js
// src/template.js and src/runtime.js
function isSupportedExtension(ext) {
  return (
    ext === ".js"  ||
    ext === ".mjs" ||
    ext === ".jsx"||
    ext === ".json"||
    ext === ".css" ||
    ext === ".svg" ||
    ext === ".xml" ||
    ext === ".html"
  );
}
```

> Extending this list is a deliberate act — it is a safety boundary, not a formality.

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
   * Called inside factory with dependency mapping

 **Relative path (same bundle):**
 ```js
 const rpc = await requireByHttp("./dynamic/rpc.js");
 ```

 **External URL (separate bundle):**
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
├─ src/               # latest runtime snapshot (1.1.0)
│  ├─ dynamic/
│  ├─ resources/
│  ├─ env.mock.js
│  ├─ run.test.js
│  ├─ runtime.js
│  ├─ template.js
│  └─ test.html
├─ native/            # plain-browsers example, no bundler involved
│  ├─ public/
│  ├─ microfrontends/
│  └─ run.test.js
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
├─ scripts/
│  └─ serve.js         # zero-dependency static server for browser tests
├─ package.json
├─ CHANGELOG.md
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

Run the latest runtime suite:

```bash
npm test          # -> node src/run.test.js
```

Run a specific version suite:

```bash
node src/run.test.js
node 1.0.2/run.test.js
node 1.0.1/run.test.js
node 1.0.0/run.test.js
```

Requires Node.js `>= 22.7`. Each suite exits with a non-zero status only if the runtime throws; per-test results are printed with `PASS` / `FAIL`.

`native/` is an example of the runtime used without any bundler. `node native/run.test.js` starts two static servers (`http://localhost:1010` for the host app, `http://localhost:1234` for the remote microfrontend) and stays running until stopped — it is a browser playground, not an automated suite.

All tests are designed to behave **identically** in:

* Node.js (mocked DOM)
* Real browsers (`test.html`)

---

## Browser Testing

`test.html` runs the exact same assertions as the Node suites, but against a real browser. It must be served over HTTP — `file://` breaks dynamic module loading.

Start a zero-dependency static server for the latest runtime:

```bash
npm run test:browser
# DJS browser test: http://localhost:8080/test.html
#   Serving: <repo>/src
```

Any directory and port can be passed through:

```bash
node scripts/serve.js src 8080
node scripts/serve.js 1.0.2 8081
```

Results are printed to the browser console as `PASS` / `FAIL`, with a `console.table` summary — open DevTools first, then reload.

The `native/` example needs two servers (host app + remote microfrontend) and ships its own launcher:

```bash
npm run test:browser:native
# http://localhost:1010  (host app)
# http://localhost:1234  (remote microfrontend)
```

No other server configuration is required, but any static server works:

* `npx serve`, Live Server, Sandboxes

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

Inside the factory function, modules are resolved through the dependency mapping.

**Relative path (same bundle via mapping):**
```js
// Mapping: "./dynamic/rpc.js" → "&::dynamic/rpc.js"
const rpc = await requireByHttp("./dynamic/rpc.js");
```

**Relative path with custom namespace:**
```js
// Mapping: "./dynamic/styles.css" → "DynamicCSS::dynamic/styles.css"
const styles = await requireByHttp("./dynamic/styles.css", {
  namespace: "DynamicCSS"
});
```

**External URL (separate bundle):**
```js
// Mapping: "https://cdn.example.com/feature.js" → "RemoteFeature::feature.js"
const remote = await requireByHttp("https://cdn.example.com/feature.js", {
  namespace: "RemoteFeature"
});
```

---

### Real-world Example: ngapack Integration

DJS powers [ngapack](https://github.com/dimaspandu/ngapack), a custom bundler that compiles ESM to DJS format:

**Input (ESM):**
```js
const somewhere = await import(
  "https://micro.somewhere.com/message.js",
  { namespace: "MicroFrontend" }
);
console.log(somewhere.default);
```

**Output (DJS - Entry bundle):**
```js
(function (GlobalConstructor, global, modules, entry) {
  /* runtime.js content */
})(
  typeof window !== "undefined" ? Window : this,
  typeof window !== "undefined" ? window : this,
  {
    "&::index.js": [
      function (require, exports, module, requireByHttp) {
        // Path resolved via dependency mapping
        // Mapping: "https://micro.somewhere.com/message.js" → "MicroFrontend::message.js"
        const somewhere = requireByHttp(
          "https://micro.somewhere.com/message.js"
        );
        console.log(somewhere.default);
      },
      {
        "https://micro.somewhere.com/message.js": "MicroFrontend::message.js"
      }
    ]
  },
  "&::index.js"
);
```

**Output (DJS - Remote bundle at `https://micro.somewhere.com/message.js`):**
```js
!function(e) {
  e["*pointers"]("&registry")({
    "MicroFrontend::message.js": [
      function(e, n, o, i) {
        n.default = "Hello! I'm from somewhere!"
      },
      {}
    ]
  }), e["*pointers"]("&require")("MicroFrontend::message.js")
}("undefined" != typeof window ? window : this);
```

## Versioning Policy

Each version folder is immutable. No breaking changes inside a version. New capabilities are introduced via new versions.

`src/` is the working snapshot for the **next** release. It follows the newest published version plus additive changes only. When a release is cut, `src/` is tagged (e.g. `1.1.0`) and the published folders stay untouched, so `1.0.0`–`1.0.2` consumers are never affected.

This guarantees long-term reproducibility.

---

## License

MIT
