# 48tools SNH48 MCP

这是 48tools 的独立 SNH48 只读 MCP 服务包。它使用 Node.js 原生 fetch 请求公开接口，不依赖 Electron、浏览器 localStorage、WASM 或登录状态。

## 提供的工具

- search_members：按姓名、拼音、房间 ID、账号或团体信息搜索成员，默认搜索 SNH48。
- list_live：查询 SNH48 直播或录播列表，支持分页。
- get_live_detail：查询单场直播的标题、成员、时间、状态和封面等信息，不返回播放流地址。
- list_performances：查询 SNH48 公演直播或录播列表，支持分页。

所有列表工具默认返回 20 条，最多返回 50 条。服务不提供登录、房间消息、语音、下载或写操作。

成员目录来自 qqtools 的 roomId.json，服务会在内存中缓存 10 分钟，并在主地址失败时尝试备用地址。上游接口超时或失败时，工具返回结构化中文错误，不返回堆栈。

## 安装、构建和启动

在 48tools 仓库根目录执行：

~~~sh
corepack yarn install
corepack yarn workspace @48tools/snh48-mcp build
corepack yarn workspace @48tools/snh48-mcp start
~~~

stdio 服务启动后不会向 stdout 写入日志；日志和启动错误写入 stderr。

## Claude Desktop 配置

将下面的配置加入 Claude Desktop 的 MCP 配置文件，并将 cwd 替换为本地 48tools 仓库路径：

~~~json
{
  "mcpServers": {
    "48tools-snh48": {
      "command": "corepack",
      "args": [
        "yarn",
        "workspace",
        "@48tools/snh48-mcp",
        "start"
      ],
      "cwd": "C:\\path\\to\\48tools"
    }
  }
}
~~~

如果已构建并希望直接运行，也可以把 command 改为 node，把 args 改为 ["C:\\path\\to\\48tools\\packages\\snh48-mcp\\dist\\index.js"]。

## Cherry Studio 配置

在 Cherry Studio 的 MCP 服务器设置中新增本地 stdio 服务：

- 命令：corepack
- 参数：yarn workspace @48tools/snh48-mcp start
- 工作目录：本地 48tools 仓库根目录

## 开发和测试

~~~sh
corepack yarn workspace @48tools/snh48-mcp typecheck
corepack yarn workspace @48tools/snh48-mcp test
corepack yarn workspace @48tools/snh48-mcp smoke
~~~

测试使用 mock，不依赖真实 SNH48 网络接口。相关背景和实现目标见 [Issue #167](https://github.com/duan602728596/48tools/issues/167)。
