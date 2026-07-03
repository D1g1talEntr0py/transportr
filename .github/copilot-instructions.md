# Transportr — Copilot Instructions
TypeScript 6 Fetch API wrapper: type-safe HTTP, abort/timeout, event-driven lifecycle, content-type response handling, retry, dedup, hooks, XSRF. `@d1g1tal/transportr` v4.

Stack: TS 6.x (strict|isolatedDeclarations|verbatimModuleSyntax) | Vitest (unit|integration) | pnpm | tsbuild → dist/*.{js,d.ts} (bundles: @d1g1tal/media-type|subscribr|dompurify, target ESNext) | Public types: src/@types/index.ts

Scripts: `lint` (tabs|single quotes|JSDoc) | `build`/`build:watch` | `build:release` (minified) | `test` | `test:coverage` → tests/coverage/ | `type-check`

## Pipeline (src/transportr.ts)
1. `execute()` → `processRequestOptions()`: shallow-merge flat props, deep-merge hdrs/searchParams, create SignalController, stringify JSON bodies (content-type: application/json)
2. `_request()` → fetch, select handler via `MediaType.matches()`, emit events
3. Handlers (src/response-handlers.ts) → typed return

Body rule (src/constants.ts): POST|PUT|PATCH|DELETE send body; GET|HEAD|OPTIONS drop → merge into query

## Signal & Abort (src/signal-controller.ts)
`SignalController` wraps `AbortController.any([userSignal, timeoutSignal, internalSignal])` | Static `signalControllers` Set → `abortAll()` cancels all | Timeout: `reason instanceof DOMException && name === 'TimeoutError'` → `timeoutEvent` | `destroy()` in finally

## Events (@d1g1tal/subscribr)
Global: `Transportr.register(e, h)` / `unregister(r)` (all instances) | Instance: `transportr.register(e, h)` / `unregister(r)` (single) | Lifecycle: `configured` → `success|error|aborted|timeout` → `retry`* → `complete` → `all-complete` | Constants: `RequestEvent.{CONFIGURED, SUCCESS, ERROR, ABORTED, TIMEOUT, RETRY, COMPLETE, ALL_COMPLETE}`

## Hooks (HookOptions)
Types: `beforeRequest`, `afterResponse`, `beforeError` | Order: global → instance → per-request | Register: `Transportr.addHooks(h)` | `clearHooks()` | `instance.addHooks(h)` | per-req: `hooks` in opts

## Retry, Dedup, XSRF
Retry (RetryOptions): `count`|`statusCodes`|`methods`|`delay`|`backoffFactor` | Defaults: codes `[408,413,429,500,502,503,504]`, methods `['GET','PUT','HEAD','DELETE','OPTIONS']`, delay 300ms, backoff ×2
Dedup: GET|HEAD only, static `inflightRequests` Map (URL+method), cloned Response per consumer
XSRF (XsrfOptions): cookie → header | Defaults: `'XSRF-TOKEN'` (cookie), `'X-XSRF-TOKEN'` (header)

## Errors
Non-ok → `HttpError` + `ResponseStatus` | Access: `.statusCode`, `.statusText`, `.entity` (body) | Abort: `499`, Timeout: `504` (synthetic)

## Handlers & Content Types
`contentTypeHandlers`: `[mediaType, handler]` pairs, lookup via `MediaType.matches()` | `mediaTypeCache`: pre-populated, no re-parse
Convenience: `getJson()`, `getHtml()`, `getHtmlFragment()`, `getXml()`, `getScript()`, `getStylesheet()`, `getBlob()`, `getImage()`, `getBuffer()`, `getStream()`
DOM handlers (Html|Xml|HtmlFragment): `DOMPurify.sanitize()` before parse | Script|CSS: `createObjectURL()` + revoke after inject | Node.js: `jsdom` (peer ≥25) lazy-imported

## Constants (src/constants.ts)
`mediaTypes`: pre-built instances | `requestBodyMethods`: `['POST','PUT','PATCH','DELETE']` | Synthetic: `aborted`, `timedOut`, `internalServerError` (ResponseStatus)

## Merging
`mergeHeaders(target, ...sources)`: instance → opts → method-specific | `mergeSearchParams()`: same, accepts `URLSearchParams | string | Record<string, string|number|boolean>` | Fresh instances per request

## Dependencies
`@d1g1tal/media-type` v6 (`parse()`, `matches()`) | `@d1g1tal/subscribr` v4 (pub/sub) | `dompurify` v3 (sanitize) | `jsdom` ≥25 peer (Node DOM)

## Types
`JsonString<T>`: branded JSON | `JsonValue<T>`: serialization validation | `Prettify<T>`: flatten unions | `LiteralUnion<T>`: literal + string fallback | `TypedHeaders`: header names + auth schemes | `TypedResponse<T>`: Response + typed `json()` | `ResponseHandler<T>`: `(Response) => Promise<T>` | `RequestBodyMethod`: POST|PUT|PATCH|DELETE | `RequestOptions`: discriminated by method

## Linting
Tabs | unix newlines | single quotes | JSDoc on exports (param names checked, destructured exempt) | `method-signature-style: property` | unused vars prefix `_` | `typescript-eslint` type-checked

## Testing
Vitest projects (vitest.config.ts): `unit` (jsdom, all except integration) | `integration` (node, real HTTP to mockapi.io: global-event-handler, abort-all, all-complete-event, network-integration, environment-specific, signal-controller-cleanup, request-options-optimization, mediatype-caching, hooks)
Both: load tests/scripts/setup.ts → mock `createObjectURL`/`revokeObjectURL`, polyfill AbortController|Signal
Patterns: mock `globalThis.location.origin` for constructor tests | import `.js` extensions | mockapi.io key in tests/scripts/config.ts | rate-limited, batch changes only

## Tasks

Add handler: (1) src/response-handlers.ts `const handleFoo: ResponseHandler<Foo> = async (r) => {...}` (2) DOM: `DOMPurify.sanitize(await r.text())` (3) `Transportr.contentTypeHandlers.push(['app/foo', handleFoo])` (4) convenience: `async getFoo(p, o) { return this._get(p, o, { headers: { [Accept]: mediaTypes.FOO } }, handleFoo) }`

Add hook: Global `Transportr.addHooks({beforeRequest: r => {...}})` | Instance `instance.addHooks({afterResponse: r => {...}})` | Per-req `transportr.get(p, {hooks: {beforeError: e => {...}}})`

Timeout|abort: `get(p, {timeout: 5000})` | `register('timeout', (e, d) => {...})` | `abortAll()` (clears signalControllers)
