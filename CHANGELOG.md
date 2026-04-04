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
