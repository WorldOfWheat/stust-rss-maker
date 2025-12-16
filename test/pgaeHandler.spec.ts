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

		const content = await handlePageContent('http://example.com', 1);
		expect(content.content).toContain('This is the extracted content.');
		expect(content.index).toBe(1);

		globalThis.fetch = originalFetch;
	});

	it('extracts content with <br> tags correctly', async () => {
		const contentSpanId = 'ctl00_ContentPlaceHolder1_lbl_content';
		const mockResponse = `
      <span id="${contentSpanId}">Line 1<br>Line 2<br>Line 3</span>
    `;

		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(mockResponse, { status: 200 });

		const content = await handlePageContent('http://example.com', 1);
		expect(content.content).toContain('Line 1<br />Line 2<br />Line 3');
		expect(content.index).toBe(1);

		globalThis.fetch = originalFetch;
	});
});
