import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

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

	it('handles GET requests successfully', async () => {
		const mockResponse = `
		<table class="striped bordered">
			<tr>
				<td>
					<a title="A1" href="link1">link1</a>
				</td>
				<td>2024/06/01</td>
			</tr>
			<tr>
				<td>
					<a title="A2" href="link2">link2</a>
				</td>
				<td>2024/06/02</td>
			</tr>
		</table>
		`;

		const originalFetch = globalThis.fetch;
		// globalThis.fetch = async () => new Response(mockResponse, { status: 200 });

		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.text();
		expect(data).toContain('<item>');
		console.debug(data);

		globalThis.fetch = originalFetch;
	});
});
