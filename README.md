# Frappe Orbit

Frappe Orbit is a system designed to define, compile, and execute browser-based automation workflows (Actions). It consists of a Frappe backend app for defining workflows and a WXT-based browser extension for executing them.

The primary purpose of the extension is to act as a "Human-in-the-Loop" (HITL) execution engine. It allows complex, multi-step workflows defined in the Frappe backend to be executed directly within the user's browser. This is particularly useful for tasks that require interacting with third-party websites, scraping data, intercepting network requests, or guiding a user through manual steps (like solving captchas) where a purely server-side bot would fail or be blocked.

## Architecture Overview

The system is divided into two main components:

1. **Frappe Backend App**: Manages the definition of workflows using a node-and-edge graph structure. It compiles these workflows into a JSON format that the extension can understand.
2. **WXT Browser Extension**: Acts as the execution engine (bot/co-pilot) that runs these workflows directly in the user's browser, interacting with the DOM and network.

### Frappe Backend

The backend is responsible for storing and compiling the automation logic. It uses standard Frappe DocTypes to model a directed graph.

*   **`Action`**: The core document representing a complete workflow. It contains child tables for Nodes and Edges. When saved, it compiles the nodes and edges into a standardized JSON format (`compiled_json`) that the browser extension can parse and execute.
*   **`Action Node`**: Represents a single step in the workflow. Node types include `trigger`, `element-exists`, `get-text`, `network-request`, `manual-step`, and `guide-user`. It defines the target selector, what to extract, and the data key to store the result.
*   **`Action Edge`**: Connects nodes to define the flow. It can contain optional JavaScript conditions evaluated at runtime for branching logic.

### Browser Extension

Built using the **WXT** framework (React + TypeScript + Vite), the extension is the execution environment for the compiled JSON workflows. It leverages modern web extension APIs (Manifest V3) and is designed to be cross-browser compatible.

*   **The Engine**: Maintains the state of the running workflow (`scrapedData`) and tracks the current node. It evaluates edge conditions dynamically to determine the next node.
*   **Background Script**: Acts as the orchestrator. It listens for a `START_ACTION` message, initializes the Engine, and routes tasks based on node types (e.g., calling network observers or sending messages to the content script for DOM observation).
*   **Observers**:
    *   **DOM Observer**: Uses `MutationObserver` to wait for specific DOM elements and extracts data (text, attributes).
    *   **Network Observer**: Uses `chrome.webRequest.onBeforeRequest` to intercept network traffic matching a regex and extracts request bodies.
*   **Content Script & UI**: Injects a React component (`OrbitCoPilot`) into the webpage. It handles Human-in-the-Loop (HITL) scenarios by displaying tasks and sub-tasks, allowing a human user to complete `manual-step` nodes (e.g., solving captchas) and advance the engine.

## Authentication Flow

Frappe Orbit uses OAuth 2.0 to securely connect the browser extension to your Frappe site.

1. **Setup OAuth Client**: Create an OAuth Client in your Frappe site (`Setup > Integrations > OAuth Client`) with the redirect URI `https://<extension-id>.chromiumapp.org/`.
2. **Configure Orbit Settings**: Go to the `Orbit Settings` page in your Frappe site and enter the Client ID.
3. **Authorize**: Click the "Authorize" button in the top right corner of the `Orbit Settings` page. This will initiate the OAuth flow and securely store the access tokens in the extension.

## Execution Flow

1. A user defines an `Action` in Frappe (Nodes + Edges).
2. Frappe compiles this into a JSON graph.
3. The JSON is sent to the browser extension.
4. The extension's `Engine` starts at the root node.
5. For each node, the extension observes the DOM, intercepts a network request, or prompts the user via the injected React UI.
6. Extracted data is saved to the engine's state.
7. The engine evaluates edge conditions using the state to move to the next node until the graph is exhausted.

## Installation

You can install the Frappe app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch main
bench install-app frappe_orbit
```

To build the browser extension:

```bash
cd apps/frappe_orbit/packages/frappe_orbit
pnpm install
pnpm run build
```

To run the extension in development mode (with hot-reloading):

```bash
pnpm run dev
```

## Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/frappe_orbit
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

## License

MIT
