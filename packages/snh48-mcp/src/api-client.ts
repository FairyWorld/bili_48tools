import { postJson as requestPostJson, UpstreamError, type JsonRecord } from './http.js';
import type {
  LiveDetail,
  LiveListPage,
  LiveSummary,
  PerformanceListPage,
  PerformanceSummary
} from './types.js';

export const SNH48_API_BASE_URL: string = 'https://pocketapi.48.cn';
export const DEFAULT_SNH48_GROUP_ID: number = 10;

type PostJson = (url: string, body: JsonRecord) => Promise<unknown>;

interface ApiClientOptions {
  postJson?: PostJson;
  baseUrl?: string;
}

export interface ListLiveOptions {
  status: 'live' | 'recording';
  groupId: number;
  next?: string;
}

export interface ListPerformanceOptions {
  groupId: number;
  next?: string;
  record: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function nestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  return asRecord(record[key]);
}

function responseContent(value: unknown): Record<string, unknown> {
  const record: Record<string, unknown> = asRecord(value);
  const content: Record<string, unknown> = asRecord(record.content);

  if (Object.keys(content).length > 0) {
    return content;
  }

  const data: Record<string, unknown> = asRecord(record.data);

  return Object.keys(data).length > 0 ? data : record;
}

function assertSuccessfulResponse(value: unknown): void {
  const record: Record<string, unknown> = asRecord(value);

  if (record.success === false) {
    throw new UpstreamError('UPSTREAM_API_ERROR', 'SNH48 接口返回错误');
  }
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value: string | undefined = toStringValue(record[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed: number = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function nextValue(record: Record<string, unknown>): string {
  return firstString(record, ['next', 'nextId', 'nextTime']) ?? '0';
}

function statusValue(value: unknown, fallback: string): string {
  const numberValue: number | undefined = toNumber(value);

  if (numberValue === 2) {
    return 'live';
  }

  if (numberValue === 1 && fallback === 'recording') {
    return 'recording';
  }

  return toStringValue(value) ?? fallback;
}

function normalizeLiveItem(value: unknown, fallbackStatus: 'live' | 'recording', index: number): LiveSummary {
  const record: Record<string, unknown> = asRecord(value);
  const user: Record<string, unknown> = nestedRecord(record, 'userInfo');
  const liveId: string = firstString(record, ['liveId', 'id']) ?? String(index + 1);
  const memberName: string | undefined = firstString(user, ['nickname', 'userName', 'name'])
    ?? firstString(record, ['memberName', 'nickname', 'userName']);
  const memberId: string | undefined = firstString(user, ['userId', 'id'])
    ?? firstString(record, ['memberId', 'userId']);
  const item: LiveSummary = {
    liveId,
    title: firstString(record, ['title', 'subTitle']) ?? '未命名直播',
    time: firstString(record, ['ctime', 'stime', 'startTime']),
    status: statusValue(record.status, fallbackStatus)
  };
  const roomId: string | undefined = firstString(record, ['roomId', 'channelId']);
  const cover: string | undefined = firstString(record, ['coverPath', 'cover', 'coverUrl']);
  const liveType: number | undefined = toNumber(record.liveType);
  const liveMode: number | undefined = toNumber(record.liveMode);

  if (memberName !== undefined) item.memberName = memberName;
  if (memberId !== undefined) item.memberId = memberId;
  if (roomId !== undefined) item.roomId = roomId;
  if (cover !== undefined) item.cover = cover;
  if (liveType !== undefined) item.liveType = liveType;
  if (liveMode !== undefined) item.liveMode = liveMode;

  return item;
}

function normalizePerformanceItem(value: unknown, fallbackRecord: boolean, index: number): PerformanceSummary {
  const record: Record<string, unknown> = asRecord(value);
  const liveId: string = firstString(record, ['liveId', 'id']) ?? String(index + 1);
  const rawStatus: unknown = record.status;
  const status: string = statusValue(rawStatus, fallbackRecord ? 'recording' : 'scheduled');
  const item: PerformanceSummary = {
    liveId,
    title: firstString(record, ['title', 'name']) ?? '未命名公演',
    time: firstString(record, ['stime', 'ctime', 'startTime']),
    status
  };
  const subtitle: string | undefined = firstString(record, ['subTitle', 'subtitle']);

  if (subtitle !== undefined) item.subtitle = subtitle;

  return item;
}

export class Snh48ApiClient {
  private readonly postJson: PostJson;

  private readonly baseUrl: string;

  public constructor(options: ApiClientOptions = {}) {
    this.postJson = options.postJson ?? ((url: string, body: JsonRecord): Promise<unknown> => (
      requestPostJson<unknown>(url, body)
    ));
    this.baseUrl = options.baseUrl ?? SNH48_API_BASE_URL;
  }

  public async listLive(options: ListLiveOptions): Promise<LiveListPage> {
    const body: JsonRecord = {
      debug: true,
      next: options.next ?? '0',
      groupId: options.groupId,
      record: options.status === 'recording'
    };
    const response: unknown = await this.postJson(
      this.baseUrl + '/live/api/v1/live/getLiveList',
      body
    );

    assertSuccessfulResponse(response);
    const content: Record<string, unknown> = responseContent(response);
    const values: unknown[] = Array.isArray(content.liveList) ? content.liveList : [];

    return {
      items: values.map((item: unknown, index: number): LiveSummary => (
        normalizeLiveItem(item, options.status, index)
      )),
      next: nextValue(content),
      status: options.status,
      groupId: options.groupId
    };
  }

  public async getLiveDetail(liveId: string): Promise<LiveDetail> {
    const response: unknown = await this.postJson(
      this.baseUrl + '/live/api/v1/live/getLiveOne',
      { liveId }
    );

    assertSuccessfulResponse(response);
    const content: Record<string, unknown> = responseContent(response);
    const user: Record<string, unknown> = nestedRecord(content, 'user');
    const detail: LiveDetail = {
      liveId: firstString(content, ['liveId', 'id']) ?? liveId,
      title: firstString(content, ['title', 'subTitle']) ?? '未命名直播',
      time: firstString(content, ['ctime', 'stime', 'startTime']),
      endTime: firstString(content, ['endTime', 'etime']),
      status: statusValue(content.status, 'unknown')
    };
    const memberName: string | undefined = firstString(user, ['userName', 'nickname', 'name']);
    const memberId: string | undefined = firstString(user, ['userId', 'id']);
    const roomId: string | undefined = firstString(content, ['roomId', 'channelId']);
    const cover: string | undefined = firstString(content, ['coverPath', 'cover', 'coverUrl']);
    const playCount: string | undefined = firstString(content, ['playNum', 'playCount']);

    if (memberName !== undefined) detail.memberName = memberName;
    if (memberId !== undefined) detail.memberId = memberId;
    if (roomId !== undefined) detail.roomId = roomId;
    if (cover !== undefined) detail.cover = cover;
    if (playCount !== undefined) detail.playCount = playCount;

    return detail;
  }

  public async listPerformances(options: ListPerformanceOptions): Promise<PerformanceListPage> {
    const parsedNext: number = Number(options.next ?? '0');
    const body: JsonRecord = {
      debug: false,
      groupId: options.groupId,
      next: Number.isFinite(parsedNext) ? parsedNext : 0,
      record: options.record
    };
    const response: unknown = await this.postJson(
      this.baseUrl + '/live/api/v1/live/getOpenLiveList',
      body
    );

    assertSuccessfulResponse(response);
    const content: Record<string, unknown> = responseContent(response);
    const values: unknown[] = Array.isArray(content.liveList) ? content.liveList : [];

    return {
      items: values.map((item: unknown, index: number): PerformanceSummary => (
        normalizePerformanceItem(item, options.record, index)
      )),
      next: nextValue(content),
      record: options.record,
      groupId: options.groupId
    };
  }
}
