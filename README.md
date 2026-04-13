# browsernode 自动化测试项目

基于 [browsernode](https://github.com/leoning60/browsernode)（Browser-use 的 TypeScript 实现）构建的浏览器自动化测试项目。利用 AI Agent 驱动浏览器执行测试，无需编写传统的选择器和断言代码。

## 项目结构

```
testNode/
├── src/
│   ├── config.ts          # 多 LLM 提供商 + 浏览器共享配置
│   └── runner.ts          # 自动扫描测试运行器
├── tests/                 # 按人/模块分子文件夹
│   ├── demo/              # 示例测试
│   │   ├── search.test.ts
│   │   ├── form-fill.test.ts
│   │   ├── navigation.test.ts
│   │   └── data-extraction.test.ts
│   ├── zhangsan/          # 张三的测试
│   │   └── xxx.test.ts
│   └── lisi/              # 李四的测试
│       └── yyy.test.ts
├── .env.example           # 环境变量模板
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Key
```

### 3. 运行测试

```bash
# 运行全部测试（自动扫描 tests/ 下所有子目录中的 *.test.ts）
npm test

# 按文件夹过滤 —— 只运行某人的测试
npm test -- demo
npm test -- zhangsan

# 按文件名过滤 —— 只运行包含关键词的测试
npm test -- search
npm test -- form

# 组合过滤 —— 多个关键词取并集
npm test -- zhangsan search

# 精确匹配 —— 文件夹/文件名
npm test -- demo/search
npm test -- lisi/form-fill

# 无头模式运行（不弹出浏览器窗口）
npm run test:headless
npm run test:headless -- zhangsan
```

> **过滤规则**: 参数会与文件相对于 `tests/` 的路径做模糊匹配（不区分大小写）。  
> 例如 `npm test -- search` 会匹配 `demo/search.test.ts`、`zhangsan/search-api.test.ts` 等。

## 添加新测试

在 `tests/` 下自己的文件夹中创建 `*.test.ts` 文件，导出 `run()` 函数即可，无需修改任何配置：

```typescript
import { Agent } from 'browsernode';
import { createLLM, createBrowserSession, printResult, type TestResult } from '../../src/config.js';

const testName = '我的测试';

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const llm = createLLM();
  const browserSession = createBrowserSession('./tmp/traces/my-test');

  try {
    const agent = new Agent({
      task: '打开 https://example.com 并返回页面标题',
      llm,
      browserSession,
    });

    const history = await agent.run(10);
    const result = history.finalResult();

    return {
      name: testName,
      passed: result != null,
      duration: Date.now() - start,
      details: String(result).slice(0, 200),
    };
  } catch (err: any) {
    return { name: testName, passed: false, duration: Date.now() - start, error: err.message };
  } finally {
    await browserSession.close();
  }
}
```

## LLM 提供商配置

在 `.env` 中通过 `LLM_PROVIDER` 切换提供商，支持以下选项：

| 提供商 | `LLM_PROVIDER` | 默认模型 | 需要的环境变量 |
|--------|----------------|----------|----------------|
| OpenAI | `openai` | `gpt-4.1` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `claude-4-sonnet-20250514` | `ANTHROPIC_API_KEY` |
| Google Gemini | `google` | `gemini-2.5-flash` | `GEMINI_API_KEY` |
| Ollama (本地) | `ollama` | `qwen3:32b` | `OLLAMA_BASE_URL` (可选) |
| OpenRouter | `openrouter` | `google/gemini-2.5-flash` | `OPENROUTER_API_KEY` |
| Azure OpenAI | `azure` | `gpt-4.1` | `AZURE_OPENAI_API_KEY` |

### 国内第三方代理平台

`LLM_PROVIDER` 保持 `openai`，设置 `OPENAI_BASE_URL` 指向代理地址即可：

```env
LLM_PROVIDER=openai
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=sk-xxx
LLM_MODEL=deepseek-chat
```

| 平台 | `OPENAI_BASE_URL` | `LLM_MODEL` 示例 |
|------|-------------------|-------------------|
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-72B-Instruct` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 月之暗面 | `https://api.moonshot.cn/v1` | `moonshot-v1-128k` |
| 智谱AI | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` |
| 零一万物 | `https://api.lingyiwanwu.com/v1` | `yi-large` |

## 测试用例说明

| 测试 | 说明 | 目标网站 |
|------|------|----------|
| search | 搜索引擎搜索并验证结果 | bing.com |
| form-fill | 自动识别并填写表单 | demoqa.com |
| navigation | 多页面导航和后退验证 | the-internet.herokuapp.com |
| data-extraction | 提取结构化数据 + Zod 校验 | news.ycombinator.com |

## 核心特点

- **AI 驱动**: 使用 LLM 理解页面内容，无需手写 CSS/XPath 选择器
- **自然语言任务**: 用中文描述测试步骤，Agent 自动执行
- **结构化验证**: 结合 Zod Schema 对提取数据进行格式校验
- **按人分目录**: 每人维护自己文件夹下的测试，互不干扰
- **自动发现**: 新增 `*.test.ts` 文件即可被 runner 自动扫描执行
- **灵活过滤**: 按文件夹名、文件名关键词灵活筛选运行
- **多模型支持**: 一处配置切换 OpenAI / Claude / Gemini / 本地 Ollama / 国内平台
- **Trace 支持**: 自动保存浏览器操作轨迹用于调试
