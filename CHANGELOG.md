## [2.0.0](https://github.com/D1g1talEntr0py/transportr/compare/v1.4.4...v2.0.0) (2026-03-13)

### ⚠ BREAKING CHANGES

* Complete rewrite from JavaScript to TypeScript.

Source rewrite:
- AbortSignal → SignalController using native AbortController.any() and AbortSignal.timeout()
- ParameterMap class eliminated; options processing uses shallow merge with deep merge only for headers/searchParams
- Response handlers extracted to response-handlers.ts with DOMPurify sanitization
- Lazy JSDOM auto-import for Node.js DOM handler support
- contentTypeHandlers changed from handler-keyed Map to content-type-keyed array with MediaType.matches()
- MediaType caching with LRU eviction (100 entries)
- All modules use named exports instead of default exports

Type system:
- Branded types: JsonString<T>, JsonValue<T> for type-safe serialization
- TypedResponse<T> extending Response with typed json() method
- TypedHeaders with strongly-typed header names and AuthorizationScheme validation
- RequestOptions discriminated union based on method type (body allowed/disallowed)
- Recursive JSON types: Json, JsonPrimitive, JsonArray, JsonObject
- Utility types: Prettify<T>, LiteralUnion<T>

New utilities (utils.ts):
- serialize<T>() with branded JsonString<T> return type
- isRawBody() for FormData/Blob/ArrayBuffer/ReadableStream detection
- isObject(), isString() type predicates
- objectMerge(), getCookieValue()
- Removes @d1g1tal/chrysalis dependency

API changes:
- post(path, options) signature (body now in options)
- DELETE added to requestBodyMethods
- registerContentTypeHandler()/unregisterContentTypeHandler() public API
- Instance destroy() and static unregisterAll() teardown methods
- Enhanced HttpError with url, method, timing properties
- handleImage returns HTMLImageElement instead of blob URL string
- HTML selector support on getHtml() and getHtmlFragment()

### Features

* rewrite source in TypeScript with full type system (b4f219ce9b91b814943664301af0699fe3f31061)

### Documentation

* add release process, agent guidelines, and update README (584594ba5dd37d1a33e24547507d3e3ccf9da044)
- Add docs/release-process.md with semantic-release workflow documentation
- Add AGENTS.md with AI agent coding standards and protocols
- Update README.md for TypeScript API and new features
- Update LICENSE


### Miscellaneous Chores

* migrate build tooling to TypeScript 5.9 and Vitest 4 (7cca59051a0106ab19975bd4496bf7f037a5b912)
- Replace .eslintrc.json with ESLint flat config (eslint.config.js)
- Remove esbuild.js and jsconfig.json in favor of tsconfig.json
- Add vitest.config.ts with dual-project setup (unit/integration)
- Add pnpm-workspace.yaml
- Remove @d1g1tal/chrysalis dependency
- Add dompurify, jsdom dependencies
- Update @d1g1tal/media-type to v6, @d1g1tal/subscribr to v4
- Update .gitignore and .vscode/settings.json


### Tests

* add comprehensive TypeScript test suite (1934c956c43992497ba70360f02fc3da38fe87bc)
- Rewrite all existing JS tests in TypeScript with Vitest 4
- Add test setup (tests/scripts/setup.ts) with URL.createObjectURL/revokeObjectURL mocks
- Add test config (tests/scripts/config.ts) with mockapi.io integration key

New test files:
- retry.test.ts: exponential backoff, custom delay, status codes, network errors
- hooks.test.ts: beforeRequest, afterResponse, beforeError at global/instance/request scope
- browser-environment.test.ts: DOM-specific behavior validation
- environment-specific.test.ts: Node.js vs browser environment detection
- response-handlers.test.ts: JSON, HTML, XML, script, CSS, blob, image, stream handlers
- signal-controller.test.ts: SignalController lifecycle, timeout detection, destroy cleanup
- signal-controller-cleanup.test.ts: memory leak prevention, controller Set management
- request-options-optimization.test.ts: shallow vs deep merge, raw body detection
- mediatype-caching.test.ts: LRU eviction, cache hit/miss behavior
- utils.test.ts: serialize, isRawBody, isObject, objectMerge, getCookieValue
- network-integration.test.ts: real HTTP calls to mockapi.io


### Continuous Integration

* add GitHub Actions workflows and semantic-release (2f2809b53b318af2dc41084e858547db022c1cee)
- ci.yml: lint, type-check, build, unit tests on Node.js 22, 24, 25 with Codecov upload
- integration.yml: integration tests against mockapi.io on main push
- publish.yml: automated semantic-release with npm provenance attestation
- .releaserc.json: conventional commits, changelog generation, npm publish, GitHub releases
- .githooks/commit-msg: git hook enforcing Conventional Commits format
- .github/copilot-instructions.md: AI assistant project context
