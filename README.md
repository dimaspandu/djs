# DJS (Distributed JavaScript Modules)

DJS is a lightweight, modular JavaScript execution model designed for
browser-based runtimes, bundlers, and compilers. It provides an
isolated, spec-like environment for resolving modules, evaluating code,
and handling versioned distributions. Each version folder (e.g.,
`1.0.0`, `1.1.0`) contains self-contained module logic, enabling
predictable and reproducible builds.

## Features

-   Distributed JavaScript module execution.
-   Versioned module directories for stable runtime behavior.
-   Runtime-friendly architecture for custom bundlers and compilers.
-   Sandboxed evaluation for browser execution.
-   Support for mocks, HTTP-based module loading, and environment
    simulation.

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

Each runtime version contains:
- **dynamic/** (optional) — holds dynamic modules that simulate asynchronous loading.
- **resources/** (optional) — holds external modules that simulate asynchronous loading.
- **env.mock.js** — environment mock file used for isolated testing.
- **run.test.js** — executes the runtime to validate module registration, exports, and dynamic import behavior.
- **runtime.js** — the main runtime template that defines module loading, registration, and execution logic.
- **template.js** represents the generated runtime structure for comparison or debugging purposes.

## Usage

Each version folder contains an independent implementation of the DJS
runtime. This allows tools such as bundlers, compilers, or in-browser
engines to depend on a specific runtime version.

Example usage inside a bundler:

``` js
/**
 * RUNTIME_CODE(host)
 * -------------------
 * Returns the runtime code as a string literal.
 */
const RUNTIME_CODE = (host, modules, entry) => {
  const runtimeTemplatePath = path.join(__dirname, "djs/1.0.0/template.js");

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

The project includes a mock environment for deterministic testing. Mocks
allow simulation of:

-   Global variables
-   Network-based module loading
-   Timers and async behavior

Example mock initialization:

``` js
node 1.0.0/run.test.js
```

**Result:**
```
Greeting Module Default Export: PASS
RPC Module getMessage Output: PASS
Colors Module Dynamic JSON: PASS
Styles Module Dynamic CSS: PASS
All tests passed (100% success)
```

## Purpose

Verifies that the bundler engine’s generated runtime:
1. Works across versions with backward compatibility.
2. Correctly loads both static and dynamic modules.
3. Supports hybrid environments (bundled and browser-native ESM).
4. Provides consistent results across updates.

Each runtime iteration adds or refines support for new module patterns, ensuring reliability and maintainability in production bundling.

## License

MIT
