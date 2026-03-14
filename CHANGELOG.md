## [2.1.1](https://github.com/D1g1talEntr0py/transportr/compare/v2.1.0...v2.1.1) (2026-03-14)

### Bug Fixes

* **ci:** fix the conflict for auto installing peer dependencies (23302387f160e55a60d775ffeb6f7ec4127721f6)

## [2.1.0](https://github.com/D1g1talEntr0py/transportr/compare/v2.0.0...v2.1.0) (2026-03-14)

### Features

* lower Node.js requirement to v20 and make jsdom optional (94dbcabeec9de2674f00b1c10cde6b48273d7a69)
Reduces the minimum required Node.js version from 22.0.0 to 20.0.0 to broaden compatibility. Makes `jsdom` an optional peer dependency, ensuring users are only required to install it if they utilize DOM-specific parsing features. Incorporates lazy-loading for DOMPurify and standardizes the JSDOM URL environment.


### Code Refactoring

* replace custom enums with native string literals (c51a0dcdfeef4b5eda2aa1e1fe475e540b41a1e9)
Simplifies the codebase by stripping out internal `HttpMediaType`, `HttpRequestMethod`, `HttpRequestHeader`, and `HttpResponseHeader` abstractions. Instead, the implementation now leverages native string literals natively supported by JavaScript, reducing overhead and streamlining type checks.


### Documentation

* correct TypeScript version in changelog (d196f4a315ec366397d7677fc5b8930f24930dc8)
Fixes typos in the CHANGELOG that referenced an incorrect 'TypeScript 6' version, ensuring accurate historical logs.


### Miscellaneous Chores

* add .npmrc to set auto-install-peers=false (21393af89a95c63dcbc003bf37804977728537e0)

### Tests

* modify tests to be compatible with Node 22 (71669f94854a1229bfe9c30d7f3dc0654b782fce)

### Build System

* expose package submodules and introduce release script (b119ef8f2c3a8365a71119a95e4ce3be3574846b)
Expands the package's module definitions by exposing distinct exports for headers, methods, and media-types. Adds a dedicated minified release build command to optimize the final artifact.


### Continuous Integration

* stop ignoring the config.ts for the test API key as it is just a placeholder now (a581ecc4ebbdf7661822412c8d26b9707b52d7ab)
* update the secret key (85673375cf8338f72ea0d9f4154bf61cb08179c7)

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
