## [3.1.0](https://github.com/D1g1talEntr0py/transportr/compare/v3.0.3...v3.1.0) (2026-04-09)

### Features

* add IIFE build support and exports (0fc9585da39db7abdd5ba4301ab4d4e8bc201a71)
Configures tsconfig and workspace settings to support IIFE builds, and adds the corresponding export maps to package.json.


### Miscellaneous Chores

* align version with last published package after history reset (9dc31a6cbd91130a8f7d0132fc2ef4c41fa52dec)
* more fun with the lockfile (b8f25c3c87a5c091fd45975d4e2e659564652053)

### Build System

* **deps:** update dependencies (240f5449ee07bac9f73c11c10810616617d85310)
Updates various dev dependencies including vitest, typescript-eslint, and tsbuild, alongside the corresponding lockfile updates.

## [3.0.3](https://github.com/D1g1talEntr0py/transportr/compare/v3.0.2...v3.0.3) (2026-04-07)

### Bug Fixes

* restores direct body parameter for request methods (a106100d6a7ba87e327a9823e32f692fe6c0fa9c)
Addresses a regression introduced during the TypeScript conversion where the signatures for body-accepting methods (POST, PUT, PATCH, DELETE) were inadvertently removed.
Restores the ability to pass the request body as a direct parameter rather than forcing it inside an options object, improving developer ergonomics and ensuring backwards compatibility.
Centralizes the overload resolution logic into a shared helper to cleanly resolve path, body, and options arguments.

## [3.0.2](https://github.com/D1g1talEntr0py/transportr/compare/v3.0.1...v3.0.2) (2026-04-07)

### Bug Fixes

* **deps:** reinstall project to finally address CVE-2026-39363 (e3b3f67cd99735d6c32b58c78e376852f32858ea)

## [3.0.1](https://github.com/D1g1talEntr0py/transportr/compare/v3.0.0...v3.0.1) (2026-04-07)

### Bug Fixes

* update dependencies to resolve CVE-2026-39363 (4858b094e3a88858eb60113ba706b53e451c6158)
Updates vitest and related dev dependencies to their newest versions to resolve a security vulnerability in a transient dependency (Vite). Includes routine updates for other development dependencies.


### Miscellaneous Chores

* add explicit type annotation to defaultOrigin (c938eb124fcb82e539af8f4e0ba02c16ddd39193)
Improves type safety and predictability by declaring a clear string type for the origin constant.

* **docs:** revise feature comparison (9daaa2457e71ce3b2e34210de871550bb0e824cf)

### Build System

* enable isolatedDeclarations in tsconfig (3a51dae3d455d01a522fa7464255b9e16ce6bf22)
Enhances build performance and compatibility with transpilers by enforcing isolated declaration generation.

## [3.0.0](https://github.com/D1g1talEntr0py/transportr/compare/v2.2.1...v3.0.0) (2026-04-05)

### ⚠ BREAKING CHANGES

* Renamed submodule paths: headers->request-header, methods->request-method, media-types->content-type, response-headers->response-header.
Renamed exported symbols: HttpRequestHeader->RequestHeader, HttpRequestMethod->RequestMethod, HttpMediaType->ContentType, HttpResponseHeader->ResponseHeader.
Renamed static properties: RequestEvents->RequestEvent, RequestModes->RequestMode, RequestPriorities->RequestPriority, RedirectPolicies->RedirectPolicy.

### Features

* add concurrent request helpers (4980696752ef8d8719e8f7abcc69f65934e63a40)
Introduces `Transportr.all()` for promise resolution of multiple requests and `Transportr.race()` for racing requests with automatic abortion of losing requests.

* add download progress tracking (bedbd0cfef36cece3c936f0dd0cd52f9feb3f76c)
Supports passing an `onDownloadProgress` callback in request options to track byte loading progress on responses returning a body stream.

* add NDJSON streaming (4fb5a5bc78ddd4a615f1ebc081be980631d2ff4c)
Introduces `getJsonStream<T>()` to parse Newline Delimited JSON feeds from an `application/x-ndjson` response stream into an `AsyncIterable<T>`.

* add SSE streaming (a649391f01e4a90a143bd1a10f1560b743573762)
Introduces `getEventStream()` method to parse Server-Sent Events (SSE) from the `text/event-stream` response into an `AsyncIterable<ServerSentEvent>`.

* add typed event handlers (13e2118c69e8e66caca14e7d336306bece11de3d)
Enhances the `register()` method to support strongly-typed event data payloads based on the specific event name being requested.

* add upload progress tracking (4e79faf80c619060290f17832d82bbf88108c104)
Supports passing an `onUploadProgress` callback in request options to track progress continuously when requests have a supported payload size.

* rename submodules, symbols, and static properties (e98a49e9d32f1c1918341711436c190fd171558a)
Renames exported constant submodules for clarity and consistency.

* support safe results tuples via unwrap flag (66325e1d155fd89b9190438044d61e096eaead1e)
Adds a new `unwrap: false` request option returning errors safely as `Result<T>` tuples `[true, data]` or `[false, error]` to avoid try/catch blocks.


### Code Refactoring

* improve options configuring and hooks evaluation (a1f351220a5f5d5f3236616176747c9c27769f8a)
Refactors how request defaults and instance-level properties merge options like search parameters, hooks, and headers. Also adds configuration helper hooks.

* omit HttpError dependency bounds (3f21ace415eb94486b9d4640606707a1b560b902)
Refines isolated import statements for purely explicit types directly exporting HttpError appropriately.

* simplify base URL construction (695586e4fd0f69f938dfb7e22a9bf17983651fe7)
Streamlines origin defaults globally across instance initializations and tests.


### Documentation

* update readme for v3.0 features and migrations (edcb56ce6fca02de4929a9dc28e9de11bfb8165c)
Revamps the README with details on the new v3.0 capabilities, including streaming, progress tracking, concurrent requests, and safe results. Also adds a migration guide for moving from v2 and updates feature comparisons.


### Styles

* add editorconfig (8c23fd68716956717eafe1c6c089fb614ed6bf55)
Adds a standard .editorconfig file to ensure consistent line endings, charset, and indentation styles across all project files.


### Tests

* add response handler jsdom exception tests (b420c84f1845dd185f7b828715974c4cf2456834)
Configures Vitest scenarios handling JSDOM dependencies specifically checking error instances when JSDOM is entirely missing.

* configure vitest environment for fetch mocks (dab6318b7c33dc1073cb2e87d55fc982656dbfb2)
Improves explicit mock response typings internally in tests avoiding implicit errors via type casting for globally overridden APIs like fetch.


### Build System

* **deps:** update tldts and baseline-browser-mapping (f1c90bfe16a56158ce72fe1b0013200f708676c6)
Updates internal dependencies in pnpm-lock.yaml to their latest patch versions to ensure security and stability.

## [2.2.1](https://github.com/D1g1talEntr0py/transportr/compare/v2.2.0...v2.2.1) (2026-04-04)

### Bug Fixes

* **deps:** update subscribr dependency to address security issues via Dependabot (0a04a16e34daaae749927b4893f15a972d4eb5e0)

### Miscellaneous Chores

* adjust typescript configuration and vs code settings (c1f28dff23025853f236fa380bc4f6e0ec26dd8c)
Updates `tsconfig.json` to use module preservation and stable type ordering, and refines cases for standard libraries. Updates `.vscode` configuration to point correctly to the local typescript SDK path.

* **deps-dev:** update essential dev dependencies (b94738075ce674d7e65952433cd553fa7af0bc35)
Bumps various development dependencies including TypeScript build tools, type definitions, and ESLint plugins. Updates the lockfile alongside package.json changes.


### Tests

* remove vitest ui script (7d894526ffb17345986375d3700f53b42ba5a2bb)
Drops the `test:ui` script from package.json.


### Build System

* auto-include changelog in releases (fd40332bd99c6b3a2ae5f260e9b7afcf0902665b)
Adds `CHANGELOG.md` to the package distribution files to ensure it gets packaged and published to npm.


### Continuous Integration

* fix the versioning system that was broken by attempting to fix the fact that a refactor doesn't change the version (3b0642134714bd634ae11f8a3d4f4695ea25c953)

## [2.2.0](https://github.com/D1g1talEntr0py/transportr/compare/v2.1.2...v2.2.0) (2026-03-31)

### Features

* **docs:** expand package manager installation snippets (caea4a7d21067bd248f6cadc118010d91c28c59b)
Adds missing installation commands for native npm and yarn to the README explicitly, ensuring compatibility statements for multiple ecosystems.


### Bug Fixes

* **deps:** update dependencies to address CVE-2026-33228 (67315abc69d4e9ca5d93ea7543d7149c42e616d8)
Upgrades the transitive dependency `flatted` to 3.4.2 to fix a prototype pollution vulnerability (CWE-1321). This update also includes a major version bump for TypeScript to v6.0.2, alongside several other development dependency bumps such as vitest, eslint plugins, and pnpm.

* **license:** change license from ISC to MIT (597c7c4414c8403ecdc4105c9250356b63faaf81)
Transitions the project license to MIT, updating the LICENSE file, the metadata field in `package.json`, and the visual status badge in the documentation.


### Code Refactoring

* **config:** simplify compilation settings for TypeScript 6 (6d232397646a323241e094e3b723976e67be4786)
Removes historically explicit configuration options from `tsconfig.json` that are either default behavior or obsolete in TypeScript 6. Scope is securely narrowed to explicitly include and target the `./src` directory.


### Documentation

* consolidate ai agent instructions (aaeccb9ea8be76a2524b86df51564cb3599de7d1)
Deletes the separate `AGENTS.md` file and rolls its relevant details and guidelines directly into `.github/copilot-instructions.md`. This centralizes architectural conventions, code formatting rules, testing guidelines, and new feature details (e.g., retries, lifecycle hooks, and XSRF protection) for AI coding assistants.

* update readme with cdn usage and submodule documentation (fa18f735cea5ce79763d127fff09332317f17f55)
Expands the project README to clarify native browser and CDN usage without bundlers through an import map. Adds new sections that detail submodules for HTTP constants (e.g., headers, methods, media-types) to make the code examples and documentation more comprehensive and usable.


### Build System

* **deps:** update dependencies and package manager settings (1d2faaadb889fd71ff6c37f898de70a090df586b)
Removes the explicit `auto-install-peers=false` configuration from `.npmrc` and enables `autoInstallPeers: true` in the `pnpm-lock.yaml` settings. Updates the pnpm package manager version to 10.32.1 and bumps various dependencies, including `@d1g1tal/media-type`, `@d1g1tal/subscribr`, and development tools like `eslint`, `@typescript-eslint/eslint-plugin`, and `jsdom`.


### Continuous Integration

* update github actions workflows (0f2108390b52fb66aa25a2f337616efb45bec339)
Updates GitHub Actions to use newer action versions, modernizes the `pnpm-setup` and `setup-node` tasks, and removes the environment variable `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`. Additionally, modifies the publishing workflow to properly install the latest `npm` version instead of clearing the auth token.

## [2.1.2](https://github.com/D1g1talEntr0py/transportr/compare/v2.1.1...v2.1.2) (2026-03-14)

### ⚠ BREAKING CHANGES

* Transportr.MediaType, Transportr.RequestMethod, Transportr.RequestHeader,
Transportr.ResponseHeader, and Transportr.CachingPolicy static properties have been removed.

Import constants directly from the package submodule paths instead:
- import { HttpMediaType } from '@d1g1tal/transportr/media-types'
- import { HttpRequestMethod } from '@d1g1tal/transportr/methods'
- import { HttpRequestHeader } from '@d1g1tal/transportr/headers'
- import { HttpResponseHeader } from '@d1g1tal/transportr/response-headers'

### Code Refactoring

* remove static enum properties from Transportr class (8cde6bdddb5c00ed858517a938689099a02d1b7c)

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
