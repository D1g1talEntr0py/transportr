# 🤖 AGENT Guidelines

This document outlines the core principles, coding standards, and workflow protocols for AI assistants contributing to this project.

---

## 📦 Project Overview

**transportr** is a TypeScript 6 Fetch API wrapper providing type-safe HTTP requests with advanced abort/timeout handling, event-driven architecture, and automatic content-type based response processing.

- **Package Manager**: pnpm (workspace configured via `pnpm-workspace.yaml`)
- **TypeScript Version**: 6.0 with strict mode, `isolatedDeclarations`, and `verbatimModuleSyntax`
- **Build Tool**: Custom `tsbuild` with entry point at `./src/transportr.ts`
- **Test Framework**: Vitest 4.x with dual-project configuration (unit/integration)
- **Current Coverage**: ~100% line coverage

---

## 💻 Core Principles

1. **Clarity and Brevity:** All responses, comments, and documentation must be concise, clear, and easy to understand.
2. **Performance First:** Code implementation must **always** prioritize performance over readability or other metrics.
3. **Language:** All code, comments, and documentation must be written in English.
4. **Immutability:** Prefer immutable patterns and `as const` assertions where applicable.

---

## 📜 Coding Standards

### General
1. **Code Formatting:** Do **not** change the formatting of any existing code. Adhere strictly to the established style.
2. **Line Wrapping:** Wrapping lines is unacceptable in almost every circumstance. Keep lines within the established limits.
3. **Indentation:** Use tabs (not spaces). See `eslint.config.js` for enforcement.
4. **Quotes:** Use single quotes exclusively.
5. **Semicolons:** Required, except omit in one-line blocks/class bodies.

### TypeScript 6 Specific
1. **Type Safety:** Prioritize strict type safety. Avoid the `any` type whenever possible. Use specific types to ensure compile-time checks and optimized runtime performance.
2. **Isolated Declarations:** All exports must have explicit type annotations (`isolatedDeclarations: true`).
3. **Verbatim Module Syntax:** Use `import type` for type-only imports (`verbatimModuleSyntax: true`).
4. **Method Signatures:** Use property style for method signatures (`@typescript-eslint/method-signature-style: property`).
5. **Unused Variables:** Prefix unused parameters with `_` (e.g., `_unused`).
6. **No Unchecked Indexed Access:** All index access is checked (`noUncheckedIndexedAccess: true`).

### Documentation
1. Write JSDoc for all exports (`eslint-plugin-jsdoc` enforced).
2. Use `@template` tags for generic type parameters.
3. Use `@param` for all parameters (skip destructured params per config).
4. Document complex logic and public-facing APIs thoroughly.

---

## 🏗️ Architecture Patterns

### Response Handlers
- Register via `Transportr.contentTypeHandlers` array entries: `[contentType, handler]`
- Handlers must match signature: `ResponseHandler<T> = (response: Response) => Promise<T>`
- Use `DOMPurify.sanitize()` for HTML/XML content before parsing
- Cache `MediaType` instances via `Transportr.mediaTypeCache`

### Signal Management
- Each request creates a `SignalController` wrapping `AbortController.any([signals...])`
- Controllers tracked in `Transportr.signalControllers` Set
- Cleanup via `signalController.destroy()` in `finally` blocks

### Event System
- Global events: `Transportr.register(event, handler)` (static)
- Instance events: `transportr.register(event, handler)`
- Lifecycle: `configured` → `success|error|aborted|timeout` → `complete` → `all-complete`

---

## 🧪 Testing Protocol

### Test Organization
- **Integration tests** (`node` env): Real network calls to `mockapi.io`
- **Unit tests** (`jsdom` env): DOM-related functionality, mocked fetch

### Guidelines
1. **Test Creation:** Write unit tests for your code. Create test files for all source files, focusing on public or exported methods/functions.
2. **Test Strategy:** Tackle low-hanging fruit first. Do **not** mock internal (private) methods or implementation details of a class or module. Test the public contract.
3. **Test Fixing:** When instructed to fix tests, do not remove or modify existing implementation code. If a bug in the implementation is discovered while fixing a test, report it clearly instead of modifying the source code.
4. **Code Coverage:**
    * Check coverage with `pnpm test:coverage`
    * Target 100% line coverage; current state is ~100%
    * Add tests to existing test files, not new files
    * Note gaps requiring complex mocks and move on

### Test Patterns
- Import with `.js` extensions for ESM compatibility
- Mock `globalThis.location.origin` for constructor tests
- Use `vi.fn()` for `URL.createObjectURL`/`revokeObjectURL` spies
- Setup file: `tests/scripts/setup.ts`

---

## 🔧 Tooling & Workflow

### Commands
| Command | Description |
|---------|-------------|
| `pnpm build` | Build via `tsbuild` |
| `pnpm build:watch` | Watch mode build |
| `pnpm lint` | ESLint check |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm type-check` | TypeScript type checking |

### Guidelines
1. **Command Execution:** Do not prefix terminal commands with a `cd` command to the repository root. Assume commands will be run from the current working directory and provide relative paths as needed.
2. **Dependency Management:** Do not suggest or add new dependencies unless they are critical for the required functionality and no native or existing solution is feasible.
3. **Path Aliases:** Use `@src/*` for source files and `@types` for type imports.

---

## 📁 File Structure

```
src/
├── transportr.ts          # Main class and response handlers
├── signal-controller.ts   # Abort/timeout signal management
├── http-error.ts          # HTTP error class
├── response-status.ts     # Response status wrapper
├── constants.ts           # Shared constants, media types, events
├── http-media-type.ts     # Media type enum
├── http-request-headers.ts
├── http-request-methods.ts
├── http-response-headers.ts
└── @types/
    └── index.ts           # All type definitions
tests/
├── *.test.ts              # Test files
└── scripts/
    ├── setup.ts           # Test setup/mocks
    └── config.ts          # Test configuration
```