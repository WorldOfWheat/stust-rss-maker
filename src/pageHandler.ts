class ContentExtractor {
	content: string;
	constructor() {
		this.content = '';
	}

	text(text: Text) {
		if (!text.text.trim()) {
			this.content += '\n';
			return;
		}
		this.content += text.text;
	}
}

export async function handlePageContent(link: string): Promise<string> {
	const response = await fetch(link);
	const contentSpanId = 'ctl00_ContentPlaceHolder1_lbl_content';

	const data = await response.text();
	const selector = `span#${contentSpanId}`;
	const extractor = new ContentExtractor();
	const rewriter = new HTMLRewriter().on(selector, extractor);
	await rewriter.transform(new Response(data)).arrayBuffer();

	return extractor.content;
}
