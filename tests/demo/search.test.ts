/**
 * 测试用例：搜索功能自动化测试
 *
 * 让 AI Agent 在搜索引擎中执行搜索，验证搜索结果是否包含期望内容。
 */
import { Agent } from 'browsernode';
import {
  createLLM,
  createBrowserSession,
  printResult,
  type TestResult,
} from '../../src/config.js';

const testName = '搜索功能测试';

async function run(): Promise<TestResult> {
  const start = Date.now();
  const llm = createLLM();
  const browserSession = createBrowserSession('./tmp/traces/search');

  try {
    const agent = new Agent({
      task: `
        1. 打开 https://www.bing.com
        2. 在搜索框中输入 "browsernode github"
        3. 点击搜索按钮
        4. 等待搜索结果加载
        5. 检查搜索结果中是否包含 "browsernode" 相关内容
        6. 返回第一个搜索结果的标题和链接
      `,
      llm,
      browserSession,
      useVision: false, // 不发截图，纯文本模式
    });

    const history = await agent.run(10);
    const result = history.finalResult();
    const passed =
      result != null && String(result).toLowerCase().includes('browsernode');

    return {
      name: testName,
      passed,
      duration: Date.now() - start,
      details:
        typeof result === 'string'
          ? result.slice(0, 200)
          : JSON.stringify(result)?.slice(0, 200),
    };
  } catch (err: any) {
    return {
      name: testName,
      passed: false,
      duration: Date.now() - start,
      error: err.message,
    };
  } finally {
    await browserSession.close();
  }
}

// 直接运行时执行
const isDirectRun = process.argv[1]?.includes('search.test');
if (isDirectRun) {
  const result = await run();
  printResult(result);
}
export { run };
