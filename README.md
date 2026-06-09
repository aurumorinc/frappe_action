# Frappe Orbit

Frappe Orbit is an intelligent browser co-pilot and automation system that seamlessly integrates with your Frappe and ERPNext instances. It allows you to define, compile, and execute complex browser-based automation workflows (Actions) directly within the user's browser.

The system consists of two primary components:
1. **Frappe Backend App**: A Frappe application for defining workflows, managing settings, and providing an LLM gateway for AI-driven interactions.
2. **WXT Browser Extension**: A modern browser extension (built with WXT, Vue 3, and TypeScript) that acts as a "Human-in-the-Loop" (HITL) execution engine, running workflows directly in the browser.

This architecture is particularly powerful for tasks requiring interaction with third-party websites, data scraping, network request interception, or guiding users through manual steps (like solving captchas or 2FA) where purely server-side bots would fail or be blocked.

## 🌟 Key Features

- **Visual Workflow Definition**: Define complex workflows using a node-and-edge graph structure in the Frappe backend.
- **Human-in-the-Loop (HITL)**: Seamlessly pause automation to allow human intervention for tasks like captchas, approvals, or manual data entry.
- **AI-Driven Automation**: Utilize natural language instructions (`act`, `extract`, `observe`) instead of brittle CSS/XPath selectors, powered by Stagehand concepts and LiteLLM.
- **Stealth Execution**: Mimic human behavior using Chrome DevTools Protocol (CDP) and GhostCursor to avoid bot detection.
- **Deterministic Caching**: Cache AI-resolved XPaths for instant, deterministic execution on subsequent runs, with self-healing capabilities if the DOM changes.
- **Nested Workflows**: Support for complex, multi-step workflows with nested ToDo items.
- **Secure Authentication**: OAuth 2.0 integration for secure communication between the extension and your Frappe site.
- **Comprehensive Telemetry**: Built-in support for Sentry (error tracking) and PostHog (product analytics).

## 🏗️ Architecture Overview

### Frappe Backend (`frappe_orbit/`)

The backend is responsible for storing, compiling, and managing the automation logic. It uses standard Frappe DocTypes:

*   **`Action`**: The core document representing a complete workflow blueprint. It contains child tables for Nodes and Edges. When saved, it compiles the nodes and edges into a standardized JSON format (`compiled_json`) that the browser extension can parse and execute.
*   **`ToDo`**: Represents an actionable instance of a workflow assigned to a user. A `ToDo` links directly to an `Action` (which acts as its blueprint).
*   **`Action Node`**: Represents a single step in the workflow. Node types include `trigger`, `element-exists`, `get-text`, `network-request`, `manual-step`, `guide-user`, `redirect`, `element-clicked`, and AI-driven nodes (`act`, `extract`, `observe`).
*   **`Action Edge`**: Connects nodes to define the flow. It can contain optional JavaScript conditions evaluated at runtime for branching logic.
*   **`Orbit Settings`**: Manages the connection and authorization status between the Frappe site and the browser extension.
*   **`Model`**: A provider-agnostic configuration for LLMs (leveraging LiteLLM).
*   **`Action Node Cache`**: A centralized cache that stores deterministic XPath selectors resolved by the LLM for specific natural language instructions and URLs.

### Browser Extension (`packages/orbit/`)

Built using the **WXT** framework (Vue 3 + TypeScript + Vite + Tailwind CSS), the extension is the execution environment for the compiled JSON workflows. It leverages modern web extension APIs (Manifest V3) and is designed to be cross-browser compatible.

*   **The Engine**: Maintains the state of the running workflow (`scrapedData`) and tracks the current node. It evaluates edge conditions dynamically to determine the next node.
*   **Background Script**: Acts as the orchestrator. It listens for a `START_ACTION` message, initializes the Engine, and routes tasks based on node types.
*   **Content Script & UI**: Injects a Vue component (`ToDo`) into the webpage. It handles Human-in-the-Loop (HITL) scenarios by displaying tasks and sub-tasks, allowing a human user to complete manual nodes and advance the engine.
*   **Observers**: Background and content script utilities that monitor the DOM and Network to extract data required by the workflow.

## 🤖 AI-Driven Automation (Stagehand Integration)

The extension integrates Stagehand-inspired concepts to allow workflows to be defined using natural language instructions rather than brittle, hardcoded CSS/XPath selectors.

1.  **AI Nodes**: `nodes:act`, `nodes:extract`, and `nodes:observe` accept natural language instructions.
2.  **DOM Snapshotting**: The content script captures a simplified representation of the DOM (Accessibility Tree) and assigns short IDs to interactive elements.
3.  **LLM Inference**: The extension sends the simplified DOM and instruction to the Frappe backend, which uses LiteLLM to securely query the configured model and returns the target element ID.
4.  **Deterministic Caching**: Resolved XPaths are saved to the `Action Node Cache` in the Frappe backend for instant execution on subsequent runs.
5.  **Self-Healing**: If a cached XPath fails, the extension automatically falls back to the LLM inference flow to find the new element location and updates the cache.
6.  **Stealth Execution**: Interactions are performed using the background script's `CDPService` and `GhostCursor` to ensure stealth and human-like behavior.

## 🔐 Authentication Flow

Frappe Orbit uses OAuth 2.0 to securely connect the browser extension to your Frappe site.

1. **Setup OAuth Client**: Create an OAuth Client in your Frappe site (`Setup > Integrations > OAuth Client`) with the redirect URI `https://<extension-id>.chromiumapp.org/`.
2. **Configure Orbit Settings**: Go to the `Orbit Settings` page in your Frappe site and enter the Client ID.
3. **Authorize**: Click the "Authorize" button in the top right corner of the `Orbit Settings` page. This will initiate the OAuth flow and securely store the access tokens in the extension.

## 🚀 Execution Flow

1. A user defines an `Action` in Frappe (Nodes + Edges).
2. Frappe compiles this into a JSON graph.
3. The extension fetches the assigned `ToDo` and its associated `Action` graph.
4. The extension's `Engine` starts at the root node.
5. For each node, the extension observes the DOM, intercepts a network request, uses AI to interact, or prompts the user via the injected UI.
6. Extracted data is saved to the engine's state.
7. The engine evaluates edge conditions using the state to move to the next node until the graph is exhausted.
8. The extension saves the updated `ToDo` document to the backend.

## 🛠️ Installation & Development

### Backend (Frappe App)

You can install the Frappe app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch main
bench install-app frappe_orbit
```

### Frontend (Browser Extension)

To build the browser extension:

```bash
cd apps/frappe_orbit/packages/orbit
pnpm install
pnpm run build
```

To run the extension in development mode (with hot-reloading):

```bash
pnpm run dev
```

### Testing

The project uses Vitest for unit testing and Playwright for End-to-End (E2E) testing.

```bash
cd apps/frappe_orbit/packages/orbit
# Run unit tests
pnpm run test

# Run E2E tests
pnpm run test:e2e
```

## 🤝 Contributing

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

## 📄 License

MIT License. See `LICENSE` for details.
