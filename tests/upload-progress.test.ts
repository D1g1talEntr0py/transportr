import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transportr } from '../src/transportr.js';
import type { DownloadProgress } from '../src/@types/index.js';

describe('Upload Progress', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Transportr.unregisterAll();
	});

	/**
	 * Mock fetch that consumes the request body stream to trigger upload progress callbacks.
	 * @param responseBody The JSON response to return.
	 * @returns A mock fetch implementation.
	 */
	const createStreamConsumingFetch = (responseBody: unknown) =>
		async (_url: string | URL, init?: RequestInit) => {
			const body = init?.body;
			if (body && typeof (body as ReadableStream).getReader === 'function') {
				const reader = (body as ReadableStream<Uint8Array>).getReader();
				while (!(await reader.read()).done) { /* consume stream */ }
			}
			return new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		};

	it('should invoke onUploadProgress callback for string/JSON body', async () => {
		const transportr = new Transportr('https://api.example.com');
		const body = { name: 'Alice', data: 'x'.repeat(100) };
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.post('/users', {
			body,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const last = progressUpdates[progressUpdates.length - 1]!;
		const expectedSize = new TextEncoder().encode(JSON.stringify(body)).length;
		expect(last.loaded).toBe(expectedSize);
		expect(last.total).toBe(expectedSize);
		expect(last.percentage).toBe(100);
	});

	it('should invoke onUploadProgress callback for Blob body', async () => {
		const transportr = new Transportr('https://api.example.com');
		const content = 'Hello World Binary Content';
		const blob = new Blob([content], { type: 'application/octet-stream' });
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.post('/upload', {
			body: blob,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const last = progressUpdates[progressUpdates.length - 1]!;
		expect(last.loaded).toBe(blob.size);
		expect(last.total).toBe(blob.size);
		expect(last.percentage).toBe(100);
	});

	it('should invoke onUploadProgress callback for ArrayBuffer body', async () => {
		const transportr = new Transportr('https://api.example.com');
		const buffer = new TextEncoder().encode('binary data payload').buffer;
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.put('/upload', {
			body: buffer,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const last = progressUpdates[progressUpdates.length - 1]!;
		expect(last.loaded).toBe(buffer.byteLength);
		expect(last.total).toBe(buffer.byteLength);
		expect(last.percentage).toBe(100);
	});

	it('should report null total/percentage for ReadableStream body', async () => {
		const transportr = new Transportr('https://api.example.com');
		const data = new TextEncoder().encode('streamed data');
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			}
		});
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.post('/stream', {
			body: stream,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const last = progressUpdates[progressUpdates.length - 1]!;
		expect(last.loaded).toBe(data.byteLength);
		expect(last.total).toBeNull();
		expect(last.percentage).toBeNull();
	});

	it('should not interfere when onUploadProgress is not set', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		const result = await transportr.post('/users', { body: { name: 'Bob' } });
		expect(result).toEqual({ ok: true });
	});

	it('should work with PUT method', async () => {
		const transportr = new Transportr('https://api.example.com');
		const body = { updated: true };
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.put('/resource/1', {
			body,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		expect(progressUpdates[progressUpdates.length - 1]!.percentage).toBe(100);
	});

	it('should work with PATCH method', async () => {
		const transportr = new Transportr('https://api.example.com');
		const body = { field: 'value' };
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.patch('/resource/1', {
			body,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		expect(progressUpdates[progressUpdates.length - 1]!.percentage).toBe(100);
	});

	it('should invoke onUploadProgress callback for TypedArray body', async () => {
		const transportr = new Transportr('https://api.example.com');
		const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
		mockFetch.mockImplementation(createStreamConsumingFetch({ ok: true }));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.post('/upload', {
			body: bytes,
			onUploadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const last = progressUpdates[progressUpdates.length - 1]!;
		expect(last.loaded).toBe(bytes.byteLength);
		expect(last.total).toBe(bytes.byteLength);
		expect(last.percentage).toBe(100);
	});

	it('should skip wrapping for unsupported body types like FormData', async () => {
		const transportr = new Transportr('https://api.example.com');
		const formData = new FormData();
		formData.append('field', 'value');
		const onUploadProgress = vi.fn();

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		await transportr.post('/upload', { body: formData, onUploadProgress });

		expect(onUploadProgress).not.toHaveBeenCalled();
	});
});
