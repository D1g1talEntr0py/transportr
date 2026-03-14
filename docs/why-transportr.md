# Why Transportr?

The HTTP client space in JavaScript/TypeScript is crowded. Here's where Transportr fits and why it may be the right choice for your project.

## The Competition at a Glance

| Library | Weekly Downloads | Bundle Size | Node Requirement | Philosophy |
|---------|-----------------|-------------|-----------------|------------|
| axios | ~55M | ~14 kB | ≥ 10 | Kitchen-sink, XHR-based |
| ky | ~4M | ~3.5 kB | ≥ 18 | Tiny fetch wrapper, browser-first |
| ofetch | ~12M | ~7 kB | ≥ 18 | Universal, minimal API |
| wretch | ~120k | ~5 kB | ≥ 14 | Fluent-chain, middleware-based |
| got | ~14M | ~49 kB | ≥ 18 | Node-only, feature-rich |
| transportr | — | ~15 kB* | ≥ 20 | Content-type-aware, event-driven |

\* Core bundle without optional jsdom peer dependency. jsdom is only needed in Node.js for HTML/XML/DOM features and is **not installed automatically**.

---

## What Every Fetch Wrapper Gives You

All of these libraries wrap `fetch` and add roughly the same core set of features:

- JSON body serialization + parsing
- Error on non-2xx responses
- Request timeout
- Base URL configuration
- TypeScript types

If you only need those basics, any of them will do. ky at 3.5 kB is a perfectly fine choice.

---

## What Only Transportr Gives You

### 1. Content-Type-Aware Response Handling

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

### 2. Automatic DOMPurify Sanitization

`getHtml()`, `getXml()`, and `getHtmlFragment()` sanitize the response through **DOMPurify before parsing**. You don't have to remember to sanitize — it's built into the transport layer.

This is the correct place to sanitize: as close to the network boundary as possible, before the content ever reaches a parser or your application code.

### 3. HTML Selector Extraction

Fetch a page and get back exactly the element you want, not the whole document:

```typescript
// Returns Promise<Element | null>
const nav = await api.getHtml('/page', {}, 'nav.main');
const price = await api.getHtmlFragment('/product', {}, '.price');
```

Useful for partial page loading, widget hydration, and scraping structured content without a separate HTML parsing step.

### 4. Script & Stylesheet Injection with Cleanup

`getScript()` and `getStylesheet()` use `URL.createObjectURL()` to inject remote assets, then automatically revoke the object URL after load/error. No memory leaks, no dangling blob URLs:

```typescript
// Loads, verifies, injects, and cleans up automatically
await api.getScript('https://partner.example.com/sdk.js');
await api.getStylesheet('https://cdn.example.com/theme.css');
```

This is a real pattern for micro-frontend loaders and dynamic plugin systems. No other HTTP client handles it.

### 5. Full Lifecycle Event System

Transportr has a two-tier event system (global + per-instance) with a defined lifecycle:

```
configured → success | error | aborted | timeout → complete → all-complete
```

Register handlers globally (across all instances) or per-instance:

```typescript
// All requests, all instances
Transportr.register(Transportr.RequestEvents.SUCCESS, (event, data) => {
	analytics.track('api_success', { url: data.url });
});

// Just this instance
api.register(Transportr.RequestEvents.TIMEOUT, (event, error) => {
	toast.error('Request timed out');
});
```

ky has hooks. ofetch has hooks. Neither has a persistent, named event system you can subscribe to and unsubscribe from independently.

### 6. Request Deduplication

Identical in-flight GET/HEAD requests share a single fetch. Each caller receives a cloned `Response`:

```typescript
// Only one network request — both get independent Response clones
const [a, b] = await Promise.all([
	api.get('/config', { dedupe: true }),
	api.get('/config', { dedupe: true }),
]);
```

This is commonly left to userland caching or state management. Transportr makes it a first-class option.

### 7. `abortAll()` for Clean Teardown

Cancel every in-flight request across all instances in one call:

```typescript
// Route change, unmount, logout — kill everything
Transportr.abortAll();
```

Useful in SPAs for route transitions or session expiry. ky and ofetch require manual `AbortController` management per-request.

### 8. Structured Hook Layers

Hooks run in a deterministic order: **global → instance → per-request**. This lets you separate concerns cleanly:

```typescript
Transportr.addHooks({ beforeRequest: [addRequestId] });  // Always runs
api.addHooks({ afterResponse: [logLatency] });            // Runs for this API
await api.get('/data', { hooks: { beforeError: [notify] } }); // Only this call
```

---

## Feature Comparison

| Feature | transportr | ky | ofetch | wretch | axios |
|---------|:----------:|:--:|:------:|:------:|:-----:|
| JSON request/response | ✅ | ✅ | ✅ | ✅ | ✅ |
| TypeScript (first-class) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Timeout | ✅ | ✅ | ✅ | ✅ | ✅ |
| Retry with backoff | ✅ | ✅ | ✅ | ✅ | ⚠️ plugin |
| Request deduplication | ✅ | ❌ | ❌ | ❌ | ❌ |
| Abort all in-flight | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lifecycle event system | ✅ | ❌ | ❌ | ❌ | ❌ |
| HTML response → `Document` | ✅ | ❌ | ❌ | ❌ | ❌ |
| XML response → `Document` | ✅ | ❌ | ❌ | ❌ | ❌ |
| HTML fragment with selector | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auto DOMPurify sanitization | ✅ | ❌ | ❌ | ❌ | ❌ |
| Script injection + cleanup | ✅ | ❌ | ❌ | ❌ | ❌ |
| Stylesheet injection + cleanup | ✅ | ❌ | ❌ | ❌ | ❌ |
| Image → `HTMLImageElement` | ✅ | ❌ | ❌ | ❌ | ❌ |
| XSRF/CSRF protection | ✅ | ❌ | ❌ | ⚠️ plugin | ✅ |
| `beforeRequest` hooks | ✅ | ✅ | ✅ | ✅ | ✅ |
| `afterResponse` hooks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Global + instance hook layers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Branded JSON types | ✅ | ❌ | ❌ | ❌ | ❌ |
| Custom content-type handlers | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## When to Choose Transportr

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

---

## The jsdom Story

Transportr's DOM features require browser APIs (`DOMParser`, `DocumentFragment`, `document`). In Node.js these don't exist natively — jsdom provides them.

In **browser environments**, jsdom is never loaded. The DOM is native.

In **Node.js environments**, jsdom is loaded **on first use** of a DOM feature, not at startup. JSON-only users never pay the cost. jsdom is declared as an **optional peer dependency**: it will not be installed automatically. Install it yourself only if you need DOM features in Node.js:

```bash
pnpm add jsdom        # npm install jsdom / yarn add jsdom
```

If a DOM feature is called in Node.js without jsdom installed, you will receive a clear error:

```
Error: jsdom is required for HTML/XML/DOM features in Node.js environments.
Install it with: npm install jsdom
```
