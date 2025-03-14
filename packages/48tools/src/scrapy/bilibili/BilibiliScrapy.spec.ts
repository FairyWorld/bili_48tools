import type { WebInterfaceViewData, RequestVideoInfoArgumentObject, VideoInfo, AudioInfo, BangumiWebSeason } from '@48tools-api/bilibili/download';
import * as x$webInterface$view__bvid_BV1og4y187vP from '__mocks__/services/bilibili/x$web-interface$view@bvid=BV1og4y187vP.mockdata.json';
import * as x$player$playUrl__bvid_BV1og4y187vP_cid_185864709 from '__mocks__/services/bilibili/x$player$playurl@bvid=BV1og4y187vP#cid=185864709.mockdata.json';
import * as audio$musicServiceC$url__songid_590187 from '__mocks__/services/bilibili/audio$music-service-c$ur@songid=590187.mockdata.json';
import * as pgc$view$web$season__ep_id_476665 from '__mocks__/services/bilibili/pgc$view$web$season@ep_id=476665.mockdata.json';
import * as x$player$playUrl__bvid_BV1BP4y1K7cC_cid_566153909 from '__mocks__/services/bilibili/x$player$playurl@bvid=BV1BP4y1K7cC#cid=566153909.mockdata.json';

/**
 * 将json的类型转换，修复某些类型对不上的问题
 * @param { any } x
 */
function jsonTypeTransform<T>(x: any): T {
  return x;
}

jest.mock('@48tools-api/bilibili/live', (): {} => ({}));
jest.mock('@48tools-api/bilibili/download', (): {
  requestWebInterfaceView(): Promise<WebInterfaceViewData>;
  requestVideoInfo(x: RequestVideoInfoArgumentObject): Promise<VideoInfo>;
  requestAudioInfo(): Promise<AudioInfo>;
  requestBangumiWebSeason(): Promise<BangumiWebSeason>;
} => ({
  requestWebInterfaceView: (): Promise<WebInterfaceViewData> => Promise.resolve(jsonTypeTransform<WebInterfaceViewData>(x$webInterface$view__bvid_BV1og4y187vP)),
  requestVideoInfo({ type, id, cid, proxy, isDash }: RequestVideoInfoArgumentObject): Promise<VideoInfo> {
    if (id === 'BV1BP4y1K7cC') {
      return Promise.resolve(x$player$playUrl__bvid_BV1BP4y1K7cC_cid_566153909);
    }

    return Promise.resolve(x$player$playUrl__bvid_BV1og4y187vP_cid_185864709);
  },
  requestAudioInfo: (): Promise<AudioInfo> => Promise.resolve(audio$musicServiceC$url__songid_590187),
  requestBangumiWebSeason: (): Promise<BangumiWebSeason> => Promise.resolve(pgc$view$web$season__ep_id_476665)
}));

import { BilibiliScrapy, BilibiliVideoType, type BilibiliVideoResultItem, type BilibiliVideoInfoItem } from './BilibiliScrapy';

describe('test BilibiliScrapy class', function(): void {
  /* 视频的测试 */
  describe('test parse video', function(): void {
    // 验证
    async function verify(bilibiliScrapy: BilibiliScrapy): Promise<void> {
      await bilibiliScrapy.parse();
      await bilibiliScrapy.asyncLoadVideoInfoByPage();

      const videoResultItem: BilibiliVideoResultItem = bilibiliScrapy.findVideoResult();
      const videoInfoItem: BilibiliVideoInfoItem = bilibiliScrapy.findVideoInfo();

      expect(bilibiliScrapy.videoResult.length).toBeGreaterThan(0);
      expect(bilibiliScrapy.title).toBe(x$webInterface$view__bvid_BV1og4y187vP.data.title);
      expect(videoResultItem.videoInfo.length).toBeGreaterThan(0);
      expect(videoResultItem.title).toBe(x$webInterface$view__bvid_BV1og4y187vP.data.pages[1].part);
      expect(videoResultItem.cid).toBe(x$player$playUrl__bvid_BV1og4y187vP_cid_185864709.data.last_play_cid);
      expect(videoInfoItem.videoUrl).toBe(x$player$playUrl__bvid_BV1og4y187vP_cid_185864709.data.dash.video[1].base_url);
    }

    test('should parse video when pass type and id', async function(): Promise<void> {
      const bilibiliScrapy: BilibiliScrapy = new BilibiliScrapy({
        type: BilibiliVideoType.BV,
        id: '1og4y187vP',
        page: 2
      });

      await verify(bilibiliScrapy);
    });

    test('should parse video when pass url', async function(): Promise<void> {
      const bilibiliScrapy: BilibiliScrapy = new BilibiliScrapy({
        url: 'https://www.bilibili.com/video/BV1og4y187vP?vd_source=05eaaf104a5dc003c4195bc68a59169b&spm_id_from=333.788.videopod.episodes&p=2'
      });

      await verify(bilibiliScrapy);
    });
  });

  /* 音频的测试 */
  describe('test parse audio', function(): void {
    // 验证
    async function verify(bilibiliScrapy: BilibiliScrapy): Promise<void> {
      await bilibiliScrapy.parse();

      const videoResultItem: BilibiliVideoResultItem = bilibiliScrapy.findVideoResult();
      const videoInfoItem: BilibiliVideoInfoItem = bilibiliScrapy.findVideoInfo();

      expect(bilibiliScrapy.videoResult.length).toBeGreaterThan(0);
      expect(bilibiliScrapy.title).toBe(audio$musicServiceC$url__songid_590187.data.title);
      expect(videoResultItem.title).toBe(audio$musicServiceC$url__songid_590187.data.title);
      expect(videoInfoItem).toEqual({
        videoUrl: audio$musicServiceC$url__songid_590187.data.cdns[0],
        quality: 0,
        qualityDescription: '标准'
      });
    }

    test('should parse audio when pass type and id', async function(): Promise<void> {
      const bilibiliScrapy: BilibiliScrapy = new BilibiliScrapy({
        type: BilibiliVideoType.AU,
        id: '590187'
      });

      await verify(bilibiliScrapy);
    });

    test('should parse audio when pass url', async function(): Promise<void> {
      const bilibiliScrapy: BilibiliScrapy = new BilibiliScrapy({
        url: 'https://www.bilibili.com/audio/au590187'
      });

      await verify(bilibiliScrapy);
    });
  });

  /* 番剧的测试 */
  describe('test parse bangumi', function(): void {
    // 验证
    async function verify(bilibiliScrapy: BilibiliScrapy): Promise<void> {
      await bilibiliScrapy.parse();
      await bilibiliScrapy.asyncLoadVideoInfoByPage();

      const videoResultItem: BilibiliVideoResultItem = bilibiliScrapy.findVideoResult();
      const videoInfoItem: BilibiliVideoInfoItem = bilibiliScrapy.findVideoInfo();

      expect(bilibiliScrapy.videoResult.length).toBeGreaterThan(0);
      expect(bilibiliScrapy.title).toBe(pgc$view$web$season__ep_id_476665.result.title);
      expect(videoResultItem.videoInfo.length).toBeGreaterThan(0);
      expect(videoResultItem.title).toBe(pgc$view$web$season__ep_id_476665.result.episodes[1].long_title);
      expect(x$player$playUrl__bvid_BV1BP4y1K7cC_cid_566153909.data.dash.video[1].base_url.includes(String(videoResultItem.cid))).toBeTruthy();
      expect(videoInfoItem.videoUrl).toBe(x$player$playUrl__bvid_BV1BP4y1K7cC_cid_566153909.data.dash.video[2].base_url);
    }

    test('should parse bangumi when pass type and id', async function(): Promise<void> {
      const bilibiliScrapy: BilibiliScrapy = new BilibiliScrapy({
        type: BilibiliVideoType.EP,
        id: '476664'
      });

      await verify(bilibiliScrapy);
    });

    test('should parse bangumi when pass url', async function(): Promise<void> {
      const bilibiliScrapy: BilibiliScrapy = new BilibiliScrapy({
        url: 'https://www.bilibili.com/bangumi/play/ep476664?spm_id_from=333.999.0.0&from_spmid=666.25.episode.0'
      });

      await verify(bilibiliScrapy);
    });
  });
});