# transportr

[![npm version](https://img.shields.io/npm/v/@d1g1tal/transportr?color=blue)](https://www.npmjs.com/package/@d1g1tal/transportr)
[![npm downloads](https://img.shields.io/npm/dm/@d1g1tal/transportr)](https://www.npmjs.com/package/@d1g1tal/transportr)
[![CI](https://github.com/D1g1talEntr0py/transportr/actions/workflows/ci.yml/badge.svg)](https://github.com/D1g1talEntr0py/transportr/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/D1g1talEntr0py/transportr/graph/badge.svg)](https://codecov.io/gh/D1g1talEntr0py/transportr)
[![License: ISC](https://img.shields.io/github/license/D1g1talEntr0py/transportr)](https://github.com/D1g1talEntr0py/transportr/blob/main/LICENSE)
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

## Installation

```bash
pnpm add @d1g1tal/transportr
```

## Requirements

- **Node.js** ≥ 20.0.0 or a modern browser with native [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and `AbortController` support
- `jsdom` is an **optional peer dependency** — only needed for HTML/XML/DOM features in Node.js. Install it separately if you use `getHtml()`, `getXml()`, `getHtmlFragment()`, `getScript()`, `getStylesheet()`, or `getImage()` in a non-browser environment:

```bash
pnpm add jsdom
```

## Quick Start

```typescript
import { Transportr } from '@d1g1tal/transportr';

const api = new Transportr('https://api.example.com');

// GET JSON
const data = await api.getJson('/users/1');

// POST with JSON body
const created = await api.post('/users', { body: { name: 'Alice' } });

// GET with search params
const results = await api.getJson('/search', { searchParams: { q: 'term', page: 1 } });

// Typed response using generics
interface User { id: number; name: string; }
const user = await api.get<User>('/users/1');
```

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

HTTP constant objects are available as named submodule imports rather than static class properties:

```typescript
import { HttpMediaType } from '@d1g1tal/transportr/media-types';
import { HttpRequestMethod } from '@d1g1tal/transportr/methods';
import { HttpRequestHeader } from '@d1g1tal/transportr/headers';
import { HttpResponseHeader } from '@d1g1tal/transportr/response-headers';
```

| Submodule | Export | Description |
|-----------|--------|-------------|
| `@d1g1tal/transportr/media-types` | `HttpMediaType` | MIME type string constants |
| `@d1g1tal/transportr/methods` | `HttpRequestMethod` | HTTP method string constants |
| `@d1g1tal/transportr/headers` | `HttpRequestHeader` | Request header name constants |
| `@d1g1tal/transportr/response-headers` | `HttpResponseHeader` | Response header name constants |

## License

[ISC](LICENSE)