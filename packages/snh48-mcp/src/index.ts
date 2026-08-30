// eslint-disable-next-line import/no-unresolved -- MCP SDK 通过 package exports 提供该路径
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const server: ReturnType<typeof createServer> = createServer();
  const transport: StdioServerTransport = new StdioServerTransport();

  await server.connect(transport);
}

void main().catch((error: unknown): void => {
  const message: string = error instanceof Error ? error.message : '未知错误';

  console.error('[48tools-snh48-mcp] 启动失败：' + message);
  process.exitCode = 1;
});
