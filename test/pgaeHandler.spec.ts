import { describe, it, expect } from 'vitest';
import { handlePageContent } from '../src/pageHandler';

describe('handlePage', () => {
	it('extracts content from the page', async () => {
		const contentSpanId = 'ctl00_ContentPlaceHolder1_lbl_content';
		const mockResponse = `
      <span id="${contentSpanId}">This is the extracted content.</span>
    `;

		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(mockResponse, { status: 200 });

		const content = await handlePageContent('http://example.com');
		expect(content).toContain('This is the extracted content.');

		globalThis.fetch = originalFetch;
	});

	it('extracts content with <br> tags correctly', async () => {
		const contentSpanId = 'ctl00_ContentPlaceHolder1_lbl_content';
		const mockResponse = `
      <span id="${contentSpanId}">Line 1<br>Line 2<br>Line 3</span>
    `;

		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(mockResponse, { status: 200 });

		const content = await handlePageContent('http://example.com');
		expect(content).toContain('Line 1\nLine 2\nLine 3');

		globalThis.fetch = originalFetch;
	});
});
