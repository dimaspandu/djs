/**
 * Normalize string for comparison:
 * - Convert CRLF to LF
 * - Preserve newlines at start/end
 */
function normalize(str) {
  return str.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

// Setup mocks first
const testResults = [];

/**
 * runTest(name, input, expected, final)
 * 
 * Executes a single test case by comparing the provided `input` with the `expected` output.
 * Both values are normalized using `normalize()` to avoid false negatives caused by 
 * formatting differences (e.g., spacing, quotes, JSON formatting).
 * 
 * Parameters:
 * - name (string): A descriptive name for the test case.
 * - input (any): The actual value or result produced by the module/code.
 * - expected (any): The expected value to compare against.
 * - final (boolean, optional): If set to true, the function will print a summary table
 *   of all test results recorded in `testResults` so far. Defaults to false.
 * 
 * Behavior:
 * - Compares normalized input and expected values.
 * - Stores the result as { name, pass } in `testResults`.
 * - Prints PASS/FAIL for the current test.
 * - If the test fails, prints actual and expected values for debugging.
 * - If `final` is true, aggregates all test results and prints a summary table 
 *   with total tests, passed, failed, and pass percentage per test name.
 */
function runTest(name, input, expected, final = false) {
  const RED = "\x1b[31m";
  const GREEN = "\x1b[32m";
  const RESET = "\x1b[0m";

  const result = input;
  const pass = normalize(JSON.stringify(result)) === normalize(JSON.stringify(expected));

  testResults.push({ name, pass });

  console.log(`--- Test: ${name} ---`);
  console.log(pass ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`);

  if (!pass) {
    console.log(`${RED}--- Output ---${RESET}`, result);
    console.log(`${RED}--- Expected ---${RESET}`, expected);
  }

  if (!final) return;

  // ---- Summary Table ----
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

  // Print only failed rows with highlight
  const failedRows = summary.filter(r => r.failed > 0);

  if (failedRows.length > 0) {
    console.log(`\n${RED}Failed Tests:${RESET}`);
    failedRows.forEach(row => {
      console.log(
        `${RED}${row.name}${RESET} | total: ${row.total}, passed: ${row.passed}, failed: ${row.failed}, pass%: ${row["pass %"]}`
      );
    });
  }
}

// ----------------------------------------------------------------------------
// MOCK WINDOW OBJECT
// ----------------------------------------------------------------------------
/**
 * Custom Window mock to simulate a browser-like environment.
 * Useful for testing modules that rely on `window` and `document`.
 */
function Window() {
  const $this = this;

  // --------------------------------------------------------------------------
  // MOCK LOCATION OBJECT
  // --------------------------------------------------------------------------
  /**
   * Simulates the window.location object in a browser.
   * Provides properties and methods that scripts often use.
   */
  this.location = {
    ancestorOrigins: {
      length: 0
    },
    hash: "",
    host: "mock.com",
    hostname: "mock.com",
    href: "https://mock.com/",
    origin: "https://mock.com",
    pathname: "/",
    port: "",
    protocol: "https:",
    crossOrigin: "https://djsmicrofrontends.netlify.app/",
    
    /**
     * Simulates window.location.assign(url)
     * @param {string} url
     */
    assign: function(url) {
      console.log(`Assign called with: ${url}`);
    },

    /**
     * Simulates window.location.reload()
     */
    reload: function() {
      console.log("Reload called");
    },

    /**
     * Simulates window.location.replace(url)
     * @param {string} url
     */
    replace: function(url) {
      console.log(`Replace called with: ${url}`);
    },

    search: "",

    /**
     * Converts location object to string
     * @returns {string} href
     */
    toString: function() {
      return this.href;
    }
  };

  // --------------------------------------------------------------------------
  // MOCK DOCUMENT OBJECT
  // --------------------------------------------------------------------------
  /**
   * Simulates the window.document object in a browser.
   * Provides minimal API needed for dynamic script loading and DOM interaction.
   */
  this.document = {
    /**
     * Simulates document.createElement(tagName)
     * Only implements basic attributes and event hooks
     * @param {string} tagName
     * @returns {object} element
     */
    createElement: function(tagName) {
      const elem = {
        tagName,
        attributes: {},
        onload: null,
        onerror: null,
        setAttribute: function(name, value) {
          this.attributes[name] = value;
        }
      };
      return elem;
    },

    /**
     * Placeholder for getElementsByTagName, no-op
     */
    getElementsByTagName: function() { return []; },

    /**
     * Simulates <head> element in the DOM
     * Only implements appendChild to allow dynamic module imports
     */
    head: {
      appendChild: async function(node) {
        if (
          node &&
          node.attributes &&
          node.attributes.src &&
          node.onload
        ) {
          // Convert the script src to a relative path for dynamic import
          const moduleSrc = node.attributes.src.includes($this.location.crossOrigin) ?
            `./${node.attributes.src.split($this.location.crossOrigin)[1]}` :
            `./${node.attributes.src.split($this.location.href)[1]}`;

          // Dynamically import the module
          await import(moduleSrc);

          // Call the onload hook if defined
          node.onload();
        }
      }
    }
  };

  // Link document.location to window.location for consistency
  this.document.location = this.location;
}

// ----------------------------------------------------------------------------
// GLOBAL ASSIGNMENTS
// ----------------------------------------------------------------------------
const window = new Window(); // Instantiate our custom Window mock

/**
 * Expose the Window constructor globally.
 * This allows tests or modules to create new Window instances if needed.
 * Example: const newWin = new Window();
 */
global.Window = Window;

/**
 * Expose the window instance globally.
 * Any code that references `window` will use this mock, simulating
 * a real browser environment for scripts, modules, or tests.
 */
global.window = window;

/**
 * Expose the document object globally.
 * Scripts that rely on `document` (e.g., createElement, head.appendChild)
 * will interact with this mock instead of a real DOM.
 */
global.document = window.document;

/**
 * Expose the runTest function globally.
 * This allows any test script or module to call runTest(...) without
 * needing to import it explicitly.
 */
global.runTest = runTest;

