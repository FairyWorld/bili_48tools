import { requestJson, UpstreamError } from './http.js';
import type { MemberRecord } from './types.js';

export const MEMBER_DIRECTORY_URLS: string[] = [
  'https://fastly.jsdelivr.net/gh/duan602728596/qqtools@main/packages/NIMTest/node/roomId.json',
  'https://raw.githubusercontent.com/duan602728596/qqtools/main/packages/NIMTest/node/roomId.json',
  'https://raw.gitmirror.com/duan602728596/qqtools/main/packages/NIMTest/node/roomId.json'
];

export const DEFAULT_MEMBER_CACHE_TTL_MS: number = 10 * 60 * 1_000;

type FetchJson = (url: string) => Promise<unknown>;
type Clock = () => number;

interface MemberDirectoryOptions {
  fetchJson?: FetchJson;
  now?: Clock;
  ttlMs?: number;
  urls?: string[];
}

interface MemberSearchResult {
  query: string;
  group: string;
  total: number;
  items: MemberRecord[];
  buildTime: string;
  source: string;
}

interface CachedDirectory {
  buildTime: string;
  members: MemberRecord[];
  source: string;
  expiresAt: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function toOptionalString(value: unknown): string | undefined {
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
    const value: string | undefined = toOptionalString(record[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizeMember(value: unknown, index: number): MemberRecord | undefined {
  const record: Record<string, unknown> | undefined = asRecord(value);

  if (!record) {
    return undefined;
  }

  const name: string | undefined = firstString(record, ['ownerName', 'name', 'nickname']);

  if (!name) {
    return undefined;
  }

  const group: string = firstString(record, ['groupName', 'group']) ?? '未知';
  const member: MemberRecord = {
    id: firstString(record, ['id', 'memberId']) ?? String(index + 1),
    name,
    group
  };
  const pinyin: string | undefined = firstString(record, ['pinyin', 'spell']);
  const roomId: string | undefined = firstString(record, ['roomId', 'channelId']);
  const liveRoomId: string | undefined = firstString(record, ['liveRoomId', 'liveId']);
  const account: string | undefined = firstString(record, ['account', 'userId']);
  const team: string | undefined = firstString(record, ['team', 'teamName']);
  const period: string | undefined = firstString(record, ['periodName', 'period']);
  const avatar: string | undefined = firstString(record, ['avatar', 'avatarUrl']);

  if (pinyin !== undefined) member.pinyin = pinyin;
  if (roomId !== undefined) member.roomId = roomId;
  if (liveRoomId !== undefined) member.liveRoomId = liveRoomId;
  if (account !== undefined) member.account = account;
  if (team !== undefined) member.team = team;
  if (period !== undefined) member.period = period;
  if (avatar !== undefined) member.avatar = avatar;

  return member;
}

function parseDirectory(value: unknown, source: string): Omit<CachedDirectory, 'expiresAt'> {
  const record: Record<string, unknown> | undefined = asRecord(value);
  const listValue: unknown = record?.roomId ?? record?.members ?? record?.data;
  const values: unknown[] = Array.isArray(listValue) ? listValue : [];
  const members: MemberRecord[] = values
    .map((item: unknown, index: number): MemberRecord | undefined => normalizeMember(item, index))
    .filter((item: MemberRecord | undefined): item is MemberRecord => item !== undefined);

  if (members.length === 0) {
    throw new UpstreamError('MEMBER_DIRECTORY_INVALID', '成员目录返回了无效数据');
  }

  return {
    buildTime: firstString(record ?? {}, ['buildTime', 'updatedAt']) ?? '未知',
    members,
    source
  };
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

function matches(member: MemberRecord, query: string): boolean {
  const searchable: string = [
    member.id,
    member.name,
    member.pinyin,
    member.roomId,
    member.liveRoomId,
    member.account,
    member.group,
    member.team,
    member.period
  ].filter((value: string | undefined): value is string => value !== undefined).join(' ');

  return normalizeText(searchable).includes(normalizeText(query));
}

export class MemberDirectory {
  private readonly fetchJson: FetchJson;

  private readonly now: Clock;

  private readonly ttlMs: number;

  private readonly urls: string[];

  private cache?: CachedDirectory;

  public constructor(options: MemberDirectoryOptions = {}) {
    this.fetchJson = options.fetchJson ?? ((url: string): Promise<unknown> => requestJson<unknown>(url));
    this.now = options.now ?? ((): number => Date.now());
    this.ttlMs = options.ttlMs ?? DEFAULT_MEMBER_CACHE_TTL_MS;
    this.urls = options.urls ?? MEMBER_DIRECTORY_URLS;
  }

  public async load(): Promise<CachedDirectory> {
    if (this.cache && this.cache.expiresAt > this.now()) {
      return this.cache;
    }

    for (const url of this.urls) {
      try {
        const parsed: Omit<CachedDirectory, 'expiresAt'> = parseDirectory(
          await this.fetchJson(url),
          url
        );
        const cached: CachedDirectory = {
          ...parsed,
          expiresAt: this.now() + this.ttlMs
        };

        this.cache = cached;

        return cached;
      } catch {
        continue;
      }
    }

    if (this.cache) {
      return this.cache;
    }

    throw new UpstreamError('MEMBER_DIRECTORY_UNAVAILABLE', '成员目录暂时不可用，请稍后重试');
  }

  public async search(query: string, group: string = 'SNH48', limit: number = 20): Promise<MemberSearchResult> {
    const directory: CachedDirectory = await this.load();
    const normalizedGroup: string = group.trim() || 'SNH48';
    const searchAll: boolean = normalizedGroup.toLowerCase() === 'all';
    const filtered: MemberRecord[] = directory.members.filter((member: MemberRecord): boolean => {
      const groupMatches: boolean = searchAll
        || normalizeText(member.group) === normalizeText(normalizedGroup);

      return groupMatches && matches(member, query);
    });
    const safeLimit: number = Math.min(50, Math.max(1, Math.trunc(limit)));

    return {
      query,
      group: normalizedGroup,
      total: filtered.length,
      items: filtered.slice(0, safeLimit),
      buildTime: directory.buildTime,
      source: directory.source
    };
  }
}
