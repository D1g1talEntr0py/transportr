# Copilot Instructions for transportr

**Note**: All AI coding agents working on this project must also read and follow the guidelines in `AGENTS.md`, which defines core principles, coding standards, testing protocols, and workflow requirements.

A TypeScript 6 Fetch API wrapper providing type-safe HTTP requests with advanced abort/timeout handling, event-driven architecture, and automatic content-type based response processing.

## Architecture & Data Flow

**Core Request Pipeline** (`src/transportr.ts`):
1. `execute()` → merges user/instance/default options via `processRequestOptions()`
2. `processRequestOptions()` → creates `SignalController`, normalizes headers/searchParams via `mergeHeaders`/`mergeSearchParams`, stringifies JSON bodies when `content-type` includes `json`
3. `_request()` → performs `fetch`, selects response handler from `contentTypeHandlers` array based on `content-type` header, emits lifecycle events (`success/error/complete/all-complete`)
4. Response handlers (`handleJson`, `handleHtml`, etc. in `src/response-handlers.ts`) → transform raw `Response` to typed return values

**Signal & Abort Management** (`src/signal-controller.ts`):
- Each request gets a `SignalController` that wraps `AbortController.any([userSignal, timeoutSignal, internalSignal])`
- Controllers tracked in static `Transportr.signalControllers` Set; `Transportr.abortAll()` cancels all in-flight requests
- Timeout detection: `handleEvent()` checks `reason instanceof DOMException` and `reason.name === 'TimeoutError'`, then dispatches custom `timeoutEvent`
- Cleanup via `signalController.destroy()` in `finally` blocks to prevent memory leaks

**Event System** (via `@d1g1tal/subscribr`):
- Global events: `Transportr.register(event, handler)` (static) → all instances
- Instance events: `transportr.register(event, handler)` → single instance
- Lifecycle: `configured` → `success|error|aborted|timeout` → `complete` → `all-complete`

**Error Handling**:
- Non-ok responses wrapped in `HttpError` with `ResponseStatus` (code/text)
- Aborts/timeouts generate synthetic statuses: `499 Aborted`, `504 Request Timeout`
- Access via `error.statusCode`, `error.statusText`, `error.entity` (captured response body)

## Critical Conventions

**Method Body Handling** (`src/constants.ts:requestBodyMethods`):
- Only `POST/PUT/PATCH` send body; `GET/DELETE/HEAD/OPTIONS` drop body and merge data into query params
- Body auto-stringified to JSON when `content-type` includes `json` AND body is plain object (not array/BodyInit)
- Type-safe serialization via `serialize<T>()` with branded `JsonString<T>` type

**Response Handler Registration**:
- Extend via `Transportr.contentTypeHandlers` entries: `['application/json', handleJson]`
- Lookup uses `MediaType.matches()` against response `content-type` (checks type/subtype)
- Add convenience methods by pairing `Accept` header + handler: see `getJson()`, `getHtml()`, `getHtmlFragment()`, `getXml()`, `getScript()`, `getStylesheet()`, `getBlob()`, `getImage()`, `getBuffer()`, `getStream()` patterns

**DOM & Environment Handling**:
- Auto-imports `jsdom` when `document`/`DOMParser` unavailable (Node.js)
- Sanitize HTML/XML with `DOMPurify` in `handleHtml`/`handleXml`/`handleHtmlFragment` (in `src/response-handlers.ts`) before parsing
- Script/CSS handlers (`handleScript`, `handleCss`) use `URL.createObjectURL()` + revoke after inject

**TypeScript 6 & Build**:
- Strict mode + `isolatedDeclarations` + `verbatimModuleSyntax` enforced
- Types in `src/@types/index.ts` for public API
- Build: `pnpm build` uses custom `tsbuild` with `tsconfig.tsbuild.entryPoints` pointing to `./src/transportr.ts`
- Output: `dist/transportr.{js,d.ts}` with `noExternal` bundling for `@d1g1tal/media-type|subscribr|dompurify`
- Target: ESNext with `moduleResolution: Bundler`

## Development Workflow

**Package Manager**: pnpm (workspace configured via `pnpm-workspace.yaml`)

**Scripts**:
- `pnpm lint` → ESLint (flat config) checks tabs, single quotes, JSDoc completeness (`eslint-plugin-jsdoc`)
- `pnpm build` / `pnpm build:watch` → TypeScript compilation via `tsbuild`
- `pnpm test` → Vitest 4.x (dual-project setup)
- `pnpm test:coverage` → generates reports in `tests/coverage` (text/html/lcov/clover)
- `pnpm type-check` → TypeScript type checking only

**Vitest Projects** (`vitest.config.ts`):
- `integration` (node env): tests with real network calls to `mockapi.io` (`global-event-handler`, `abort-all`, `all-complete-event`, `network-integration`, `environment-specific`, `signal-controller-cleanup`, `request-options-optimization`, `mediatype-caching`)
- `unit` (jsdom env): all other tests, DOM available for HTML/XML handlers
- Both load `tests/scripts/setup.ts` → mocks `URL.createObjectURL`/`revokeObjectURL`, ensures `AbortController` polyfills

**Linting Rules** (`eslint.config.js`):
- Tab indentation (`indent: ['error', 'tab']`), unix line endings, single quotes mandatory
- JSDoc required on all exports (`jsdoc/require-jsdoc`); checks param names but ignores destructured params
- TypeScript: `method-signature-style: 'property'`, unused vars must start with `_`
- Uses `typescript-eslint` with type-checked rules

## External Dependencies

- `@d1g1tal/media-type` v6 → `MediaType.parse()`, `.matches()` (type/subtype matching)
- `@d1g1tal/subscribr` v4 → event pub/sub (`Subscribr` class)
- `dompurify` v3 → sanitizes HTML/XML before parsing
- `jsdom` v27 → DOM environment for Node.js (auto-imported in `transportr.ts`)

**Key Files & Patterns**

**Static Constants** (`src/constants.ts`):
- `mediaTypes` object → pre-built `MediaType` instances for common types (JSON, HTML, XML, CSS, etc.)
- `requestBodyMethods` → `['POST', 'PUT', 'PATCH']`
- `aborted`/`timedOut`/`internalServerError` → synthetic `ResponseStatus` objects
- `RequestEvent` → event name constants (`CONFIGURED`, `SUCCESS`, `ERROR`, `ABORTED`, `TIMEOUT`, `COMPLETE`, `ALL_COMPLETE`)

**Caching**:
- `Transportr.mediaTypeCache` → Caches parsed `MediaType` instances to avoid re-parsing the same content-type strings
- Initialized with predefined `mediaTypes` values for instant lookup

**Headers/Params Merging**:
- `mergeHeaders(target, ...sources)` → chains: instance defaults → user options → method-specific
- `mergeSearchParams(target, ...sources)` → same pattern; handles `URLSearchParams | string | Record<string, string | number | boolean>`

**Request Options Processing**:
- Shallow merge for flat properties (performance optimization)
- Deep merge only for headers and searchParams
- Creates fresh `Headers`/`URLSearchParams` instances per request

**Testing Patterns**:
- Mock `globalThis.location.origin` for constructor tests (see `transportr.test.ts`)
- Use `vi.fn()` for `URL.createObjectURL`/`revokeObjectURL` spies (setup in `tests/scripts/setup.ts`)
- Import `.js` extensions in tests for ESM compatibility (e.g., `from '../src/transportr.js'`)
- Integration tests use real `mockapi.io` key from `tests/scripts/config.ts` (`apiKey: '6515f38809e3260018c94ac4'`)

## Common Tasks

**Add new response handler**:
1. Create handler function in `src/response-handlers.ts`: `const handleFoo: ResponseHandler<Foo> = async (response) => ...`
2. Sanitize if DOM: wrap with `DOMPurify.sanitize(await response.text())`
3. Add to `contentTypeHandlers`: `['application/foo', handleFoo]`
4. Add convenience method: `async getFoo(path, opts) { return this._get(path, opts, { headers: { [HttpRequestHeader.ACCEPT]: mediaTypes.FOO.toString() } }, handleFoo) }`

**Add request lifecycle hook**:
- Global: `Transportr.register('success', (event, data) => { ... })`
- Instance: `transportr.register('error', (event, data) => { ... })`
- Cleanup: `Transportr.unregister(registration)` or `transportr.unregister(registration)`

**Handle timeout/abort**:
- Pass `timeout` in options: `transportr.get('/path', { timeout: 5000 })`
- Listen for event: `transportr.register('timeout', (event, data) => { ... })`
- Abort all: `Transportr.abortAll()` (clears static `signalControllers` Set)

## Type System Highlights

**Branded Types**:
- `JsonString<T>` → ensures serialized JSON maintains type information
- `JsonValue<T>` → type-safe JSON serialization validation

**Utility Types**:
- `Prettify<T>` → flattens intersection types for better IDE display
- `LiteralUnion<T>` → allows literal types with string fallback
- `TypedHeaders` → strongly-typed header names with Authorization scheme validation

**Response Types**:
- `TypedResponse<T>` → extends Response with typed `json()` method
- `ResponseHandler<T>` → `(response: Response) => Promise<T>`

**Request Types**:
- `RequestBodyMethod` → `'POST' | 'PUT' | 'PATCH' | 'DELETE'`
- `RequestOptions` → discriminated union based on method type (body allowed/disallowed)
