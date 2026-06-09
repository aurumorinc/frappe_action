# Frappe Orbit - Agent Guidelines

This document provides comprehensive guidelines, architectural principles, and context for AI agents working on the Frappe Orbit codebase. **Read this document thoroughly before making any changes.**

## 📁 Project Structure

The repository is a monorepo containing both a Frappe backend application and a WXT-based browser extension.

*   `frappe_orbit/`: The Frappe backend application (Python, MariaDB). Contains DocTypes for Actions, Nodes, Edges, ToDos, and Settings.
*   `packages/orbit/`: The WXT browser extension (TypeScript, Vue 3, Tailwind CSS). Contains the execution engine, background scripts, content scripts, and UI components.
*   `specs/`: Technical specifications and blueprints. **Always refer to these documents for architectural decisions.**
*   `plans/`: Implementation plans and blueprints for specific features.
*   `third_party/`: Git submodules for external dependencies (e.g., `automa`, `wxt`, `frappe-ui`, `ghost-cursor`, `HumanTyping`, `stagehand`).

## 🏛️ Architectural Principles

1.  **Separation of Concerns**: The Frappe backend is responsible for definition, compilation, and storage. The browser extension is strictly the execution engine.
2.  **Compiled Workflows**: Workflows (`Actions`) are compiled into a standardized JSON graph format by the backend before being sent to the extension. The extension should not need to understand Frappe-specific data structures.
3.  **Human-in-the-Loop (HITL)**: The system is designed to augment human workflows, not just replace them. The extension UI (`ToDo` component) is central to guiding users through manual steps.
4.  **AI-Driven Automation**: Prefer natural language instructions (`act`, `extract`, `observe`) over brittle CSS/XPath selectors. Rely on the backend LLM gateway and the `Action Node Cache` for deterministic, self-healing execution.
5.  **Stealth Execution**: Use `CDPService` and `GhostCursor` for interactions to mimic human behavior and avoid bot detection.
6.  **Telemetry & Observability**: Use Pino for structured logging, Sentry for error tracking, and PostHog for product analytics.

## 🐍 Backend Guidelines (Frappe/Python)

*   **Code Style**: Follow PEP 8. Use `ruff` for linting and formatting.
*   **Type Hinting**: Use Python type hints extensively for all function signatures and class attributes.
*   **DocTypes**: Keep DocType Python controllers thin. Move complex business logic to dedicated service modules or the `Action` compilation logic.
*   **Testing**: Write unit tests for all compilation logic and API endpoints using Frappe's testing framework (`frappe.tests`). Use `IntegrationTestCase` for DB interactions and `UnitTestCase` for pure logic.
*   **Error Handling**: Use custom exceptions for domain-specific errors. Do not use exceptions for normal control flow.

## 🌐 Frontend Guidelines (WXT/TypeScript/Vue)

*   **Framework**: Use WXT for extension development. Follow its conventions for entrypoints (`background.ts`, `content.ts`, `popup/`, `options/`).
*   **UI Components**: Use Vue 3 (Composition API) and Tailwind CSS. Leverage `frappe-ui` components where possible for consistency.
*   **State Management**: Use Vue composables (e.g., `useTodos`) for managing state within the UI. The Engine state should be managed separately in the background script.
*   **Messaging**: Use WXT's messaging API (`defineExtensionMessaging`) for communication between the background script, content scripts, and the popup/UI.
*   **Testing**: Use Vitest for unit and integration tests. Place tests in the `tests/` directory, mirroring the `src/` structure. Use Playwright for E2E tests.
*   **Logging**: Use the configured Pino logger (`src/utils/logging.ts`). **NEVER** use raw `console.log`.
*   **Security**: Validate all external input using Zod. Do not trust client-side data.

## 🤖 AI Agent Workflow

1.  **Information Gathering**: Always read the relevant specifications in `specs/` and `plans/` before starting a task. Use `list_files` and `read_file` to understand the current state of the codebase.
2.  **Clarification**: If requirements are ambiguous, ask clarifying questions. Do not make assumptions.
3.  **Planning**: For complex tasks, create or update a blueprint in the `plans/` directory before writing code.
4.  **Execution**: Follow the architectural principles and coding guidelines outlined above. Ensure changes align with the established patterns.
5.  **Testing**: Write or update tests for any new functionality or bug fixes. Ensure both unit and E2E tests pass.

## 🔑 Key Technologies & Libraries

*   **Backend**: Python 3.14+, Frappe Framework, LiteLLM
*   **Frontend**: TypeScript, WXT, Vue 3, Tailwind CSS, Frappe UI, Zod, Pino
*   **Automation**: Chrome DevTools Protocol (CDP), GhostCursor, Stagehand concepts, HumanTyping
*   **Testing**: Vitest, Playwright, `@testing-library/vue`
*   **Telemetry**: Sentry (`@sentry/browser`), PostHog (`posthog-js`)

## 📝 Node Types Reference

When working with the execution engine, be aware of the supported node types defined in `Action Node`:
`trigger`, `loop-breakpoint`, `hitl`, `sub-task`, `redirect`, `nodes:get-text`, `nodes:element-exists`, `nodes:event-click`, `nodes:trigger-event`, `nodes:forms`, `nodes:javascript-code`, `nodes:attribute-value`, `nodes:conditions`, `nodes:create-element`, `nodes:element-scroll`, `nodes:hover-element`, `nodes:link`, `nodes:press-key`, `nodes:loop-data`, `nodes:loop-elements`, `nodes:clipboard`, `nodes:save-assets`, `nodes:switch-to`, `nodes:take-screenshot`, `nodes:upload-file`, `nodes:verify-selector`, `nodes:browser-event`, `nodes:delay`, `nodes:switch-tab`, `nodes:close-tab`, `nodes:cookie`, `nodes:while-loop`, `nodes:export-data`, `nodes:delete-data`, `nodes:sort-data`, `nodes:workflow-state`, `nodes:act`, `nodes:extract`, `nodes:observe`.
