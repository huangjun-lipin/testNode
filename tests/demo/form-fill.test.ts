/**
 * 测试用例：表单填写自动化测试
 *
 * 让 AI Agent 自动打开一个在线表单页面，识别表单元素并填写内容。
 */
import { Agent } from 'browsernode';
import {
  createLLM,
  createBrowserSession,
  printResult,
  type TestResult,
} from '../../src/config.js';

const testName = '表单填写测试';

async function run(): Promise<TestResult> {
  const start = Date.now();
  const llm = createLLM();
  const browserSession = createBrowserSession('./tmp/traces/form');

  try {
    const agent = new Agent({
      task: `
        1. 打开 https://demoqa.com/automation-practice-form
        2. 填写以下表单字段：
           - First Name: "Test"
           - Last Name: "User"
           - Email: "test@example.com"
           - Mobile: "1234567890"
        3. 选择 Gender 为 "Male"
        4. 确认所有字段已正确填写
        5. 返回已填写的所有字段的值作为确认
      `,
      llm,
      browserSession,
      useVision: false, // 不发截图，纯文本模式
    });

    const history = await agent.run(15);
    const result = history.finalResult();
    const resultStr = String(result).toLowerCase();
    const passed = resultStr.includes('test') && resultStr.includes('user');

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

const isDirectRun = process.argv[1]?.includes('form-fill.test');
if (isDirectRun) {
  const result = await run();
  printResult(result);
}
export { run };
