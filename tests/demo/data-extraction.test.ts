/**
 * 测试用例：结构化数据提取测试
 *
 * 让 AI Agent 从网页中提取结构化数据，并用 Zod 校验输出格式。
 */
import { Agent, Controller } from 'browsernode';
import { z } from 'zod';
import {
  createLLM,
  createBrowserSession,
  printResult,
  type TestResult,
} from '../../src/config.js';

// 定义提取结果的 Schema
const PostSchema = z.object({
  title: z.string().describe('帖子标题'),
  points: z.number().describe('帖子得分'),
  author: z.string().describe('作者名'),
});

const PostsSchema = z.object({
  posts: z.array(PostSchema).describe('帖子列表'),
});

type Posts = z.infer<typeof PostsSchema>;

const testName = '数据提取测试';

async function run(): Promise<TestResult> {
  const start = Date.now();
  const llm = createLLM();
  const browserSession = createBrowserSession('./tmp/traces/extraction');

  try {
    const controller = new Controller();

    const agent = new Agent({
      task: `
        1. 打开 https://news.ycombinator.com
        2. 提取首页前 5 个帖子的信息（标题、得分、作者）
        3. 以 JSON 格式返回提取结果，格式为: { "posts": [{ "title": "...", "points": 123, "author": "..." }, ...] }
      `,
      llm,
      browserSession,
      controller,
    });

    const history = await agent.run(10);
    const rawResult = history.finalResult();
    const resultStr = String(rawResult);

    // 尝试从结果中解析 JSON
    let parsed: Posts | null = null;
    let parseError: string | undefined;
    try {
      // 从结果字符串中提取 JSON
      const jsonMatch = resultStr.match(/\{[\s\S]*"posts"[\s\S]*\}/);
      if (jsonMatch) {
        parsed = PostsSchema.parse(JSON.parse(jsonMatch[0]));
      }
    } catch (e: any) {
      parseError = e.message;
    }

    const passed = parsed !== null && parsed.posts.length >= 3;

    return {
      name: testName,
      passed,
      duration: Date.now() - start,
      details: parsed
        ? `成功提取 ${parsed.posts.length} 条帖子: ${parsed.posts
            .map((p) => p.title)
            .join(', ')
            .slice(0, 150)}`
        : `原始结果: ${resultStr.slice(0, 150)}`,
      error: parseError,
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

const isDirectRun = process.argv[1]?.includes('data-extraction.test');
if (isDirectRun) {
  const result = await run();
  printResult(result);
}
export { run };
