# Runtime Test Suite

This folder contains versioned runtime environments for the JavaScript bundler engine.  
Each version folder (e.g., `1.0.1`, `1.0.2`, `1.0.3`) includes a `run.test.js` file to verify the integrity and functionality of the runtime and its generated template code.

---

## Structure Overview

Each runtime version contains:
- **runtime.js** — the main runtime template that defines module loading, registration, and execution logic.
- **env.mock.js** — environment mock file used for isolated testing.
- **run.test.js** — executes the runtime to validate module registration, exports, and dynamic import behavior.
- **dynamic/** (optional) — holds dynamic modules that simulate asynchronous loading.
- **template.js** (in 1.0.3) — represents the generated runtime structure for comparison or debugging purposes.

---

## Test Utility

Each `run.test.js` uses the same testing skeleton:

```js
function runTest(name, input, expected, final = false) {
  // Normalizes input and expected output
  // Compares results and logs PASS/FAIL
  // Aggregates and prints summary when `final` is true
}
```

The `runTest` function ensures consistent verification across runtime versions, ignoring trivial formatting differences and focusing on structural correctness.

---

## Version Summaries

### Version 1.0.1
**Focus:** Basic runtime validation  
Tests ensure:
- Proper export handling in static modules.
- JSON and JS module integration.

**Result:**
```
Greetings Module Exported Value: PASS
Greeting Module Default Export: PASS
Colors Module Default Export Object: PASS
All tests passed (100% success)
```

### Version 1.0.2
**Focus:** Dynamic imports and modular separation  
Tests ensure:
- Dynamic loading of JSON and CSS modules.
- Continued support for static synchronous modules.

**Result:**
```
Greeting Module Default Export: PASS
Colors Module Dynamic JSON: PASS
Styles Module Dynamic CSS: PASS
All tests passed (100% success)
```

### Version 1.0.3
**Focus:** RPC and hybrid module execution  
Tests ensure:
- RPC module returns expected output.
- Dynamic and static modules interact seamlessly.

**Result:**
```
Greeting Module Default Export: PASS
RPC Module getMessage Output: PASS
Colors Module Dynamic JSON: PASS
Styles Module Dynamic CSS: PASS
All tests passed (100% success)
```

---

## Purpose

The **runtime test suite** verifies that the bundler engine’s generated runtime:
1. Works across versions with backward compatibility.
2. Correctly loads both static and dynamic modules.
3. Supports hybrid environments (bundled and browser-native ESM).
4. Provides consistent results across updates.

Each runtime iteration adds or refines support for new module patterns, ensuring reliability and maintainability in production bundling.
