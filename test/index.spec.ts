import { createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const mockListResponse = `
		<table class="striped bordered">
			<tr>
				<td>
					<a title="A1" href="link1">link1</a>
				</td>
				<td>
					<span id="ctl00_ContentPlaceHolder1_Repeater1_ctl01_lbl_time">
						2024/06/01
					</span>
				</td>
			</tr>
			<tr>
				<td>
					<a title="A2" href="link2">link2</a>
				</td>
				<td>
					<span id="ctl00_ContentPlaceHolder1_Repeater1_ctl02_lbl_time">
						2024/06/02
					</span>
				</td>
			</tr>
		</table>
		`;

const mockContentResponse = `
		<span id="ctl00_ContentPlaceHolder1_lbl_content">
			This is the content of the page.
		</span>
		`;

const env: Env = {
	content_mode_secret: 'supersecrettoken',
};

describe('worker', () => {
	it('handles non-GET requests with 405', async () => {
		const request = new IncomingRequest('http://example.com', {
			method: 'POST',
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(405);
	});

	it('handles fetch failure with 500', async () => {
		// Temporarily override fetch to simulate a failure
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(null, { status: 500 });

		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(500);

		// Restore original fetch
		globalThis.fetch = originalFetch;
	});

	it('handles GET requests with content mode token', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async (input: URL | RequestInfo) => {
			if (typeof input === 'string' && input.includes('RwdNewsList.aspx')) {
				return new Response(mockListResponse, { status: 200 });
			} else {
				return new Response(mockContentResponse, { status: 200 });
			}
		};

		const request = new IncomingRequest('http://example.com', {
			headers: {
				'content-mode-token': env.content_mode_secret,
			},
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.text();
		expect(data).toContain('<item>');
		expect(data).toContain('<content:encoded>');

		globalThis.fetch = originalFetch;
	});

	it('handles GET requests without content mode token', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async (input: URL | RequestInfo) => {
			if (input.toString().includes('RwdNewsList.aspx')) {
				return new Response(mockListResponse, { status: 200 });
			} else {
				return new Response(mockContentResponse, { status: 200 });
			}
		};

		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.text();
		expect(data).toContain('<item>');
		expect(data).not.toContain('<content:encoded>');

		globalThis.fetch = originalFetch;
	});
});
