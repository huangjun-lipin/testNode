/**
 * 测试运行器 - 批量执行所有测试用例并生成报告
 */
import 'dotenv/config';
import { type TestResult, printResult } from './config.js';

const testModules = [
  { name: '搜索功能', path: '../tests/search.test.js' },
  { name: '表单填写', path: '../tests/form-fill.test.js' },
  { name: '页面导航', path: '../tests/navigation.test.js' },
  { name: '数据提取', path: '../tests/data-extraction.test.js' },
];

async function runAll() {
  console.log('🚀 browsernode 自动化测试套件\n');
  console.log('='.repeat(60));

  const results: TestResult[] = [];
  const selectedTests = process.argv.slice(2);

  const toRun = selectedTests.length
    ? testModules.filter((t) =>
        selectedTests.some((s) => t.name.includes(s) || t.path.includes(s)),
      )
    : testModules;

  for (const testMod of toRun) {
    console.log(`\n▶ 运行: ${testMod.name} ...`);
    try {
      const mod = await import(testMod.path);
      if (mod.run) {
        const result = await mod.run();
        results.push(result);
        printResult(result);
      }
    } catch (err: any) {
      const failResult: TestResult = {
        name: testMod.name,
        passed: false,
        duration: 0,
        error: err.message,
      };
      results.push(failResult);
      printResult(failResult);
    }
  }

  // 汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告汇总\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  }

  console.log(
    `\n  总计: ${results.length} | 通过: ${passed} | 失败: ${failed} | 耗时: ${totalTime}ms`,
  );
  console.log('='.repeat(60));

  // 非零退出码表示有失败
  if (failed > 0) process.exit(1);
}

runAll();
