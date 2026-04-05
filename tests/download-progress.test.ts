import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transportr } from '../src/transportr.js';
import type { DownloadProgress } from '../src/@types/index.js';

describe('Download Progress', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Transportr.unregisterAll();
	});

	/**
	 * Creates a ReadableStream from a string, split into chunks.
	 * @param data The full data string.
	 * @param chunkSize The size of each chunk in bytes.
	 * @returns A ReadableStream.
	 */
	const createChunkedStream = (data: string, chunkSize: number): ReadableStream<Uint8Array> => {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(data);
		let offset = 0;
		return new ReadableStream({
			pull(controller) {
				if (offset < bytes.length) {
					const end = Math.min(offset + chunkSize, bytes.length);
					controller.enqueue(bytes.slice(offset, end));
					offset = end;
				} else {
					controller.close();
				}
			}
		});
	};

	it('should invoke onDownloadProgress callback with loaded bytes', async () => {
		const transportr = new Transportr('https://api.example.com');
		const body = '{"data":"hello world, this is a test payload"}';
		const stream = createChunkedStream(body, 10);

		mockFetch.mockResolvedValueOnce(new Response(stream, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(new TextEncoder().encode(body).length)
			}
		}));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.getJson('/data', {
			onDownloadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		// Last update should have loaded equal to total
		const last = progressUpdates[progressUpdates.length - 1]!;
		expect(last.loaded).toBe(new TextEncoder().encode(body).length);
		expect(last.total).toBe(new TextEncoder().encode(body).length);
		expect(last.percentage).toBe(100);
	});

	it('should report null percentage when content-length is missing', async () => {
		const transportr = new Transportr('https://api.example.com');
		const body = '{"data":"test"}';
		const stream = createChunkedStream(body, 5);

		mockFetch.mockResolvedValueOnce(new Response(stream, {
			status: 200,
			headers: { 'content-type': 'application/json' }
			// No content-length
		}));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.getJson('/data', {
			onDownloadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		for (const update of progressUpdates) {
			expect(update.total).toBeNull();
			expect(update.percentage).toBeNull();
		}
		const last = progressUpdates[progressUpdates.length - 1]!;
		expect(last.loaded).toBe(new TextEncoder().encode(body).length);
	});

	it('should show increasing loaded values', async () => {
		const transportr = new Transportr('https://api.example.com');
		const body = 'A'.repeat(100);
		const stream = createChunkedStream(body, 20);

		mockFetch.mockResolvedValueOnce(new Response(stream, {
			status: 200,
			headers: {
				'content-type': 'text/plain',
				'content-length': '100'
			}
		}));

		const progressUpdates: DownloadProgress[] = [];
		await transportr.get('/data', {
			onDownloadProgress: (progress: DownloadProgress) => progressUpdates.push({ ...progress })
		});

		// Each update should have a greater loaded than the previous
		for (let i = 1; i < progressUpdates.length; i++) {
			expect(progressUpdates[i]!.loaded).toBeGreaterThan(progressUpdates[i - 1]!.loaded);
		}
	});

	it('should not interfere when onDownloadProgress is not set', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		const result = await transportr.getJson('/data');
		expect(result).toEqual({ ok: true });
	});
});
