# transportr

[![npm version](https://img.shields.io/npm/v/@d1g1tal/transportr?color=blue)](https://www.npmjs.com/package/@d1g1tal/transportr)
[![npm downloads](https://img.shields.io/npm/dm/@d1g1tal/transportr)](https://www.npmjs.com/package/@d1g1tal/transportr)
[![CI](https://github.com/D1g1talEntr0py/transportr/actions/workflows/ci.yml/badge.svg)](https://github.com/D1g1talEntr0py/transportr/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/D1g1talEntr0py/transportr/graph/badge.svg)](https://codecov.io/gh/D1g1talEntr0py/transportr)
[![License: MIT](https://img.shields.io/github/license/D1g1talEntr0py/transportr)](https://github.com/D1g1talEntr0py/transportr/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/@d1g1tal/transportr)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

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
- **Streaming** — SSE (`getEventStream`) and NDJSON (`getJsonStream`) as `AsyncIterable`
- **Progress tracking** — Download and upload progress callbacks with loaded/total/percentage
- **Safe results** — `unwrap: false` option returns `Result<T>` tuples instead of throwing
- **Concurrent helpers** — `Transportr.all()` and `Transportr.race()` with auto-abort for race losers

## Why Transportr?

The HTTP client space in JavaScript/TypeScript is crowded. Here's where Transportr fits and why it may be the right choice for your project.

### The Competition at a Glance

| Library | Minified | Gzipped | Engine | Request API | Philosophy |
|---------|----------|---------|--------|-------------|------------|
| axios | 35.4 kB | 13.9 kB | ≥ 10 | XMLHttpRequest / http | Kitchen-sink, XHR-based |
| ky | 13.7 kB | 4.9 kB | ≥ 18 | Fetch | Tiny fetch wrapper, browser-first |
| ofetch | 9.3 kB | 3.8 kB | ≥ 18 | Fetch | Universal, minimal API |
| wretch | 4.8 kB | 1.9 kB | ≥ 14 | Fetch | Fluent-chain, middleware-based |
| got | — | ~43 kB | ≥ 18 | http/https | Node-only, feature-rich |
| transportr | 27 kB | 8.5 kB* | ≥ 20 | Fetch | Content-type-aware, event-driven |

Sizes from [Bundlephobia](https://bundlephobia.com). \*Transportr bundles `@d1g1tal/media-type`, `@d1g1tal/subscribr`, and DOMPurify. Optional `jsdom` peer dependency is **not** included — only needed for HTML/XML/DOM features in Node.js.

### What Every Fetch Wrapper Gives You

All of these libraries wrap `fetch` and add roughly the same core set of features:

- JSON body serialization + parsing
- Error on non-2xx responses
- Request timeout
- Base URL configuration
- TypeScript types

If you only need those basics, any of them will do. ky at 3.5 kB is a perfectly fine choice.

### What Only Transportr Gives You

#### 1. Content-Type-Aware Response Handling

No other HTTP client knows *what it fetched* and processes it accordingly. Transportr maps response `Content-Type` directly to strongly-typed return values:

```typescript
const api = new Transportr('https://example.com');

// Returns Promise<Json> — parsed and typed
const data = await api.getJson('/api/users');

// Returns Promise<Document> — fully parsed, DOMPurify-sanitized HTML
const page = await api.getHtml('/page');

// Returns Promise<Document> — sanitized and parsed XML
const feed = await api.getXml('/feed.xml');

// Returns Promise<DocumentFragment> — isolated fragment, no full document
const fragment = await api.getHtmlFragment('/partial');

// Returns Promise<void> — script fetched, verified, injected into <head>
await api.getScript('https://cdn.example.com/widget.js');

// Returns Promise<void> — stylesheet fetched and injected into <head>
await api.getStylesheet('https://cdn.example.com/theme.css');

// Returns Promise<HTMLImageElement> — decoded, memory-safe
const img = await api.getImage('/assets/photo.webp');

// Returns Promise<ReadableStream> — for large payloads
const stream = await api.getStream('/export/data.csv');
```

The type system enforces what you get back. You can't accidentally call `.querySelector()` on a JSON response.

#### 2. Automatic DOMPurify Sanitization

`getHtml()`, `getXml()`, and `getHtmlFragment()` sanitize the response through **DOMPurify before parsing**. You don't have to remember to sanitize — it's built into the transport layer.

This is the correct place to sanitize: as close to the network boundary as possible, before the content ever reaches a parser or your application code.

#### 3. HTML Selector Extraction

Fetch a page and get back exactly the element you want, not the whole document:

```typescript
// Returns Promise<Element | null>
const nav = await api.getHtml('/page', {}, 'nav.main');
const price = await api.getHtmlFragment('/product', {}, '.price');
```

Useful for partial page loading, widget hydration, and scraping structured content without a separate HTML parsing step.

#### 4. Script & Stylesheet Injection with Cleanup

`getScript()` and `getStylesheet()` use `URL.createObjectURL()` to inject remote assets, then automatically revoke the object URL after load/error. No memory leaks, no dangling blob URLs:

```typescript
// Loads, verifies, injects, and cleans up automatically
await api.getScript('https://partner.example.com/sdk.js');
await api.getStylesheet('https://cdn.example.com/theme.css');
```

This is a real pattern for micro-frontend loaders and dynamic plugin systems. No other HTTP client handles it.

#### 5. Full Lifecycle Event System

Transportr has a two-tier event system (global + per-instance) with a defined lifecycle:

```
configured → success | error | aborted | timeout → complete → all-complete
```

Register handlers globally (across all instances) or per-instance:

```typescript
// All requests, all instances
Transportr.register(Transportr.RequestEvent.SUCCESS, (event, data) => {
	analytics.track('api_success', { url: data.url });
});

// Just this instance
api.register(Transportr.RequestEvent.TIMEOUT, (event, error) => {
	toast.error('Request timed out');
});
```

ky has hooks. ofetch has hooks. Neither has a persistent, named event system you can subscribe to and unsubscribe from independently.

#### 6. Request Deduplication

Identical in-flight GET/HEAD requests share a single fetch. Each caller receives a cloned `Response`:

```typescript
// Only one network request — both get independent Response clones
const [a, b] = await Promise.all([
	api.get('/config', { dedupe: true }),
	api.get('/config', { dedupe: true }),
]);
```

This is commonly left to userland caching or state management. Transportr makes it a first-class option.

#### 7. `abortAll()` for Clean Teardown

Cancel every in-flight request across all instances in one call:

```typescript
// Route change, unmount, logout — kill everything
Transportr.abortAll();
```

Useful in SPAs for route transitions or session expiry. ky and ofetch require manual `AbortController` management per-request.

#### 8. Structured Hook Layers

Hooks run in a deterministic order: **global → instance → per-request**. This lets you separate concerns cleanly:

```typescript
Transportr.addHooks({ beforeRequest: [addRequestId] });  // Always runs
api.addHooks({ afterResponse: [logLatency] });            // Runs for this API
await api.get('/data', { hooks: { beforeError: [notify] } }); // Only this call
```

### Feature Comparison

| Feature | transportr | ky | ofetch | wretch | axios |
|---------|:----------:|:--:|:------:|:------:|:-----:|
| JSON request/response | ✅ | ✅ | ✅ | ✅ | ✅ |
| TypeScript (first-class) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Timeout | ✅ | ✅ | ✅ | ✅ | ✅ |
| Retry with backoff | ✅ | ✅ | ✅ | ✅ | ⚠️ plugin |
| SSE / NDJSON streaming | ✅ | ❌ | ❌ | ❌ | ❌ |
| Download / upload progress | ✅ | ✅ | ❌ | ⚠️ addon | ✅ |
| Safe result tuples | ✅ | ❌ | ❌ | ❌ | ❌ |
| Concurrent helpers with auto-abort | ✅ | ❌ | ❌ | ❌ | ❌ |
| Request deduplication | ✅ | ❌ | ❌ | ⚠️ middleware | ❌ |
| Abort all in-flight | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lifecycle event system | ✅ | ❌ | ❌ | ❌ | ❌ |
| HTML response → `Document` | ✅ | ❌ | ❌ | ❌ | ❌ |
| XML response → `Document` | ✅ | ❌ | ❌ | ❌ | ❌ |
| HTML fragment with selector | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auto DOMPurify sanitization | ✅ | ❌ | ❌ | ❌ | ❌ |
| Script injection + cleanup | ✅ | ❌ | ❌ | ❌ | ❌ |
| Stylesheet injection + cleanup | ✅ | ❌ | ❌ | ❌ | ❌ |
| Image → `HTMLImageElement` | ✅ | ❌ | ❌ | ❌ | ❌ |
| XSRF/CSRF protection | ✅ | ❌ | ❌ | ❌ | ✅ |
| `beforeRequest` hooks | ✅ | ✅ | ✅ | ✅ | ✅ |
| `afterResponse` hooks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Global + instance hook layers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Branded JSON types | ✅ | ❌ | ❌ | ❌ | ❌ |
| Custom content-type handlers | ✅ | ❌ | ❌ | ❌ | ❌ |

### When to Choose Transportr

**Choose Transportr if you are building:**

- A **micro-frontend loader** that fetches and injects remote scripts or stylesheets
- An **SSR/ISR application** that fetches HTML partials and extracts fragments server-side
- A **content aggregator** that deals with mixed response types (JSON, HTML, XML, images)
- A **dashboard or scraper** that parses HTML with CSS selectors and needs built-in sanitization
- An application where **abort-all on route change** or **request deduplication** are requirements
- A project that wants **typed lifecycle events** rather than ad-hoc error handling

**Choose ky or ofetch if you are building:**

- A pure JSON API client where bundle size is the primary constraint
- A project that has no DOM-manipulation requirements
- A project that already has its own event/observability layer

## Requirements

- **Node.js** ≥ 20.0.0 or a modern browser with native [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and `AbortController` support
- `jsdom` is an **optional peer dependency** — only needed for HTML/XML/DOM features in Node.js. Install it separately if you use `getHtml()`, `getXml()`, `getHtmlFragment()`, `getScript()`, `getStylesheet()`, or `getImage()` in a non-browser environment:

```bash
pnpm add jsdom
```

## Installation

```bash
# With pnpm:
pnpm add @d1g1tal/transportr

# Or with npm:
npm install @d1g1tal/transportr

# Or with yarn
yarn add @d1g1tal/transportr
```

## Quick Start

Only the main module is required — the submodule constants (`RequestHeader`, `ContentType`, etc.) are optional conveniences. Anywhere a constant is used, a plain string works just as well.

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
    "@d1g1tal/transportr/request-header": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/request-header.js",
    "@d1g1tal/transportr/request-method": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/request-method.js",
    "@d1g1tal/transportr/content-type": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/content-type.js",
    "@d1g1tal/transportr/response-header": "https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/response-header.js"
  }
}
</script>

<script type="module">
	import { Transportr } from '@d1g1tal/transportr';
	import { RequestHeader } from '@d1g1tal/transportr/request-header';
	import { RequestMethod } from '@d1g1tal/transportr/request-method';
	import { ContentType } from '@d1g1tal/transportr/content-type';
	import { ResponseHeader } from '@d1g1tal/transportr/response-header';

	const api = new Transportr('https://api.example.com', {
		headers: {
			[RequestHeader.AUTHORIZATION]: 'Bearer token',
			[RequestHeader.ACCEPT]: ContentType.JSON
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
	import { RequestHeader } from 'https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/request-header.js';
	import { ContentType } from 'https://cdn.jsdelivr.net/npm/@d1g1tal/transportr/dist/content-type.js';

	const api = new Transportr('https://api.example.com', {
		headers: {
			[RequestHeader.AUTHORIZATION]: 'Bearer token',
			[RequestHeader.ACCEPT]: ContentType.JSON
		}
	});

	const data = await api.getJson('/users/1');
	console.log(data);
</script>
```

Import map support is available in all browsers covered by this project's `browserslist` configuration (Chrome 89+, Firefox 108+, Safari 16.4+).

## Migrating from v2

v3.0 contains breaking renames plus new features. The renames are all find-and-replace — no behavior changed.

### Submodule paths & exported symbols

| Before (v2) | After (v3) |
|---|---|
| `@d1g1tal/transportr/headers` | `@d1g1tal/transportr/request-header` |
| `@d1g1tal/transportr/methods` | `@d1g1tal/transportr/request-method` |
| `@d1g1tal/transportr/media-types` | `@d1g1tal/transportr/content-type` |
| `@d1g1tal/transportr/response-headers` | `@d1g1tal/transportr/response-header` |
| `HttpRequestHeader` | `RequestHeader` |
| `HttpRequestMethod` | `RequestMethod` |
| `HttpMediaType` | `ContentType` |
| `HttpResponseHeader` | `ResponseHeader` |

### Static properties on `Transportr`

| Before (v2) | After (v3) |
|---|---|
| `Transportr.RequestEvents` | `Transportr.RequestEvent` |
| `Transportr.RequestModes` | `Transportr.RequestMode` |
| `Transportr.RequestPriorities` | `Transportr.RequestPriority` |
| `Transportr.RedirectPolicies` | `Transportr.RedirectPolicy` |

### New in v3

- **Streaming responses** — `getEventStream()` returns an `AsyncIterable<ServerSentEvent>` for SSE endpoints; `getJsonStream<T>()` returns an `AsyncIterable<T>` for NDJSON feeds.
- **Progress tracking** — `onDownloadProgress` and `onUploadProgress` callbacks in request options provide `{ loaded, total, percentage }` updates.
- **Safe results** — Pass `unwrap: false` per-request or in the constructor to get `Result<T>` tuples (`[true, data]` or `[false, error]`) instead of thrown errors.
- **Concurrent helpers** — `Transportr.all()` for parallel requests; `Transportr.race()` races requests and auto-aborts the losers.
- **Typed events** — `register()` now narrows the event data type based on the event name.

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

### Updating Instance Options

Update any option that was set at construction time, without creating a new instance. `configure()` accepts the same shape as the constructor options. Headers and searchParams are **merged** onto existing defaults; all other options **overwrite** the current value; hooks are appended.

```typescript
const api = new Transportr('https://api.example.com', {
	timeout: 30000,
	credentials: 'same-origin'
});

// After login — inject auth token and tighten timeout
api.configure({
	timeout: 10000,
	credentials: 'include',
	headers: { 'Authorization': `Bearer ${token}` }
});

// Add default search params for all subsequent requests
api.configure({ searchParams: { version: '2', locale: 'en' } });

// Chainable
api
	.configure({ timeout: 5000 })
	.configure({ headers: { 'X-Tenant': 'acme' } })
	.addHooks({ beforeRequest: [logHook] });
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
| `getEventStream(path?, options?)` | `AsyncIterable<ServerSentEvent>` | `text/event-stream` |
| `getJsonStream<T>(path?, options?)` | `AsyncIterable<T>` | `application/x-ndjson` |

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
	unwrap?: boolean;              // false → return Result<T> tuple instead of throwing
	onDownloadProgress?: (progress: DownloadProgress) => void;
	onUploadProgress?: (progress: DownloadProgress) => void;
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
const reg = Transportr.register(Transportr.RequestEvent.SUCCESS, (event, data) => {
	console.log('Request succeeded:', data);
});

// Instance events
const reg = api.register(Transportr.RequestEvent.ERROR, (event, error) => {
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

### Streaming

```typescript
// Server-Sent Events (SSE)
for await (const event of await api.getEventStream('/chat/completions', { body: { prompt } })) {
	console.log(event.event, event.data);
}

// NDJSON (Newline Delimited JSON)
interface LogEntry { ts: number; message: string; }
for await (const entry of await api.getJsonStream<LogEntry>('/logs/stream')) {
	processEntry(entry);
}
```

### Progress Tracking

```typescript
// Download progress
await api.getBlob('/large-file', {
	onDownloadProgress: ({ loaded, total, percentage }) => {
		console.log(`${percentage}% (${loaded}/${total})`);
	}
});

// Upload progress
await api.post('/upload', {
	body: largeBlob,
	onUploadProgress: ({ loaded, total, percentage }) => {
		console.log(`Uploading: ${percentage}%`);
	}
});
```

### Safe Results (unwrap: false)

Pass `unwrap: false` to get a `Result<T>` tuple instead of thrown errors. The tuple is `[true, data]` on success or `[false, HttpError]` on failure.

```typescript
// Per-request
const [ok, result] = await api.getJson('/users/1', { unwrap: false });
if (ok) {
	console.log(result); // typed as Json
} else {
	console.error(result.statusCode); // typed as HttpError
}

// Constructor-level default
const safeApi = new Transportr('https://api.example.com', { unwrap: false });
const [ok, data] = await safeApi.getJson('/data');
```

### Concurrent Requests

```typescript
// Run multiple requests in parallel
const [users, posts] = await Transportr.all([
	api.getJson('/users'),
	api.getJson('/posts')
]);

// Race requests — first to settle wins, losers are aborted
const fastest = await Transportr.race([
	(signal) => api.getJson('/primary-cdn/data', { signal }),
	(signal) => api.getJson('/fallback-cdn/data', { signal })
]);
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

Instance methods `configure()`, `unregister()`, `addHooks()`, and `clearHooks()` return `this`:

```typescript
api
	.configure({ timeout: 5000, credentials: 'include' })
	.configure({ headers: { 'Authorization': `Bearer ${token}` } })
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
| `Transportr.RequestMode` | Request mode constants |
| `Transportr.RequestPriority` | Request priority constants |
| `Transportr.RedirectPolicy` | Redirect policy constants |
| `Transportr.ReferrerPolicy` | Referrer policy constants |
| `Transportr.RequestEvent` | Event name constants |
| `Transportr.all(requests)` | Run requests in parallel (`Promise.all` with tuple typing) |
| `Transportr.race(requests)` | Race request factories; auto-aborts losers |
| `Transportr.abortAll()` | Abort all in-flight requests across all instances |
| `Transportr.addHooks(hooks)` | Add global lifecycle hooks |
| `Transportr.clearHooks()` | Remove all global hooks |
| `Transportr.register(event, handler)` | Register a global event handler |
| `Transportr.unregister(registration)` | Remove a global event handler |

### Submodule Imports

HTTP constant objects are available as named submodule imports. Each is a tree-shakeable, side-effect-free object of string constants — useful for avoiding magic strings and getting autocomplete.

#### `@d1g1tal/transportr/request-header`

Request header name constants.

```typescript
import { Transportr } from '@d1g1tal/transportr';
import { RequestHeader } from '@d1g1tal/transportr/request-header';

const api = new Transportr('https://api.example.com', {
	headers: {
		[RequestHeader.AUTHORIZATION]: 'Bearer token',
		[RequestHeader.CONTENT_TYPE]: 'application/json',
		[RequestHeader.ACCEPT_LANGUAGE]: 'en-US'
	}
});
```

#### `@d1g1tal/transportr/request-method`

HTTP method string constants.

```typescript
import { Transportr } from '@d1g1tal/transportr';
import { RequestMethod } from '@d1g1tal/transportr/request-method';

const api = new Transportr('https://api.example.com');
const response = await api.request('/data', { method: RequestMethod.PATCH });
```

#### `@d1g1tal/transportr/content-type`

MIME type string constants covering common content types (JSON, HTML, XML, CSS, images, audio, video, and more).

```typescript
import { Transportr } from '@d1g1tal/transportr';
import { RequestHeader } from '@d1g1tal/transportr/request-header';
import { ContentType } from '@d1g1tal/transportr/content-type';

const api = new Transportr('https://api.example.com', {
	headers: { [RequestHeader.ACCEPT]: ContentType.JSON }
});

// Use as a content-type value
const csvData = 'id,name\n1,Alice';
await api.post('/upload', {
	body: csvData,
	headers: { [RequestHeader.CONTENT_TYPE]: ContentType.CSV }
});
```

#### `@d1g1tal/transportr/response-header`

Response header name constants — useful when reading headers from a response.

```typescript
import { Transportr } from '@d1g1tal/transportr';
import { ResponseHeader } from '@d1g1tal/transportr/response-header';

const api = new Transportr('https://api.example.com');
const reg = api.register(Transportr.RequestEvent.SUCCESS, (event, data) => {
	const response = data as Response;
	const etag = response.headers.get(ResponseHeader.ETAG);
	const retryAfter = response.headers.get(ResponseHeader.RETRY_AFTER);
	const location = response.headers.get(ResponseHeader.LOCATION);
});
```

## License

[MIT](LICENSE)