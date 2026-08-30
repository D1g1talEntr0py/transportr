import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { ContentType } from '../src/content-type.js';

// Helper to read blob content for tests
const readBlobAsText = (blob: Blob): Promise<string> => {
	return new Promise((resolve, reject) => {
		// In Node.js test environment, we can directly convert the blob to text
		// since it's actually a Node.js Blob with a text() method
		if ('text' in blob && typeof (blob as any).text === 'function') {
			(blob as any).text().then(resolve).catch(reject);
		} else {
			// Fallback to FileReader approach
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsText(blob);
		}
	});
};

describe('Response Handlers', () => {
	const transportr = new Transportr('https://example.com');

	// Mock native fetch
	const mockFetch = vi.fn();
	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should handle and sanitize HTML responses', async () => {
		const maliciousHtml = '<h1>Hello</h1><script>alert("XSS")</script>';
		const mockResponse = new Response(maliciousHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		});
		mockFetch.mockResolvedValue(mockResponse);

		const doc = await transportr.getHtml('/test') as Document;

		expect(doc).toBeInstanceOf(Document);
		// The h1 should be present
		expect(doc.querySelector('h1')).not.toBeNull();
		expect(doc.querySelector('h1')?.textContent).toBe('Hello');
		// The script tag should have been removed by DOMPurify
		expect(doc.querySelector('script')).toBeNull();
	});

	it('should handle and sanitize XML responses', async () => {
		const maliciousXml = '<?xml version="1.0" encoding="UTF-8"?><root><user role="admin">test</user><script>alert("XSS")</script><link href="javascript:alert(1)" onclick="alert(2)">safe</link></root>';
		const mockResponse = new Response(maliciousXml, {
			headers: { 'Content-Type': ContentType.XML }
		});
		mockFetch.mockResolvedValue(mockResponse);

		const doc = await transportr.getXml('/test') as Document;

		expect(doc).toBeInstanceOf(Document);
		expect(doc.querySelector('parsererror')).toBeNull();

		// The XML vocabulary survives sanitization, including attributes that are unknown to HTML.
		expect(doc.documentElement.nodeName).toBe('root');
		expect(doc.querySelector('user')?.textContent).toBe('test');
		expect(doc.querySelector('user')?.getAttribute('role')).toBe('admin');

		// Dangerous elements and attributes do not.
		expect(doc.querySelector('script')).toBeNull();
		expect(doc.querySelector('link')).toBeNull();
	});

	it('should preserve element namespaces when sanitizing XML', async () => {
		const namespacedXml = '<catalog xmlns="urn:example:catalog"><item id="1">Kind of Blue</item></catalog>';
		mockFetch.mockResolvedValue(new Response(namespacedXml, { headers: { 'Content-Type': ContentType.XML } }));

		const doc = await transportr.getXml('/test') as Document;

		expect(doc.documentElement.namespaceURI).toBe('urn:example:catalog');
		expect(doc.getElementsByTagNameNS('urn:example:catalog', 'item')[0]?.textContent).toBe('Kind of Blue');
	});

	it('should strip event handler attributes from XML without discarding the element', async () => {
		const xmlWithHandler = '<root><node onclick="alert(1)" data-keep="yes">text</node></root>';
		mockFetch.mockResolvedValue(new Response(xmlWithHandler, { headers: { 'Content-Type': ContentType.XML } }));

		const doc = await transportr.getXml('/test') as Document;
		const node = doc.querySelector('node');

		expect(node?.textContent).toBe('text');
		expect(node?.getAttribute('data-keep')).toBe('yes');
		expect(node?.getAttribute('onclick')).toBeNull();
	});

	it('should sanitize XML the same way when the strict preset is requested explicitly', async () => {
		const xml = '<root><node id="1">text</node><script>alert(1)</script></root>';
		mockFetch.mockResolvedValue(new Response(xml, { headers: { 'Content-Type': ContentType.XML } }));

		const doc = await transportr.getXml('/test', { sanitizePreset: 'strict' }) as Document;

		expect(doc.querySelector('node')?.getAttribute('id')).toBe('1');
		expect(doc.querySelector('script')).toBeNull();
	});

	it.each([ 'SCRIPT', 'ScRiPt', 'IFRAME', 'Object', 'EMBED', 'Base' ])('should strip unsafe XML elements spelled as <%s>', async (tagName) => {
		const xml = `<root><${tagName}>payload</${tagName}><keep>ok</keep></root>`;
		mockFetch.mockResolvedValue(new Response(xml, { headers: { 'Content-Type': ContentType.XML } }));

		const doc = await transportr.getXml('/test') as Document;

		expect(doc.getElementsByTagName(tagName)).toHaveLength(0);
		expect(doc.querySelector('keep')?.textContent).toBe('ok');
	});

	it('should strip case-varied event handler attributes from XML', async () => {
		const xml = '<root><node onClick="alert(1)" ONERROR="alert(2)" data-keep="yes">text</node></root>';
		mockFetch.mockResolvedValue(new Response(xml, { headers: { 'Content-Type': ContentType.XML } }));

		const node = (await transportr.getXml('/test') as Document).querySelector('node');

		expect(node?.getAttribute('data-keep')).toBe('yes');
		expect(node?.getAttribute('onClick')).toBeNull();
		expect(node?.getAttribute('ONERROR')).toBeNull();
	});

	describe('selectors', () => {
		it('should return the matching element from an HTML document', async () => {
			mockFetch.mockResolvedValue(new Response('<html><body><p class="target">found</p></body></html>', { headers: { 'Content-Type': ContentType.HTML } }));

			const element = await transportr.getHtml('/test', {}, '.target') as Element;

			expect(element.textContent).toBe('found');
		});

		it('should return null when the HTML selector matches nothing', async () => {
			mockFetch.mockResolvedValue(new Response('<html><body><p>content</p></body></html>', { headers: { 'Content-Type': ContentType.HTML } }));

			await expect(transportr.getHtml('/test', {}, '.missing')).resolves.toBeNull();
		});

		it('should return the matching element from an HTML fragment', async () => {
			mockFetch.mockResolvedValue(new Response('<span class="target">found</span>', { headers: { 'Content-Type': ContentType.HTML } }));

			const element = await transportr.getHtmlFragment('/test', {}, '.target') as Element;

			expect(element.textContent).toBe('found');
		});

		it('should return null when the fragment selector matches nothing', async () => {
			mockFetch.mockResolvedValue(new Response('<span>content</span>', { headers: { 'Content-Type': ContentType.HTML } }));

			await expect(transportr.getHtmlFragment('/test', {}, '.missing')).resolves.toBeNull();
		});
	});

	describe('options as the first argument', () => {
		it('should apply options passed to getHtml without a path', async () => {
			mockFetch.mockResolvedValue(new Response('<p>Hello</p><script>alert(1)</script>', { headers: { 'Content-Type': ContentType.HTML } }));

			const doc = await transportr.getHtml({ sanitizePreset: 'bypass' }) as Document;

			expect(doc.querySelector('p')?.textContent).toBe('Hello');
			expect(doc.querySelector('script')).not.toBeNull();
		});

		it('should apply options passed to getHtmlFragment without a path', async () => {
			mockFetch.mockResolvedValue(new Response('<p>Hello</p><script>alert(1)</script>', { headers: { 'Content-Type': ContentType.HTML } }));

			const fragment = await transportr.getHtmlFragment({ sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment.querySelector('p')?.textContent).toBe('Hello');
			expect(fragment.querySelector('script')).not.toBeNull();
		});

		it('should apply options passed to getXml without a path', async () => {
			mockFetch.mockResolvedValue(new Response('<root><script>alert(1)</script></root>', { headers: { 'Content-Type': ContentType.XML } }));

			const doc = await transportr.getXml({ sanitizePreset: 'bypass' }) as Document;

			expect(doc.querySelector('script')).not.toBeNull();
		});

		it('should still sanitize when options are passed without a path', async () => {
			mockFetch.mockResolvedValue(new Response('<p>Hello</p><script>alert(1)</script>', { headers: { 'Content-Type': ContentType.HTML } }));

			const doc = await transportr.getHtml({ timeout: 5000 }) as Document;

			expect(doc.querySelector('p')?.textContent).toBe('Hello');
			expect(doc.querySelector('script')).toBeNull();
		});
	});

	it('should handle and sanitize HTML fragments', async () => {
		const maliciousFragment = '<b>Bold</b><img src="x" onerror="alert(\'XSS\')">';
		const mockResponse = new Response(maliciousFragment, {
			headers: { 'Content-Type': ContentType.HTML }
		});
		mockFetch.mockResolvedValue(mockResponse);

		const fragment = await transportr.getHtmlFragment('/test') as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		expect(fragment.querySelector('b')).not.toBeNull();
		// DOMPurify removes the onerror attribute
		const img = fragment.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.hasAttribute('onerror')).toBe(false);
	});

	it('should strip script tags from HTML fragments by default', async () => {
		const htmlWithScript = '<p>Hello</p><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(htmlWithScript, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test') as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		expect(fragment.querySelector('p')?.textContent).toBe('Hello');
		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should strip stylesheet links by default', async () => {
		const htmlWithStyles = '<div>Welcome</div><link rel="stylesheet" href="/app.css"><style>.hero{display:block}</style>';
		mockFetch.mockResolvedValue(new Response(htmlWithStyles, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/styles-default') as Document;

		expect(doc.querySelector('div')?.textContent).toBe('Welcome');
		expect(doc.querySelector('link')).toBeNull();
	});

	it('should preserve all content including scripts and event handlers when sanitizePreset is bypass', async () => {
		const trustedHtml = '<p onclick="handleClick()">Hello</p><script src="/app.js" type="text/javascript"></script>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		// bypass skips DOMPurify entirely — all content including event handlers is preserved
		expect(fragment.querySelector('p')?.getAttribute('onclick')).toBe('handleClick()');
		const script = fragment.querySelector('script');
		expect(script).not.toBeNull();
		expect(script?.getAttribute('src')).toBe('/app.js');
		expect(script?.getAttribute('type')).toBe('text/javascript');
	});

	it('should preserve script-only HTML fragments when sanitizePreset is bypass', async () => {
		const trustedHtml = '<script>window.__transportr = true;</script>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		const script = fragment.querySelector('script');
		expect(script).not.toBeNull();
		expect(script?.textContent).toContain('window.__transportr = true;');
	});

	it('should preserve template scripts while still sanitizing unsafe attributes via sanitization policy', async () => {
		const html = '<p onclick="run()">Hello</p><script id="tmpl" type="text/x-jquery-tmpl"><div>{{each items}}<span>${$value}</span>{{/each}}</div></script><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', {
			sanitization: {
				preserveTemplateScripts: true
			}
		}) as DocumentFragment;

		expect(fragment.querySelector('p')?.getAttribute('onclick')).toBeNull();
		expect(fragment.querySelectorAll('script')).toHaveLength(1);
		expect(fragment.querySelector('#tmpl')?.getAttribute('type')).toBe('text/x-jquery-tmpl');
		expect(fragment.querySelector('#tmpl')?.textContent).toContain('each items');
	});

	it('should preserve custom inert template script types via sanitization policy', async () => {
		const html = '<p onclick="run()">Hello</p><script id="custom" type="text/x-my-template"><div>{{ value }}</div></script><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', {
			sanitization: {
				templateScriptTypes: [ 'text/x-my-template' ]
			}
		}) as DocumentFragment;

		expect(fragment.querySelector('p')?.getAttribute('onclick')).toBeNull();
		expect(fragment.querySelectorAll('script')).toHaveLength(1);
		expect(fragment.querySelector('#custom')?.getAttribute('type')).toBe('text/x-my-template');
		expect(fragment.querySelector('#custom')?.textContent).toContain('{{ value }}');
	});

	it('should preserve leading script tags in HTML fragments when sanitizePreset is bypass', async () => {
		const trustedHtml = '<script src="/bootstrap.js"></script><p>Hello</p>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		const script = fragment.querySelector('script');
		expect(script).not.toBeNull();
		expect(script?.getAttribute('src')).toBe('/bootstrap.js');
		expect(fragment.querySelector('p')?.textContent).toBe('Hello');
	});

	it('should preserve script tags when sanitizePreset is bypass in instance defaults', async () => {
		const trustedHtml = '<p>Hello</p><script src="/bundle.js"></script>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const client = new Transportr('https://example.com', { sanitizePreset: 'bypass' });
		const fragment = await client.getHtmlFragment('/test') as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		expect(fragment.querySelector('script')).not.toBeNull();
		expect(fragment.querySelector('script')?.getAttribute('src')).toBe('/bundle.js');
	});

	it('should allow per-request sanitizePreset to override instance defaults', async () => {
		const trustedHtml = '<p>Hello</p><script src="/bundle.js"></script>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const client = new Transportr('https://example.com', { sanitizePreset: 'bypass' });
		const fragment = await client.getHtmlFragment('/test', { sanitizePreset: 'strict' }) as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should preserve script tags when sanitizePreset is bypass via configure()', async () => {
		const trustedHtml = '<p>Hello</p><script src="/configured.js"></script>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const client = new Transportr('https://example.com').configure({ sanitizePreset: 'bypass' });
		const fragment = await client.getHtmlFragment('/test') as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		expect(fragment.querySelector('script')).not.toBeNull();
		expect(fragment.querySelector('script')?.getAttribute('src')).toBe('/configured.js');
	});

	it('should support sanitizePreset bypass for fragments', async () => {
		const trustedHtml = '<p onclick="run()">Hello</p><script src="/preset.js"></script>';
		mockFetch.mockResolvedValue(new Response(trustedHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

		expect(fragment.querySelector('p')?.getAttribute('onclick')).toBe('run()');
		expect(fragment.querySelector('script')?.getAttribute('src')).toBe('/preset.js');
	});

	it('should keep sanitizePreset strict as default sanitization behavior for fragments', async () => {
		const html = '<p>Hello</p><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'strict' }) as DocumentFragment;

		expect(fragment.querySelector('p')?.textContent).toBe('Hello');
		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should prefer per-request sanitizePreset over instance sanitizePreset', async () => {
		const html = '<p>Hello</p><script src="/bundle.js"></script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const client = new Transportr('https://example.com', { sanitizePreset: 'bypass' });
		const fragment = await client.getHtmlFragment('/test', { sanitizePreset: 'strict' }) as DocumentFragment;

		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should accept sanitizePreset balanced for fragments', async () => {
		const html = '<p data-id="123">Hello</p><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'balanced' }) as DocumentFragment;

		expect(fragment.querySelector('p')?.getAttribute('data-id')).toBe('123');
		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should accept sanitizePreset relaxed for fragments', async () => {
		const html = '<p data-id="123">Hello</p><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'relaxed' }) as DocumentFragment;

		expect(fragment.querySelector('p')?.getAttribute('data-id')).toBe('123');
		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should support sanitizePreset bypass for full HTML documents', async () => {
		const html = '<h1>Hello</h1><script>window.__raw = true;</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/test', { sanitizePreset: 'bypass' }) as Document;

		expect(doc.querySelector('h1')?.textContent).toBe('Hello');
		expect(doc.querySelector('script')).not.toBeNull();
	});

	it('should strip template script tags from full HTML documents by default', async () => {
		const html = '<div>Welcome</div><script id="tmpl" type="text/x-jquery-tmpl"><span>${name}</span></script><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/template-default') as Document;

		expect(doc.querySelector('div')?.textContent).toBe('Welcome');
		expect(doc.querySelector('#tmpl')).toBeNull();
		expect(doc.querySelector('script')).toBeNull();
	});

	it('should preserve only inert template scripts for getHtml when preserveTemplateScripts is enabled', async () => {
		const html = '<div onclick="run()">Welcome</div><script id="tmpl" type="text/x-jquery-tmpl"><span>${name}</span></script><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/template-opt-in', {
			sanitization: {
				preserveTemplateScripts: true
			}
		}) as Document;

		expect(doc.querySelector('div')?.getAttribute('onclick')).toBeNull();
		expect(doc.querySelector('#tmpl')?.getAttribute('type')).toBe('text/x-jquery-tmpl');
		expect(doc.querySelector('#tmpl')?.textContent).toContain('${name}');
		expect(doc.querySelectorAll('script')).toHaveLength(1);
	});

	it('should preserve script tags for full HTML documents when sanitization.allowScripts is enabled', async () => {
		const html = '<p onclick="run()">Hello</p><a id="link" href="javascript:run()">Run</a><script src="/trusted.js"></script><iframe src="https://evil.example"></iframe>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/test', {
			sanitization: {
				allowScripts: true
			}
		}) as Document;

		expect(doc.querySelector('script')?.getAttribute('src')).toBe('/trusted.js');
		expect(doc.querySelector('p')?.getAttribute('onclick')).toBe('run()');
		expect(doc.querySelector('#link')?.getAttribute('href')).toBe('javascript:run()');
		// Non-JS unsafe markup should still be sanitized away.
		expect(doc.querySelector('iframe')).toBeNull();
	});

	it('should preserve markup-like inline script content when sanitization.allowScripts is enabled', async () => {
		const html = '<script>const t = "<div>x</div>"; if (1 < 2) { console.log(t); }</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/markup-like-script', {
			sanitization: {
				allowScripts: true
			}
		}) as Document;

		expect(doc.querySelector('script')?.textContent).toBe('const t = "<div>x</div>"; if (1 < 2) { console.log(t); }');
	});

	it('should preserve template script tags for full HTML documents when sanitization.allowScripts is enabled', async () => {
		const html = '<div>Welcome</div><script id="tmpl" type="text/x-jquery-tmpl"><span>${name}</span></script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/template', {
			sanitization: {
				allowScripts: true
			}
		}) as Document;

		expect(doc.querySelector('div')?.textContent).toBe('Welcome');
		expect(doc.querySelector('#tmpl')?.getAttribute('type')).toBe('text/x-jquery-tmpl');
		expect(doc.querySelector('#tmpl')?.textContent).toContain('${name}');
	});

	it('should preserve template script tags for HTML fragments when sanitization.allowScripts is enabled', async () => {
		const html = '<div>Welcome</div><script id="tmpl" type="text/x-jquery-tmpl"><span>${name}</span></script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/template', {
			sanitization: {
				allowScripts: true
			}
		}) as DocumentFragment;

		expect(fragment.querySelector('div')?.textContent).toBe('Welcome');
		expect(fragment.querySelector('#tmpl')?.getAttribute('type')).toBe('text/x-jquery-tmpl');
		expect(fragment.querySelector('#tmpl')?.textContent).toContain('${name}');
	});

	it('should continue stripping scripts by default after an allowScripts request', async () => {
		mockFetch.mockResolvedValueOnce(new Response(
			'<p>Trusted</p><script src="/trusted.js"></script>',
			{ headers: { 'Content-Type': ContentType.HTML } }
		));

		const trustedDoc = await transportr.getHtml('/trusted', {
			sanitization: {
				allowScripts: true
			}
		}) as Document;
		expect(trustedDoc.querySelector('script')).not.toBeNull();

		mockFetch.mockResolvedValueOnce(new Response(
			'<p>Hello</p><script>alert("XSS")</script>',
			{ headers: { 'Content-Type': ContentType.HTML } }
		));

		const strictDoc = await transportr.getHtml('/untrusted') as Document;
		expect(strictDoc.querySelector('p')?.textContent).toBe('Hello');
		expect(strictDoc.querySelector('script')).toBeNull();
	});

	it('should preserve link tags when allowStyles is enabled', async () => {
		const html = '<div>Welcome</div><link rel="stylesheet" href="/app.css"><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/link-tags', {
			sanitization: {
				allowStyles: true
			}
		}) as Document;

		expect(doc.querySelector('div')?.textContent).toBe('Welcome');
		expect(doc.querySelector('link')?.getAttribute('href')).toBe('/app.css');
		expect(doc.querySelector('script')).toBeNull();
	});

	it('should strip non-stylesheet link tags when allowStyles is enabled', async () => {
		const html = '<div>Welcome</div><link rel="preload" href="/app.css" as="style"><link rel="stylesheet" href="/theme.css">';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/style-links', {
			sanitization: {
				allowStyles: true
			}
		}) as Document;

		expect(doc.querySelector('div')?.textContent).toBe('Welcome');
		expect(doc.querySelector('link[rel="preload"]')).toBeNull();
		expect(doc.querySelector('link[rel="stylesheet"]')?.getAttribute('href')).toBe('/theme.css');
	});

	it('should preserve style tags when allowStyles is enabled', async () => {
		const html = '<div>Welcome</div><style>.hero{display:block}</style><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/style-tags', {
			sanitization: {
				allowStyles: true
			}
		}) as Document;

		expect(doc.querySelector('div')?.textContent).toBe('Welcome');
		expect(doc.querySelector('style')?.textContent).toContain('.hero');
		expect(doc.querySelector('script')).toBeNull();
	});

	it('should preserve inline style attributes when allowStyles is enabled', async () => {
		const html = '<div style="color:red;display:block" onclick="run()">Welcome</div><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/style-attrs', {
			sanitization: {
				allowStyles: true
			}
		}) as Document;

		expect(doc.querySelector('div')?.getAttribute('style')).toContain('color:red');
		expect(doc.querySelector('div')?.getAttribute('onclick')).toBeNull();
		expect(doc.querySelector('script')).toBeNull();
	});

	it('should preserve stylesheet links, style tags, and style attributes for HTML fragments when allowStyles is enabled', async () => {
		const html = '<div style="color:red">Welcome</div><link rel="stylesheet" href="/app.css"><style>.hero{display:block}</style><script>alert("XSS")</script>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/style-fragment', {
			sanitization: {
				allowStyles: true
			}
		}) as DocumentFragment;

		expect(fragment.querySelector('div')?.getAttribute('style')).toContain('color:red');
		expect(fragment.querySelector('link')?.getAttribute('href')).toBe('/app.css');
		expect(fragment.querySelector('style')?.textContent).toContain('.hero');
		expect(fragment.querySelector('script')).toBeNull();
	});

	it('should preserve stylesheet links whose rel attribute has multiple tokens when allowStyles is enabled', async () => {
		const html = '<link rel="stylesheet preload" href="/a.css"><link rel="preload stylesheet" href="/b.css"><link rel="preload" href="/c.css" as="style">';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/multi-token-rel', {
			sanitization: {
				allowStyles: true
			}
		}) as DocumentFragment;

		const links = fragment.querySelectorAll('link');
		expect(links).toHaveLength(2);
		expect(links[0]?.getAttribute('href')).toBe('/a.css');
		expect(links[1]?.getAttribute('href')).toBe('/b.css');
	});

	it('should preserve <head> content when fetching a full HTML document', async () => {
		const html = '<!DOCTYPE html><html><head><title>T</title></head><body><div>Hi</div></body></html>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const doc = await transportr.getHtml('/full-page') as Document;

		expect(doc.querySelector('title')?.textContent).toBe('T');
		expect(doc.querySelector('div')?.textContent).toBe('Hi');
	});

	it('should preserve stylesheet links when a full HTML page is fetched as a fragment', async () => {
		const html = '<!DOCTYPE html><html><head><link rel="stylesheet" href="/app.css"><style>.hero{display:block}</style></head><body><div>Hi</div></body></html>';
		mockFetch.mockResolvedValue(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));

		const fragment = await transportr.getHtmlFragment('/full-page', {
			sanitization: { allowStyles: true }
		}) as DocumentFragment;

		expect(fragment.querySelector('link')?.getAttribute('href')).toBe('/app.css');
		expect(fragment.querySelector('style')?.textContent).toContain('.hero');
		expect(fragment.querySelector('div')?.textContent).toBe('Hi');
	});

	it('should strip non-style <head>-only content (meta, base) while keeping title when fetching a full page as a fragment', async () => {
		const html = '<!DOCTYPE html><html><head><title>T</title><meta charset="utf-8"><base href="/base/"><link rel="stylesheet" href="/app.css"></head><body><div>Hi</div></body></html>';

		mockFetch.mockResolvedValueOnce(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));
		const strictFragment = await transportr.getHtmlFragment('/full-page') as DocumentFragment;
		expect(strictFragment.querySelector('title')?.textContent).toBe('T');
		expect(strictFragment.querySelector('meta')).toBeNull();
		expect(strictFragment.querySelector('base')).toBeNull();
		expect(strictFragment.querySelector('link')).toBeNull();

		mockFetch.mockResolvedValueOnce(new Response(html, {
			headers: { 'Content-Type': ContentType.HTML }
		}));
		const stylesFragment = await transportr.getHtmlFragment('/full-page', {
			sanitization: { allowStyles: true }
		}) as DocumentFragment;
		expect(stylesFragment.querySelector('title')?.textContent).toBe('T');
		expect(stylesFragment.querySelector('meta')).toBeNull();
		expect(stylesFragment.querySelector('base')).toBeNull();
		expect(stylesFragment.querySelector('link')?.getAttribute('href')).toBe('/app.css');
	});

	it('should handle blob responses', async () => {
		const expectedBlob = new Blob(['test data'], { type: 'application/octet-stream' });
		const mockResponse = {
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
			blob: vi.fn().mockResolvedValue(expectedBlob)
		};
		mockFetch.mockResolvedValue(mockResponse);

		const blob = await transportr.getBlob('/test') as Blob;

		expect(blob.size).toBe(9);
		expect(await readBlobAsText(blob)).toBe('test data');
	});

	it('should handle image responses', async () => {
		// Create a dummy 1x1 pixel PNG blob
		const pixel = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
		const buffer = new Uint8Array(pixel.length);
		for (let i = 0; i < pixel.length; i++) {
			buffer[i] = pixel.charCodeAt(i);
		}
		const blobData = new Blob([buffer], { type: 'image/png' });

		const mockResponse = {
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'image/png' }),
			blob: vi.fn().mockResolvedValue(blobData)
		};
		mockFetch.mockResolvedValue(mockResponse);

		// jsdom doesn't fire onload for Image elements, so we simulate it
		// by patching HTMLImageElement.prototype.src descriptor to trigger onload
		const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
		Object.defineProperty(HTMLImageElement.prototype, 'src', {
			set(value: string) {
				originalDescriptor.set!.call(this, value);
				queueMicrotask(() => (this as HTMLImageElement).onload?.(new Event('load') as unknown as never));
			},
			get() { return originalDescriptor.get!.call(this) as string },
			configurable: true
		});

		const image = await transportr.getImage('/test.png') as HTMLImageElement;

		// Restore original descriptor
		Object.defineProperty(HTMLImageElement.prototype, 'src', originalDescriptor);

		expect(image).toBeInstanceOf(HTMLImageElement);
		expect(image.src).toBe('blob:mock-url');
	});

	it('should handle image load error', async () => {
		const blobData = new Blob([new Uint8Array([0])], { type: 'image/png' });
		const mockResponse = {
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'image/png' }),
			blob: vi.fn().mockResolvedValue(blobData)
		};
		mockFetch.mockResolvedValue(mockResponse);

		// Patch src setter to trigger onerror instead of onload
		const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
		Object.defineProperty(HTMLImageElement.prototype, 'src', {
			set(value: string) {
				originalDescriptor.set!.call(this, value);
				queueMicrotask(() => (this as HTMLImageElement).onerror?.('Image failed to load', '', 0, 0, new Error('Image failed to load')));
			},
			get() { return originalDescriptor.get!.call(this) as string },
			configurable: true
		});

		await expect(transportr.getImage('/bad.png')).rejects.toThrow("An error has occurred with your request to: '/bad.png'");

		// Restore original descriptor
		Object.defineProperty(HTMLImageElement.prototype, 'src', originalDescriptor);
	});
});
