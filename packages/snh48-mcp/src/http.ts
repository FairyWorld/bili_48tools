import { randomUUID } from 'node:crypto';

export const DEFAULT_TIMEOUT_MS: number = 10_000;

export type JsonRecord = Record<string, unknown>;

export class UpstreamError extends Error {
  public readonly code: string;

  public readonly status?: number;

  public constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'UpstreamError';
    this.code = code;
    this.status = status;
  }
}

function createAppInfo(): string {
  return JSON.stringify({
    vendor: 'apple',
    deviceId: randomUUID(),
    appVersion: '7.0.4',
    appBuild: '23011601',
    osVersion: '16.3.1',
    osType: 'ios',
    deviceName: 'iPhone XR',
    os: 'ios'
  });
}

function createHeaders(): Headers {
  const headers: Headers = new Headers();

  headers.set('Accept', 'application/json');
  headers.set('Accept-Language', 'zh-Hans-AW;q=1');
  headers.set('Content-Type', 'application/json;charset=utf-8');
  headers.set('User-Agent', 'PocketFans201807/6.0.16 (iPhone; iOS 13.5.1; Scale/2.00)');
  headers.set('appInfo', createAppInfo());

  return headers;
}

export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller: AbortController = new AbortController();
  const timer: NodeJS.Timeout = setTimeout((): void => controller.abort(), timeoutMs);
  const headers: Headers = createHeaders();

  if (init.headers) {
    const additionalHeaders: Headers = new Headers(init.headers);

    additionalHeaders.forEach((value: string, key: string): void => {
      headers.set(key, value);
    });
  }

  try {
    const response: Response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new UpstreamError(
        'UPSTREAM_HTTP_ERROR',
        '上游接口返回 HTTP ' + response.status,
        response.status
      );
    }

    try {
      return await response.json() as T;
    } catch {
      throw new UpstreamError('UPSTREAM_INVALID_JSON', '上游接口返回了无效数据');
    }
  } catch (error: unknown) {
    if (error instanceof UpstreamError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new UpstreamError('UPSTREAM_TIMEOUT', '上游接口请求超时，请稍后重试');
    }

    throw new UpstreamError('UPSTREAM_NETWORK_ERROR', '暂时无法连接上游接口，请稍后重试');
  } finally {
    clearTimeout(timer);
  }
}

export function postJson<T>(
  url: string,
  body: JsonRecord,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return requestJson<T>(
    url,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    timeoutMs
  );
}
