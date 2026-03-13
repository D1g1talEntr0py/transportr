import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig, defineProject } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		globals: true,
		// Use project-based configuration for different environments
		projects: [
			defineProject({
				// Integration tests use node environment for better compatibility with fetch/AbortSignal
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/{global-event-handler,abort-all,all-complete-event,network-integration,environment-specific,signal-controller-cleanup,request-options-optimization,mediatype-caching,hooks}.test.ts'],
					setupFiles: './tests/scripts/setup.ts'
				}
			}),
			defineProject({
				// Unit tests use jsdom environment for any DOM-related functionality
				test: {
					name: 'unit',
					environment: 'jsdom',
					include: ['tests/*.test.ts'],
					exclude: ['tests/{global-event-handler,abort-all,all-complete-event,network-integration,environment-specific,signal-controller-cleanup,request-options-optimization,mediatype-caching,hooks}.test.ts'],
					setupFiles: './tests/scripts/setup.ts'
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
	},
	resolve: {
		alias: {
			'@src': resolve(__dirname, './src'),
			'@types': resolve(__dirname, './src/@types')
		}
	}
});