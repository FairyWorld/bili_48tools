import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { requestJson } from './http';

describe('HTTP 请求封装', (): void => {
  afterEach((): void => {
    jest.restoreAllMocks();
  });

  test('HTTP 非成功状态转换为安全错误', async (): Promise<void> => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'failure' }), {
        status: 503,
        headers: { 'content-type': 'application/json' }
      })
    );

    await expect(requestJson('https://example.invalid/api')).rejects.toMatchObject({
      code: 'UPSTREAM_HTTP_ERROR',
      status: 503,
      message: '上游接口返回 HTTP 503'
    });
  });

  test('请求超时转换为错误', async (): Promise<void> => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        await Promise.resolve();

        return new Promise<Response>((
          _resolve: (value: Response | PromiseLike<Response>) => void,
          reject: (reason?: unknown) => void
        ): void => {
          init?.signal?.addEventListener('abort', (): void => {
            const abortError: Error = new Error('aborted');

            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      }
    );

    await expect(requestJson('https://example.invalid/api', {}, 1)).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT'
    });
  });
});
