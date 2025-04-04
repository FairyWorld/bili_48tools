export function ffmpegHeaders(): string {
  return 'Referer: https://live.bilibili.com\r\n';
}

/**
 * 判断是否为B站CDN地址
 * 境内地址：https://cn-hljheb-ct-01-02.bilivideo.com/live-bvc/487336/live_6210612_9429608.flv
 * 境外地址：https://d1--ov-gotcha07.bilivideo.com/live-bvc/450162/live_6210612_9429608.flv
 * @param { string } u
 */
export function isCNCdnHost(u: string): boolean {
  const url: URL = new URL(u);

  return /cn/i.test(url.host);
}

export const localStorageKey: string = 'BILIBILI_AUTO_RECORD_SAVE_PATH';