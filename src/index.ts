import dayjs, { Dayjs } from 'dayjs';
import { handlePageContent } from './pageHandler';
import { Feed } from 'feed';
import { LinkData } from './types/linkData';
import { ContentData } from './types/contentData';

class DateExtractor {
	dateTextList: Dayjs[];
	constructor() {
		this.dateTextList = [];
	}

	text(element: Text) {
		const text = element.text.trim();
		const date = dayjs(text, 'YYYY/MM/DD');
		if (date.isValid()) {
			this.dateTextList.push(date);
		}
	}
}

class LinkExtractor {
	linkDataList: LinkData[];

	constructor() {
		this.linkDataList = [];
	}

	// 處理匹配的 a 元素
	async element(element: Element) {
		const title = element.getAttribute('title');
		const href = element.getAttribute('href');

		if (title && href) {
			const newHref = href.replace('../', 'https://news.stust.edu.tw/');
			this.linkDataList.push(new LinkData(title, newHref));
		}
	}
}

async function makeLinkDataList(data: string): Promise<LinkData[]> {
	const selector = 'table.striped.bordered a';
	const linkExtractor = new LinkExtractor();
	const rewriter = new HTMLRewriter().on(selector, linkExtractor);
	await rewriter.transform(new Response(data)).arrayBuffer();

	return linkExtractor.linkDataList;
}

async function makeDateList(data: string, length: number): Promise<Dayjs[]> {
	const dateList: Dayjs[] = [];
	for (let i = 0; i < length; i++) {
		const index = (i + 1).toString().padStart(2, '0');
		const selector = `table.striped.bordered span#ctl00_ContentPlaceHolder1_Repeater1_ctl${index}_lbl_time`;
		const dateExtractor = new DateExtractor();
		const rewriter = new HTMLRewriter().on(selector, dateExtractor);
		await rewriter.transform(new Response(data)).arrayBuffer();
		dateList.push(...dateExtractor.dateTextList);
	}

	return dateList;
}

export default {
	async fetch(request, env: Env, ctx): Promise<Response> {
		const method = request.method;
		if (method !== 'GET') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		const urlToFetch = 'https://news.stust.edu.tw/User/RwdNewsList.aspx';
		const response = await fetch(urlToFetch);

		if (!response.ok) {
			console.error('Fetch failed with status:', response.status);
			return new Response('Failed to fetch data', { status: 500 });
		}

		const data = await response.text();
		const linkDataList = await makeLinkDataList(data);
		const linkDataLength = linkDataList.length;
		const dateList = await makeDateList(data, linkDataLength);
		const contentModeToken = request.headers.get('content-mode-token') || null;
		let contentDataList: ContentData[] = [];

		if (contentModeToken === env.content_mode_secret) {
			const contentDataPromises: Promise<ContentData>[] = [];
			for (let i = 0; i < linkDataLength; i++) {
				const linkData = linkDataList[i];
				contentDataPromises.push(handlePageContent(linkData.link, i));
			}

			contentDataList = await Promise.all(contentDataPromises);
			contentDataList.sort((a, b) => a.index - b.index);
		} else {
			contentDataList = linkDataList.map(() => new ContentData('', -1));
		}

		const feed = new Feed({
			title: 'STUST 布告欄 RSS',
			description: '南臺科技大學布告欄最新消息',
			id: urlToFetch,
			link: urlToFetch,
			language: 'zh-TW',
			image: 'https://www.stust.edu.tw/tc/images/about/logo.png',
			favicon: 'https://www.stust.edu.tw/tc/images/stustico.ico',
			copyright: 'All rights reserved 2025, 小麥',
			author: {
				name: '小麥',
				email: 'a302854888@gmail.com',
				link: 'https://github.com/WorldOfWheat',
			},
		});

		for (let i = 0; i < linkDataList.length; i++) {
			const linkData = linkDataList[i];
			const pubDate = dateList[i].toDate();

			feed.addItem({
				title: linkData.title,
				id: linkData.title,
				link: linkData.link,
				content: contentDataList[i].content,
				date: pubDate,
			});
		}

		return new Response(feed.rss2(), {
			headers: {
				'Content-Type': 'application/rss+xml; charset=utf-8',
			},
		});
	},
} satisfies ExportedHandler<Env>;
