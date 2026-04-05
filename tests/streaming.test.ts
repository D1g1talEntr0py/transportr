import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transportr } from '../src/transportr.js';
import type { ServerSentEvent } from '../src/@types/index.js';

/**
 * Creates a ReadableStream from an array of string chunks, simulating a streaming response.
 * @param chunks The string chunks to stream.
 * @returns A ReadableStream of Uint8Array.
 */
const createStream = (chunks: string[]): ReadableStream<Uint8Array> => {
	const encoder = new TextEncoder();
	let index = 0;
	return new ReadableStream({
		pull(controller) {
			if (index < chunks.length) {
				controller.enqueue(encoder.encode(chunks[index]!));
				index++;
			} else {
				controller.close();
			}
		}
	});
};

/**
 * Creates a mock Response with a streaming body.
 * @param chunks The string chunks.
 * @param headers Optional headers.
 * @returns A Response object.
 */
const createStreamingResponse = (chunks: string[], headers: Record<string, string> = {}): Response => {
	return new Response(createStream(chunks), {
		status: 200,
		statusText: 'OK',
		headers: new Headers({ 'content-type': 'text/event-stream', ...headers })
	});
};

describe('Streaming Features', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Transportr.unregisterAll();
	});

	describe('getEventStream (SSE)', () => {
		it('should parse a single SSE event', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'event: message\ndata: hello world\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				event: 'message',
				data: 'hello world',
				id: '',
				retry: undefined
			});
		});

		it('should parse multiple SSE events from a single chunk', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'data: first\n\ndata: second\n\nevent: custom\ndata: third\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(3);
			expect(events[0]!.data).toBe('first');
			expect(events[1]!.data).toBe('second');
			expect(events[2]!.event).toBe('custom');
			expect(events[2]!.data).toBe('third');
		});

		it('should handle events split across multiple chunks', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'data: hel',
				'lo world\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.data).toBe('hello world');
		});

		it('should parse id and retry fields', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'id: 42\nretry: 5000\ndata: payload\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.id).toBe('42');
			expect(events[0]!.retry).toBe(5000);
			expect(events[0]!.data).toBe('payload');
		});

		it('should handle multi-line data fields', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'data: line1\ndata: line2\ndata: line3\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.data).toBe('line1\nline2\nline3');
		});

		it('should skip comment lines', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				': this is a comment\ndata: actual data\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.data).toBe('actual data');
		});

		it('should handle custom event types', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'event: ping\n\nevent: update\ndata: new value\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(2);
			expect(events[0]!.event).toBe('ping');
			expect(events[1]!.event).toBe('update');
			expect(events[1]!.data).toBe('new value');
		});

		it('should strip single leading space from field values', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'data: has space\n\ndata:no space\n\ndata:  two spaces\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/stream')) {
				events.push(event);
			}

			expect(events).toHaveLength(3);
			expect(events[0]!.data).toBe('has space');
			expect(events[1]!.data).toBe('no space');
			expect(events[2]!.data).toBe(' two spaces'); // only first space stripped
		});

		it('should use POST method when body is provided in options', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'data: response\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/chat', { body: { prompt: 'hello' } })) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]!;
			expect(lastCall[1]).toHaveProperty('method', 'POST');
		});
	});

	describe('getJsonStream (NDJSON)', () => {
		it('should parse single NDJSON line', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"id":1,"name":"Alice"}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: unknown[] = [];
			for await (const record of await transportr.getJsonStream('/export')) {
				records.push(record);
			}

			expect(records).toHaveLength(1);
			expect(records[0]).toEqual({ id: 1, name: 'Alice' });
		});

		it('should parse multiple NDJSON lines', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"id":1}\n{"id":2}\n{"id":3}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: unknown[] = [];
			for await (const record of await transportr.getJsonStream('/export')) {
				records.push(record);
			}

			expect(records).toHaveLength(3);
			expect(records[0]).toEqual({ id: 1 });
			expect(records[1]).toEqual({ id: 2 });
			expect(records[2]).toEqual({ id: 3 });
		});

		it('should handle lines split across chunks', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"id":', '1}\n{"id":2}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: unknown[] = [];
			for await (const record of await transportr.getJsonStream('/export')) {
				records.push(record);
			}

			expect(records).toHaveLength(2);
			expect(records[0]).toEqual({ id: 1 });
			expect(records[1]).toEqual({ id: 2 });
		});

		it('should handle remaining buffer after stream ends', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"id":1}']), // no trailing newline
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: unknown[] = [];
			for await (const record of await transportr.getJsonStream('/export')) {
				records.push(record);
			}

			expect(records).toHaveLength(1);
			expect(records[0]).toEqual({ id: 1 });
		});

		it('should skip empty lines', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"id":1}\n\n\n{"id":2}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: unknown[] = [];
			for await (const record of await transportr.getJsonStream('/export')) {
				records.push(record);
			}

			expect(records).toHaveLength(2);
		});

		it('should support generic typing', async () => {
			interface User { id: number; name: string }

			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"id":1,"name":"Alice"}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: User[] = [];
			for await (const record of await transportr.getJsonStream<User>('/export')) {
				records.push(record);
			}

			expect(records).toHaveLength(1);
			expect(records[0]!.name).toBe('Alice');
		});
	});

	describe('SSE edge cases', () => {
		it('should handle field without colon (bare field name)', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse(['event\ndata: payload\n\n']));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/events')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.event).toBe('');
			expect(events[0]!.data).toBe('payload');
		});

		it('should skip empty default events', async () => {
			const transportr = new Transportr('https://api.example.com');
			// First event has no data and default event type → skipped
			// Second event has data → emitted
			mockFetch.mockResolvedValueOnce(createStreamingResponse(['retry: abc\n\n', 'data: real\n\n']));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/events')) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.data).toBe('real');
		});

		it('should allow early break from SSE stream via return()', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse([
				'data: first\n\n',
				'data: second\n\n',
				'data: third\n\n'
			]));

			const events: ServerSentEvent[] = [];
			for await (const event of await transportr.getEventStream('/events')) {
				events.push(event);
				break;
			}

			expect(events).toHaveLength(1);
			expect(events[0]!.data).toBe('first');
		});
	});

	describe('NDJSON edge cases', () => {
		it('should allow early break from NDJSON stream via return()', async () => {
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"a":1}\n', '{"a":2}\n', '{"a":3}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const records: { a: number }[] = [];
			for await (const record of await transportr.getJsonStream<{ a: number }>('/export')) {
				records.push(record);
				break;
			}

			expect(records).toHaveLength(1);
			expect(records[0]!.a).toBe(1);
		});
	});

	describe('Streaming with hooks', () => {
		it('should run beforeRequest hooks on getEventStream', async () => {
			const hook = vi.fn();
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse(['data: ok\n\n']));

			const stream = await transportr.getEventStream('/events', {
				hooks: { beforeRequest: [hook] }
			});

			expect(hook).toHaveBeenCalledOnce();
			for await (const _event of stream as AsyncIterable<unknown>) { break }
		});

		it('should run afterResponse hooks on getEventStream', async () => {
			const hook = vi.fn((_response: Response) => undefined);
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(createStreamingResponse(['data: ok\n\n']));

			const stream = await transportr.getEventStream('/events', {
				hooks: { afterResponse: [hook] }
			});

			expect(hook).toHaveBeenCalledOnce();
			for await (const _event of stream as AsyncIterable<unknown>) { break }
		});

		it('should run beforeRequest hooks on getJsonStream', async () => {
			const hook = vi.fn();
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"a":1}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const stream = await transportr.getJsonStream('/export', {
				hooks: { beforeRequest: [hook] }
			});

			expect(hook).toHaveBeenCalledOnce();
			for await (const _record of stream as AsyncIterable<unknown>) { break }
		});

		it('should run afterResponse hooks on getJsonStream', async () => {
			const hook = vi.fn((_response: Response) => undefined);
			const transportr = new Transportr('https://api.example.com');
			mockFetch.mockResolvedValueOnce(new Response(
				createStream(['{"a":1}\n']),
				{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
			));

			const stream = await transportr.getJsonStream('/export', {
				hooks: { afterResponse: [hook] }
			});

			expect(hook).toHaveBeenCalledOnce();
			for await (const _record of stream as AsyncIterable<unknown>) { break }
		});
	});
});
