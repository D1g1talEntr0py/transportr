# transportr

[![npm version](https://img.shields.io/npm/v/@d1g1tal/transportr?color=blue)](https://www.npmjs.com/package/@d1g1tal/transportr)
[![npm downloads](https://img.shields.io/npm/dm/@d1g1tal/transportr)](https://www.npmjs.com/package/@d1g1tal/transportr)
[![CI](https://github.com/D1g1talEntr0py/transportr/actions/workflows/ci.yml/badge.svg)](https://github.com/D1g1talEntr0py/transportr/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/D1g1talEntr0py/transportr/graph/badge.svg)](https://codecov.io/gh/D1g1talEntr0py/transportr)
[![License: MIT](https://img.shields.io/github/license/D1g1talEntr0py/transportr)](https://github.com/D1g1talEntr0py/transportr/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/@d1g1tal/transportr)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A TypeScript Fetch API wrapper providing type-safe HTTP requests with advanced abort/timeout handling, event-driven architecture, and automatic content-type based response processing.

## Features

- **Type-safe** — Full TypeScript support with strict types, branded JSON strings, and typed headers
- **Automatic response handling** — Content-type based response parsing (JSON, HTML, XML, images, streams, etc.)
- **Abort & timeout management** — Per-request timeouts, `AbortController` integration, and `abortAll()` for cleanup
- **Event-driven** — Global and instance-level lifecycle events (`configured`, `success`, `error`, `complete`, etc.)
- **Retry logic** — Configurable retry with exponential backoff, status code filtering, and method filtering
- **Request deduplication** — Identical in-flight GET/HEAD requests share a single fetch
- **Lifecycle hooks** — `beforeRequest`, `afterResponse`, `beforeError` hooks at global, instance, and per-request levels
- **XSRF/CSRF protection** — Automatic cookie-to-header token injection
- **HTML selectors** — Extract specific elements from HTML responses with CSS selectors
- **FormData auto-detection** — Automatically handles FormData, Blob, ArrayBuffer, and stream bodies

## Requirements

- **Node.js** ≥ 20.0.0 or a modern browser with native [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and `AbortController` support
- `jsdom` is an **optional peer dependency** — only needed for HTML/XML/DOM features in Node.js. Install it separately if you use `getHtml()`, `getXml()`, `getHtmlFragment()`, `getScript()`, `getStylesheet()`, or `getImage()` in a non-browser environment:

```bash
pnpm add jsdom
```

## Installation

```bash
pnpm add @d1g1tal/transportr
```

## Quick Start

Only the main module is required — the submodule constants (`HttpRequestHeader`, `HttpMediaType`, etc.) are optional conveniences. Anywhere a constant is used, a plain string works just as well.

Out of the box, every instance defaults to:
- `Content-Type: application/json; charset=utf-8`
- `Accept: application/json; charset=utf-8`
- `timeout`: 30 000 ms
- `cache`: `no-store`
- `credentials`: `same-origin`
- `mode`: `cors`

```typescript
import { Transportr } from '@d1g1tal/transportr';

const api = new Transportr('https://api.example.com');

// GET JSON — default Accept header is already application/json
const data = await api.getJson('/users/1');

// POST with JSON body — automatically serialized, no Content-Type needed
const created = await api.post('/users', { body: { name: 'Alice' } });

// GET with search params
const results = await api.getJson('/search', { searchParams: { q: 'term', page: 1 } });

// Typed response using generics
interface User { id: number; name: string; }
const user = await api.get<User>('/users/1');

// Plain strings work anywhere — constants are just for convenience
const api2 = new Transportr('https://api.example.com', {
  headers: { 'authorization': 'Bearer token', 'accept-language': 'en-US' }
});
```

## Browser / CDN Usage

The package is published as pure ESM and works directly in modern browsers — no bundler required. All dependencies (`@d1g1tal/media-type`, `@d1g1tal/subscribr`, DOMPurify) are bundled into the output, so there are no external module URLs to manage. `jsdom` is not needed in a browser environment.

### With an import map (recommended)

An [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) mirrors the package's named submodule exports and keeps your code identical to the Node.js form — use bare specifiers exactly as you would in a bundled project:

```html
<script type="importmap">
{
  "imports": {
    "@d1g1tal/transportr": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/transportr.js",
    "@d1g1tal/transportr/headers": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/headers.js",
    "@d1g1tal/transportr/methods": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/methods.js",
    "@d1g1tal/transportr/media-types": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/media-types.js",
    "@d1g1tal/transportr/response-headers": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/response-headers.js"
  }
}
</script>

<script type="module">
  import { Transportr } from '@d1g1tal/transportr';
  import { HttpRequestHeader } from '@d1g1tal/transportr/headers';
  import { HttpRequestMethod } from '@d1g1tal/transportr/methods';
  import { HttpMediaType } from '@d1g1tal/transportr/media-types';
  import { HttpResponseHeader } from '@d1g1tal/transportr/response-headers';

  const api = new Transportr('https://api.example.com', {
    headers: {
      [HttpRequestHeader.AUTHORIZATION]: 'Bearer token',
      [HttpRequestHeader.ACCEPT]: HttpMediaType.JSON
    }
  });

  const data = await api.getJson('/users/1');
  console.log(data);
</script>
```

### Without an import map

The CDN resolves the `"."` entry in `exports` automatically, so no explicit file path is needed for the main module. Submodules use their CDN paths directly:

```html
<script type="module">
  import { Transportr } from 'https://cdn.jsdelivr.net/npm/@d1g1tal/transportr';
  import { HttpRequestHeader } from 'https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/headers.js';
  import { HttpMediaType } from 'https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/media-types.js';

  const api = new Transportr('https://api.example.com', {
    headers: {
      [HttpRequestHeader.AUTHORIZATION]: 'Bearer token',
      [HttpRequestHeader.ACCEPT]: HttpMediaType.JSON
    }
  });

  const data = await api.getJson('/users/1');
  console.log(data);
</script>
```

Import map support is available in all browsers covered by this project's `browserslist` configuration (Chrome 89+, Firefox 108+, Safari 16.4+).

## API

### Constructor

```typescript
new Transportr(url?: URL | string | RequestOptions, options?: RequestOptions)
```

Creates a new instance. When `url` is omitted, defaults to `globalThis.location.origin`.

```typescript
// With base URL
const api = new Transportr('https://api.example.com/v2');

// With URL and default options
const api = new Transportr('https://api.example.com', {
  timeout: 10000,
  headers: { 'Authorization': 'Bearer token' }
});

// With options only (uses current origin)
const api = new Transportr({ timeout: 5000 });
```

### Request Methods

| Method | Description |
|--------|-------------|
| `get(path?, options?)` | GET request with auto content-type handling |
| `post(path?, options?)` | POST request |
| `put(path?, options?)` | PUT request |
| `patch(path?, options?)` | PATCH request |
| `delete(path?, options?)` | DELETE request |
| `head(path?, options?)` | HEAD request |
| `options(path?, options?)` | OPTIONS request (returns allowed methods) |
| `request(path?, options?)` | Raw request returning `TypedResponse<T>` |

### Typed Response Methods

| Method | Returns | Accept Header |
|--------|---------|---------------|
| `getJson(path?, options?)` | `Json` | `application/json` |
| `getHtml(path?, options?, selector?)` | `Document \| Element` | `text/html` |
| `getHtmlFragment(path?, options?, selector?)` | `DocumentFragment \| Element` | `text/html` |
| `getXml(path?, options?)` | `Document` | `application/xml` |
| `getScript(path?, options?)` | `void` (injected into DOM) | `application/javascript` |
| `getStylesheet(path?, options?)` | `void` (injected into DOM) | `text/css` |
| `getBlob(path?, options?)` | `Blob` | `application/octet-stream` |
| `getImage(path?, options?)` | `HTMLImageElement` | `image/*` |
| `getBuffer(path?, options?)` | `ArrayBuffer` | `application/octet-stream` |
| `getStream(path?, options?)` | `ReadableStream` | `application/octet-stream` |

### Request Options

```typescript
type RequestOptions = {
  headers?: RequestHeaders;
  searchParams?: URLSearchParams | string | Record<string, string | number | boolean>;
  timeout?: number;              // Default: 30000ms
  global?: boolean;              // Emit global events (default: true)
  body?: BodyInit | JsonObject;  // Auto-serialized for JSON content-type
  retry?: number | RetryOptions;
  dedupe?: boolean;              // Deduplicate identical GET/HEAD requests
  xsrf?: boolean | XsrfOptions;
  hooks?: HooksOptions;
  // ...all standard RequestInit properties (cache, credentials, mode, etc.)
};
```

### Retry

```typescript
// Simple: retry up to 3 times with default settings
await api.get('/data', { retry: 3 });

// Advanced configuration
await api.get('/data', {
  retry: {
    limit: 3,
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
    methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS'],
    delay: 300,        // ms before first retry
    backoffFactor: 2   // exponential backoff multiplier
  }
});
```

### Request Deduplication

When `dedupe: true`, identical in-flight GET/HEAD requests share a single fetch call. Each consumer receives a cloned response.

```typescript
// Only one fetch call is made
const [a, b] = await Promise.all([
  api.get('/data', { dedupe: true }),
  api.get('/data', { dedupe: true })
]);
```

### Lifecycle Hooks

Hooks run in order: global → instance → per-request.

```typescript
// Global hooks (all instances)
Transportr.addHooks({
  beforeRequest: [async (options, url) => {
    options.headers.set('X-Request-ID', crypto.randomUUID());
    return options;
  }],
  afterResponse: [async (response, options) => response],
  beforeError: [(error) => error]
});

// Instance hooks
api.addHooks({
  afterResponse: [async (response) => {
    console.log(`Response: ${response.status}`);
    return response;
  }]
});

// Per-request hooks
await api.get('/data', {
  hooks: { beforeRequest: [async (opts) => opts] }
});
```

### Events

```typescript
// Global events (all instances)
const reg = Transportr.register(Transportr.RequestEvents.SUCCESS, (event, data) => {
  console.log('Request succeeded:', data);
});

// Instance events
const reg = api.register(Transportr.RequestEvents.ERROR, (event, error) => {
  console.error('Request failed:', error);
});

// Unregister
api.unregister(reg);  // Returns `this` for chaining
```

**Event lifecycle**: `configured` → `success | error | aborted | timeout` → `complete` → `all-complete`

Additional events: `retry` (emitted on each retry attempt)

### Error Handling

Non-2xx responses throw an error with `name === 'HttpError'`. Aborted and timed-out requests also produce an `HttpError` with synthetic status codes.

```typescript
import type { HttpError } from '@d1g1tal/transportr';

try {
	const user = await api.getJson('/users/1');
} catch (error) {
	if (error instanceof Error && error.name === 'HttpError') {
		const httpError = error as unknown as HttpError;
		console.error(httpError.statusCode);  // HTTP status code
		console.error(httpError.statusText);  // HTTP status text
		console.error(httpError.entity);      // parsed response body (if any)
		console.error(httpError.url?.href);   // request URL
		console.error(httpError.method);      // HTTP method used
		console.error(httpError.timing);      // { start, end, duration } in ms
	}
}
```

**Synthetic status codes for non-HTTP failures:**

| Code | Text | Cause |
|------|------|-------|
| `499` | `Aborted` | Cancelled via `controller.abort()` or `Transportr.abortAll()` |
| `504` | `Request Timeout` | `timeout` option exceeded |

### Abort & Timeout

```typescript
// Per-request timeout
await api.get('/slow', { timeout: 5000 });

// Manual abort via AbortController
const controller = new AbortController();
api.get('/data', { signal: controller.signal });
controller.abort();

// Abort all in-flight requests
Transportr.abortAll();
```

### XSRF/CSRF Protection

```typescript
// Default: reads 'XSRF-TOKEN' cookie, sets 'X-XSRF-TOKEN' header
await api.post('/data', { body: payload, xsrf: true });

// Custom cookie/header names
await api.post('/data', {
  body: payload,
  xsrf: { cookieName: 'MY-CSRF', headerName: 'X-MY-CSRF' }
});
```

### HTML Selector Support

```typescript
// Get a specific element from HTML response
const nav = await api.getHtml('/page', {}, 'nav.main');
const item = await api.getHtmlFragment('/partial', {}, '.item:first-child');
```

### FormData & Raw Bodies

FormData, Blob, ArrayBuffer, ReadableStream, TypedArray, and URLSearchParams are sent as-is. The `Content-Type` header is automatically removed so the runtime can set it (e.g., multipart boundary for FormData).

```typescript
const form = new FormData();
form.append('file', fileBlob, 'photo.jpg');
await api.post('/upload', { body: form });
```

### Custom Content-Type Handlers

```typescript
// Register a custom handler (takes priority over built-in)
Transportr.registerContentTypeHandler('csv', async (response) => {
  const text = await response.text();
  return text.split('\n').map(row => row.split(','));
});

// Remove a handler
Transportr.unregisterContentTypeHandler('csv');
```

### Cleanup

```typescript
// Tear down a single instance
api.destroy();

// Tear down all global state
Transportr.unregisterAll();

// Clear only global hooks without aborting in-flight requests
Transportr.clearHooks();
```

### Method Chaining

Instance methods `unregister()`, `addHooks()`, and `clearHooks()` return `this`:

```typescript
api
  .addHooks({ beforeRequest: [myHook] })
  .clearHooks()
  .addHooks({ afterResponse: [logHook] });
```

### Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `baseUrl` | `URL` | The base URL used for all requests from this instance |

### Static Properties

| Property | Description |
|----------|-------------|
| `Transportr.CredentialsPolicy` | Credentials policy constants |
| `Transportr.RequestModes` | Request mode constants |
| `Transportr.RequestPriorities` | Request priority constants |
| `Transportr.RedirectPolicies` | Redirect policy constants |
| `Transportr.ReferrerPolicy` | Referrer policy constants |
| `Transportr.RequestEvents` | Event name constants |

### Submodule Imports

HTTP constant objects are available as named submodule imports. Each is a tree-shakeable, side-effect-free object of string constants — useful for avoiding magic strings and getting autocomplete.

#### `@d1g1tal/transportr/headers`

Request header name constants.

```typescript
import { HttpRequestHeader } from '@d1g1tal/transportr/headers';

const api = new Transportr('https://api.example.com', {
	headers: {
		[HttpRequestHeader.AUTHORIZATION]: 'Bearer token',
		[HttpRequestHeader.CONTENT_TYPE]: 'application/json',
		[HttpRequestHeader.ACCEPT_LANGUAGE]: 'en-US'
	}
});
```

#### `@d1g1tal/transportr/methods`

HTTP method string constants.

```typescript
import { HttpRequestMethod } from '@d1g1tal/transportr/methods';

const response = await api.request('/data', { method: HttpRequestMethod.PATCH });
```

#### `@d1g1tal/transportr/media-types`

MIME type string constants covering common content types (JSON, HTML, XML, CSS, images, audio, video, and more).

```typescript
import { HttpMediaType } from '@d1g1tal/transportr/media-types';

const api = new Transportr('https://api.example.com', {
	headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.JSON }
});

// Use as a content-type value
await api.post('/upload', {
	body: csvData,
	headers: { [HttpRequestHeader.CONTENT_TYPE]: HttpMediaType.CSV }
});
```

#### `@d1g1tal/transportr/response-headers`

Response header name constants — useful when reading headers from a response.

```typescript
import { HttpResponseHeader } from '@d1g1tal/transportr/response-headers';

const reg = api.register(Transportr.RequestEvents.SUCCESS, (event, data) => {
	const response = data as Response;
	const etag = response.headers.get(HttpResponseHeader.ETAG);
	const retryAfter = response.headers.get(HttpResponseHeader.RETRY_AFTER);
	const location = response.headers.get(HttpResponseHeader.LOCATION);
});
```

## License

[ISC](LICENSE)