function escapeHTML(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export class ContentData {
	content: string;
	index: number;

	constructor(content: string, index: number) {
		this.content = escapeHTML(content).replace(/\n/g, '<br />');
		this.index = index;
	}
}
