// eslint-disable-next-line import/no-unresolved -- MCP SDK 通过 package exports 提供该路径
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DEFAULT_SNH48_GROUP_ID, Snh48ApiClient } from './api-client.js';
import { MemberDirectory } from './member-directory.js';
import type { ToolError, ToolResult } from './types.js';

export const DEFAULT_LIMIT: number = 20;
export const MAX_LIMIT: number = 50;

interface SearchMembersArgs {
  query: string;
  group?: string;
  limit?: number;
}

interface ListLiveArgs {
  status?: 'live' | 'recording';
  groupId?: number;
  next?: string;
  limit?: number;
}

interface GetLiveDetailArgs {
  liveId: string;
}

interface ListPerformancesArgs {
  groupId?: number;
  next?: string;
  record?: boolean;
  limit?: number;
}

export interface ServerDependencies {
  directory?: MemberDirectory;
  apiClient?: Snh48ApiClient;
}

function jsonText(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function successResult(data: Record<string, unknown>): ToolResult {
  const structuredContent: Record<string, unknown> = {
    ok: true,
    ...data
  };

  return {
    content: [
      {
        type: 'text',
        text: jsonText(structuredContent)
      }
    ],
    structuredContent
  };
}

function errorResult(error: unknown): ToolResult {
  const toolError: ToolError = {
    code: 'INTERNAL_ERROR',
    type: 'INTERNAL_ERROR',
    message: '处理请求时发生错误，请稍后重试'
  };

  if (error instanceof Error && error.name === 'UpstreamError') {
    const upstream: { code?: unknown } = error as Error & { code?: unknown };
    const upstreamCode: string = typeof upstream.code === 'string'
      ? upstream.code
      : 'UPSTREAM_ERROR';

    toolError.code = upstreamCode;
    toolError.type = 'UPSTREAM_ERROR';
    toolError.message = error.message;
  }

  const structuredContent: Record<string, unknown> = {
    ok: false,
    error: toolError
  };

  return {
    content: [
      {
        type: 'text',
        text: jsonText(structuredContent)
      }
    ],
    structuredContent,
    isError: true
  };
}

function safeLimit(value: number | undefined): number {
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value ?? DEFAULT_LIMIT)));
}

export function createServer(dependencies: ServerDependencies = {}): McpServer {
  const directory: MemberDirectory = dependencies.directory ?? new MemberDirectory();
  const apiClient: Snh48ApiClient = dependencies.apiClient ?? new Snh48ApiClient();
  const server: McpServer = new McpServer({
    name: '48tools-snh48-mcp',
    version: '0.1.0'
  });

  server.tool(
    'search_members',
    '搜索 SNH48 成员目录，支持姓名、拼音、房间 ID 等关键词。',
    {
      query: z.string().trim().min(1).describe('姓名、拼音或房间 ID'),
      group: z.string().default('SNH48').describe('团体名称，默认 SNH48；使用 all 搜索全部团体'),
      limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe('返回条数，默认 20，最大 50')
    },
    async (args: SearchMembersArgs): Promise<ToolResult> => {
      try {
        return successResult(await directory.search(
          args.query,
          args.group ?? 'SNH48',
          safeLimit(args.limit)
        ) as unknown as Record<string, unknown>);
      } catch (error: unknown) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'list_live',
    '查询 SNH48 直播或录播列表，支持游标分页；列表项的 status 保留上游状态值。',
    {
      status: z.enum(['live', 'recording']).default('live').describe('live 查询直播，recording 查询录播'),
      groupId: z.number().int().positive().default(DEFAULT_SNH48_GROUP_ID).describe('团体 ID，SNH48 为 10'),
      next: z.string().optional().describe('上一次返回的分页游标'),
      limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe('返回条数，默认 20，最大 50')
    },
    async (args: ListLiveArgs): Promise<ToolResult> => {
      try {
        const page: Awaited<ReturnType<Snh48ApiClient['listLive']>> = await apiClient.listLive({
          status: args.status ?? 'live',
          groupId: args.groupId ?? DEFAULT_SNH48_GROUP_ID,
          next: args.next
        });

        return successResult({
          ...page,
          items: page.items.slice(0, safeLimit(args.limit))
        });
      } catch (error: unknown) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'get_live_detail',
    '查询单场 SNH48 直播的标题、成员、时间和状态，不返回播放流地址；上游未提供状态字段时 status 为 unknown。',
    {
      liveId: z.string().trim().min(1).describe('直播 ID')
    },
    async (args: GetLiveDetailArgs): Promise<ToolResult> => {
      try {
        return successResult({
          item: await apiClient.getLiveDetail(args.liveId)
        });
      } catch (error: unknown) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'list_performances',
    '查询 SNH48 公演直播或录播列表，支持游标分页；列表项的 status 保留上游状态值。',
    {
      groupId: z.number().int().positive().default(DEFAULT_SNH48_GROUP_ID).describe('团体 ID，SNH48 为 10'),
      next: z.string().optional().describe('上一次返回的分页游标'),
      record: z.boolean().default(false).describe('是否查询公演录播'),
      limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe('返回条数，默认 20，最大 50')
    },
    async (args: ListPerformancesArgs): Promise<ToolResult> => {
      try {
        const page: Awaited<ReturnType<Snh48ApiClient['listPerformances']>> = await apiClient.listPerformances({
          groupId: args.groupId ?? DEFAULT_SNH48_GROUP_ID,
          next: args.next,
          record: args.record ?? false
        });

        return successResult({
          ...page,
          items: page.items.slice(0, safeLimit(args.limit))
        });
      } catch (error: unknown) {
        return errorResult(error);
      }
    }
  );

  return server;
}
