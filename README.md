# DJS (Distributed JavaScript Modules)

DJS is a lightweight, modular JavaScript execution model designed for browser-based runtimes, bundlers, and compilers. It provides an isolated, spec-like environment for resolving modules, evaluating code, and handling versioned distributions. Each version folder (such as `1.0.0`, `1.1.0`) contains a self-contained runtime implementation, enabling predictable and reproducible builds.

## Features

-  Distributed JavaScript module execution
-  Versioned runtime directories for stable behavior
-  Runtime-friendly architecture for bundlers and compilers
-  Sandboxed evaluation designed for browser execution
-  Support for mocks, HTTP-based loading, and environment simulation
-  Namespace-based module resolution with default and custom namespaces

## Module Namespace System

DJS uses a **namespace + path** format to uniquely identify every module.

### Default Namespace

By default, all modules use the namespace:
``` js
&
```

Namespaces are separated from paths using:
``` js
::
```

Example:
``` js
&::dynamic/rpc.js
&::resources/colors.json
&::index.js
```

Meaning:
-  Namespace: `&`
-  Module path: `dynamic/rpc.js`

The default namespace requires no configuration and is always available.

### Custom Namespaces

DJS also supports modules registered under custom namespaces.
These are commonly used for:
-  Dynamic CSS injection
-  Micro-frontend resources
-  External assets
-  Grouped module sets
-  Interoperability with other bundles

Examples:
``` js
DynamicCSS::dynamic/styles.css
MicroFrontend::resources/somewhere.js
```

In these cases:
-  `DynamicCSS` is the namespace for dynamic CSS modules
-  `MicroFrontend` is the namespace for micro-frontend resource modules

Both are resolved independently from the default namespace.

## Folder Structure Example

    djs/
    ├─ 1.0.0/
    │  ├─ dynamic/
    │  ├─ resources/
    │  ├─ env.mock.js
    │  ├─ run.test.js
    │  ├─ runtime.js
    │  └─ template.js
    ├─ 1.1.0/
    │  ├─ ...
    │  LICENSE
    └─ README.md

## Structure Overview

Each runtime version includes:
- **dynamic/** — optional, contains modules that simulate asynchronous loading
- **resources/** — optional, contains external assets or static modules
- **env.mock.js** — a controlled mock environment for isolated testing
- **run.test.js** — validates module registration, exports, namespaces, and dynamic imports
- **runtime.js** — the core runtime implementation
- **template.js** — a string-based template used by bundlers to inject module definitions

## Usage

Bundlers often load the runtime template, inject modules, define the entrypoint, and produce the final output bundle.

Example usage inside a bundler:

``` js
/**
 * RUNTIME_CODE(host)
 * -------------------
 * Returns the runtime code as a string literal.
 */
const RUNTIME_CODE = (host, modules, entry) => {
  const runtimeTemplatePath = path.join(__dirname, "djs/1.0.X/template.js");

  logger.info("[RUNTIME] Loading runtime template:", runtimeTemplatePath);

  let template = fs.readFileSync(runtimeTemplatePath, "utf-8");

  // Determine host string
  const injectedHost = host !== undefined
    ? JSON.stringify(host)
    : "getHostFromCurrentUrl()"; // use runtime function fallback

  // Inject values into template
  template = template
    .replace(/__INJECT_MODULES__/g, modules)
    .replace(/__INJECT_ENTRY__/g, entry)
    .replace(/__INJECT_HOST__/g, injectedHost);

  return stripComments(template);
};
```

## Mocking and Testing

The environment mock allows tests to run in a deterministic, isolated context.
It simulates:
-  Global variables
-  Network or dynamic-loading behavior
-  Timers
-  Async operations

Run tests:
``` js
node 1.0.1/run.test.js
```

**Result:**
``` mathematica
Greeting Module Default Export: PASS
RPC Module getMessage Output: PASS
Colors Module Dynamic JSON: PASS
Styles Module Dynamic CSS: PASS
Somewhere Dynamic Module (Microfrontend): PASS
All tests passed (100% success)
```

## Purpose

The testing suite ensures that each runtime version:
1. Maintains backward compatibility
2. Correctly loads static and dynamic modules
3. Supports bundled execution and browser-native ESM
4. Resolves modules using both default (&) and custom namespaces
5. Produces consistent, predictable results across versions

Each new version iterates on module resolution capabilities, improving stability and extensibility for production bundling workflows.

## License

MIT
