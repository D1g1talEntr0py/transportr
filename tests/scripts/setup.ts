import { beforeAll, vi } from 'vitest';

// Setup file for Vitest tests
beforeAll(() => {
  // Ensure AbortController and AbortSignal are properly available
  if (!globalThis.AbortController) {
    globalThis.AbortController = AbortController;
  }

  if (!globalThis.AbortSignal) {
    globalThis.AbortSignal = AbortSignal;
  }

  // Setup URL object methods with vi spies for testing
  if (!globalThis.URL.createObjectURL || !vi.isMockFunction(globalThis.URL.createObjectURL)) {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  }

  if (!globalThis.URL.revokeObjectURL || !vi.isMockFunction(globalThis.URL.revokeObjectURL)) {
    globalThis.URL.revokeObjectURL = vi.fn();
  }

  // Also set up global.URL for tests that access it directly
  if (!global.URL) {
    global.URL = globalThis.URL;
  } else {
    if (!global.URL.createObjectURL || !vi.isMockFunction(global.URL.createObjectURL)) {
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (!global.URL.revokeObjectURL || !vi.isMockFunction(global.URL.revokeObjectURL)) {
      global.URL.revokeObjectURL = vi.fn();
    }
  }
});