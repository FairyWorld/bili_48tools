// eslint-disable-next-line import/no-unresolved -- MCP SDK 通过 package exports 提供该路径
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// eslint-disable-next-line import/no-unresolved -- MCP SDK 通过 package exports 提供该路径
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = resolve(packageDirectory, 'dist', 'index.js');
const expectedTools = [
  'get_live_detail',
  'list_live',
  'list_performances',
  'search_members'
];
const client = new Client({
  name: '48tools-snh48-mcp-smoke',
  version: '0.1.0'
});
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath]
});

try {
  await client.connect(transport);
  const result = await client.listTools();
  const toolNames = result.tools.map((tool) => tool.name).sort();

  if (JSON.stringify(toolNames) !== JSON.stringify(expectedTools)) {
    throw new Error('工具列表不符合预期：' + JSON.stringify(toolNames));
  }

  await client.close();
  process.stdout.write('stdio 握手成功，已发现四个工具，服务端 stdout 无额外日志。\n');
} catch (error) {
  await client.close().catch(() => undefined);
  throw error;
}
