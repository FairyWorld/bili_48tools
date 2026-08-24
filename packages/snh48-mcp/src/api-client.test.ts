import { describe, expect, test } from '@jest/globals';
import { Snh48ApiClient } from './api-client';
import { UpstreamError } from './http';

interface RequestCapture {
  url: string;
  body: Record<string, unknown>;
}

describe('Snh48ApiClient', (): void => {
  test('直播请求使用 SNH48 分组和分页游标', async (): Promise<void> => {
    const requests: RequestCapture[] = [];
    const client: Snh48ApiClient = new Snh48ApiClient({
      postJson: async (url: string, body: Record<string, unknown>): Promise<unknown> => {
        requests.push({ url, body });

        await Promise.resolve();

        return {
          content: {
            liveList: [
              {
                liveId: 'live-1',
                title: '测试直播',
                ctime: '2026-08-24 12:00:00',
                status: 2,
                userInfo: {
                  userId: 'member-1',
                  nickname: '测试成员'
                }
              }
            ],
            next: 'live-2'
          }
        };
      }
    });

    const result: Awaited<ReturnType<Snh48ApiClient['listLive']>> = await client.listLive({
      status: 'live',
      groupId: 10,
      next: 'live-0'
    });

    expect(requests[0]).toEqual({
      url: 'https://pocketapi.48.cn/live/api/v1/live/getLiveList',
      body: {
        debug: true,
        next: 'live-0',
        groupId: 10,
        record: false
      }
    });
    expect(result.next).toBe('live-2');
    expect(result.items[0]?.memberName).toBe('测试成员');
    expect(result.items[0]?.status).toBe('live');
  });

  test('公演录播请求使用数字分页游标', async (): Promise<void> => {
    const requests: RequestCapture[] = [];
    const client: Snh48ApiClient = new Snh48ApiClient({
      postJson: async (url: string, body: Record<string, unknown>): Promise<unknown> => {
        requests.push({ url, body });

        await Promise.resolve();

        return {
          content: {
            liveList: [{ liveId: 'performance-1', title: '测试公演', status: 1 }],
            next: '8'
          }
        };
      }
    });

    const result: Awaited<ReturnType<Snh48ApiClient['listPerformances']>> = await client.listPerformances({
      groupId: 10,
      next: '7',
      record: true
    });

    expect(requests[0]?.body).toEqual({
      debug: false,
      groupId: 10,
      next: 7,
      record: true
    });
    expect(result.next).toBe('8');
    expect(result.items[0]?.status).toBe('recording');
  });

  test('直播详情不会暴露播放流地址', async (): Promise<void> => {
    const client: Snh48ApiClient = new Snh48ApiClient({
      postJson: async (): Promise<unknown> => {
        await Promise.resolve();

        return {
          content: {
            liveId: 'live-1',
            title: '详情',
            ctime: '2026-08-24 12:00:00',
            status: 2,
            playStreamPath: 'https://example.invalid/stream',
            user: {
              userId: 'member-1',
              userName: '成员'
            }
          }
        };
      }
    });

    const result: Awaited<ReturnType<Snh48ApiClient['getLiveDetail']>> = await client.getLiveDetail('live-1');

    expect(result.memberName).toBe('成员');
    expect(result).not.toHaveProperty('playStreamPath');
  });

  test('上游错误保留结构化错误类型', async (): Promise<void> => {
    const client: Snh48ApiClient = new Snh48ApiClient({
      postJson: async (): Promise<unknown> => {
        await Promise.resolve();

        throw new UpstreamError('UPSTREAM_HTTP_ERROR', '上游接口返回 HTTP 503', 503);
      }
    });

    await expect(client.listLive({
      status: 'live',
      groupId: 10
    })).rejects.toMatchObject({
      code: 'UPSTREAM_HTTP_ERROR',
      status: 503
    });
  });

  test('接口返回 success=false 时转换为安全错误', async (): Promise<void> => {
    const client: Snh48ApiClient = new Snh48ApiClient({
      postJson: (): Promise<unknown> => Promise.resolve({
        success: false,
        message: '内部信息不应泄露'
      })
    });

    await expect(client.listPerformances({
      groupId: 10,
      record: false
    })).rejects.toMatchObject({
      code: 'UPSTREAM_API_ERROR',
      message: 'SNH48 接口返回错误'
    });
  });
});
