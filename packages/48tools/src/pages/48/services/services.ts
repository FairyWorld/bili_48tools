import got, { Response as GotResponse } from 'got';
import { rStr } from '../../../utils/utils';
import type { LiveData } from '../types';

/* 创建请求头 */
function createHeaders(): { [key: string]: string } {
  return {
    'Content-Type': 'application/json;charset=utf-8',
    appInfo: JSON.stringify({
      vendor: 'apple',
      deviceId: `${ rStr(8) }-${ rStr(4) }-${ rStr(4) }-${ rStr(4) }-${ rStr(12) }`,
      appVersion: '6.0.16',
      appBuild: '200701',
      osVersion: '13.5.1',
      osType: 'ios',
      deviceName: 'iPhone XR',
      os: 'ios'
    }),
    'User-Agent': 'PocketFans201807/6.0.16 (iPhone; iOS 13.5.1; Scale/2.00)',
    'Accept-Language': 'zh-Hans-AW;q=1',
    Host: 'pocketapi.48.cn'
  };
}

/**
 * 获取直播和录播信息数据（https://pocketapi.48.cn/live/api/v1/live/getLiveList）
 * @param { string | number } next: 录播id分页
 * @param { boolean } inLive: 是否在直播中
 */
export async function requestLiveList(next: number | string, inLive: boolean): Promise<LiveData> {
  const body: {
    debug: boolean;
    next: string | number;
    groupId?: number;
    record?: boolean;
  } = { debug: true, next };

  if (inLive) {
    body.groupId = 0;
    body.record = false;
  }

  const res: GotResponse<LiveData> = await got('https://pocketapi.48.cn/live/api/v1/live/getLiveList', {
    method: 'POST',
    headers: createHeaders(),
    responseType: 'json',
    json: body
  });

  return res.body;
}