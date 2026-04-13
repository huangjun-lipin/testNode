/**
 * 测试用例：页面导航自动化测试
 *
 * 让 AI Agent 验证页面跳转、多页面导航和链接是否正常工作。
 */
import { Agent } from 'browsernode';
import {
  createLLM,
  createBrowserSession,
  printResult,
  type TestResult,
} from '../../src/config.js';

const testName = '页面导航测试';

async function run(): Promise<TestResult> {
  const start = Date.now();
  const llm = createLLM();
  const browserSession = createBrowserSession('./tmp/traces/navigation');

  try {
    const agent = new Agent({
      task: `
        1. 打开 https://the-internet.herokuapp.com/
        2. 找到并点击 "Broken Images" 链接
        3. 确认页面已跳转，记录当前页面标题
        4. 按浏览器的后退按钮返回首页
        5. 找到并点击 "Checkboxes" 链接
        6. 确认页面已跳转，记录当前页面标题
        7. 返回你成功访问的所有页面标题列表
      `,
      llm,
      browserSession,
    });

    const history = await agent.run(15);
    const result = history.finalResult();
    const passed = result != null && String(result).length > 10;

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

const isDirectRun = process.argv[1]?.includes('navigation.test');
if (isDirectRun) {
  const result = await run();
  printResult(result);
}
export { run };
