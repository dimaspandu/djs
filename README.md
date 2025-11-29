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
    │  └─ test.html
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

/**
 * bundle(graph, entryFilePath, host, includeRuntime)
 * ---------------------------------------------------
 * Generates the final bundle string.
 */
function bundle(graph, entryFilePath, host, includeRuntime) {
  logger.info(`[BUNDLE] Building bundle for entry: ${entryFilePath}`);
  let modules = ``;

  graph.forEach((mod) => {
    modules += `"${mod.id}": [
      function(require, exports, module) {
        ${mod.code}
      },
      ${JSON.stringify(mod.mapping)}
    ],`;
  });

  const entryId = entryFilePath ? normalizeId(entryFilePath) : null;

  if (includeRuntime) {
    logger.info("[BUNDLE] Including runtime in bundle.");
    return cleanUpCode(`
      ${RUNTIME_CODE(host, `{${modules.slice(0, -1)}}`, `"${entryId}"`)}
    `);
  } else {
    logger.info("[BUNDLE] Generating lightweight bundle (no runtime).");
    return cleanUpCode(`
      (function(global, modules, entry) {
        global["*pointers"]("&registry")(modules);
        global["*pointers"]("&require")(entry);
      })(
        typeof window !== "undefined" ? window : this,
        {${modules.slice(0, -1)}},
        "${entryId}"
      );
    `);
  }
}
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

## Browser Testing (test.html)

Each runtime version may include a test.html file that allows running tests directly inside a browser environment.
This is useful for verifying that the DJS runtime behaves correctly not only in Node.js but also in real browser execution contexts such as:
-  Live Server
-  Static HTTP file servers
-  Local development environments
-  Web-based sandboxes

### How It Works

The browser-based tests rely on two utilities:
1. normalize(str)
Ensures consistent comparison of output values by:
-  Converting CRLF → LF
-  Normalizing multiple spaces
-  Trimming outer whitespace
2. runTest(name, input, expected, final?)
A simple test runner that:
-  Compares actual output with expected output
-  Logs PASS/FAIL
-  Prints debug output when tests fail
-  Generates an aggregated summary table when `final = true`

### Example `test.html`

Included inside each runtime version folder:
``` html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Client Testing - 1.0.1</title>
</head>
<body>
  <h1>Client Testing - 1.0.1</h1>

  <script>
    // Normalizes string output for stable comparisons
    function normalize(str) {
      return str.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
    }

    const testResults = [];

    // Executes a single test and logs results to the browser console
    function runTest(name, input, expected, final = false) {
      const result = input;
      const pass = normalize(JSON.stringify(result)) === normalize(JSON.stringify(expected));

      testResults.push({ name, pass });

      console.log(`--- Test: ${name} ---`);
      console.log(pass ? "PASS" : "FAIL");

      if (!pass) {
        console.log("Output:", result);
        console.log("Expected:", expected);
      }

      if (final) {
        const grouped = {};
        for (const { name, pass } of testResults) {
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push(pass);
        }

        const summary = Object.entries(grouped).map(([name, results]) => {
          const total = results.length;
          const passed = results.filter(r => r).length;
          const failed = total - passed;
          const percent = total === 0 ? 0 : ((passed / total) * 100).toFixed(2);
          return { name, total, passed, failed, "pass %": percent };
        });

        console.table(summary);
      }
    }
  </script>

  <!-- Loads the versioned runtime -->
  <script src="./runtime.js"></script>
</body>
</html>
```

### How to Run Browser Tests

1. Open the folder of a specific runtime version (e.g., 1.0.1/)
2. Start a local HTTP server such as:
   -  VSCode Live Server
   -  python3 -m http.server
   -  npx http-server
3. Open test.html in your browser
4. Open DevTools → Console
5. Review PASS/FAIL output and summary tables

Examples that can be tested include:
-  Static imports
-  Dynamic import() handling
-  Custom namespace resolution
-  JSON/CSS/text resource loading
-  Dynamic modules inside /dynamic/
-  Micro-frontend modules inside custom namespaces

Browser-based tests ensure parity between **Node.js testing** and **actual browser environments**, giving high confidence in module resolution and execution behavior.

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
