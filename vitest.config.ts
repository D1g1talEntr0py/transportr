import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig, defineProject } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@src': resolve(__dirname, './src'),
			'@types': resolve(__dirname, './src/@types')
		}
	},
	test: {
		globals: true,
		// Use project-based configuration for different environments
		projects: [
			defineProject({
				// Integration tests use node environment for better compatibility with fetch/AbortSignal
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/{global-event-handler,abort-all,all-complete-event,network-integration,environment-specific,signal-controller-cleanup,request-options-optimization,mediatype-caching,hooks,response-handlers-error}.test.ts'],
					setupFiles: './tests/scripts/setup.ts'
				}
			}),
			defineProject({
				// Unit tests use jsdom environment for any DOM-related functionality
				test: {
					name: 'unit',
					environment: 'jsdom',
					include: ['tests/*.test.ts'],
					exclude: ['tests/{global-event-handler,abort-all,all-complete-event,network-integration,environment-specific,signal-controller-cleanup,request-options-optimization,mediatype-caching,hooks,response-handlers-error,response-handlers-browser}.test.ts'],
					setupFiles: './tests/scripts/setup.ts'
				}
			}),
			defineProject({
				// Browser tests run in real Chromium via Playwright.
				// These validate behaviour that jsdom cannot reproduce faithfully,
				// specifically DOMPurify interacting with a real HTML parser.
				test: {
					name: 'browser',
					browser: {
						enabled: true,
						headless: true,
						screenshotFailures: false,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
					include: ['tests/response-handlers-browser.test.ts'],
				}
			})
		],
		coverage: {
			reporter: ['text', 'json', 'html', 'clover', 'lcov'],
			reportsDirectory: './tests/coverage',
			include: ['src/**/*.ts'],
			exclude: ['node_modules/', 'src/@types/'],
			clean: true,
		}
	}
});
