import { JSDOM, DOMWindow } from 'jsdom';
import { requestFetchHtml, requestStreamInfo } from '../services/live48';
import type { LiveStreamInfo } from '../services/interface';

const LIVE_TYPE: Array<string> = ['snh48', 'bej48', 'gnz48', 'shy48', 'ckg48'];

/**
 * 获取网站首页地址
 * @param { string } type: 团体
 */
export function getLiveIndexUrl(type: string): string {
  const index: number = LIVE_TYPE.indexOf(type) + 1;

  return `https://live.48.cn/Index/main/club/${ index }`;
}

/**
 * 解析网站直播地址
 * @param { string } type: 团体
 */
export async function parseInLive(type: string): Promise<Array<{ label: string; value: string }>> {
  const indexUrl: string = getLiveIndexUrl(type);
  const html: string = await requestFetchHtml(indexUrl);
  const { window }: JSDOM = new JSDOM(html);
  const { document }: DOMWindow = window;
  const watchcontent: NodeListOf<HTMLDivElement> = document.querySelectorAll<HTMLDivElement>('.watchcontent');
  const result: Array<{ label: string; value: string }> = [];

  for (const item of watchcontent) {
    const vText: HTMLDivElement = item.querySelector<HTMLDivElement>('.v-text')!;
    const title: string = vText.querySelector('h2')!.innerHTML;
    const sid: string = vText.querySelector('a')!.getAttribute('sid')!;

    result.push({ label: title, value: sid });
  }

  return result;
}

/**
 * 获取直播地址
 * @param { string } id: 直播id
 * @param { string } quality: 直播画质
 */
export async function parseLiveUrl(id: string, quality: string): Promise<string | null> {
  const html: string = await requestFetchHtml(`https://live.48.cn/Index/inlive/id/${ id }`);
  const { window }: JSDOM = new JSDOM(html);
  const { document }: DOMWindow = window;
  const urlInput: HTMLElement | null = document.getElementById(`${ quality }_url`);

  // 没有直播
  if (!urlInput) {
    return null;
  }

  const param: string = document.getElementById('param')!.getAttribute('value')!;
  const video_id: string = document.getElementById('vedio_id')!.getAttribute('value')!;
  const suid: string = document.getElementById('suid')!.getAttribute('value')!;
  const res: LiveStreamInfo = await requestStreamInfo(param, video_id, suid, id);

  if (quality === 'liuchang') {
    return res.lc_url;
  } else {
    return res.url;
  }
}