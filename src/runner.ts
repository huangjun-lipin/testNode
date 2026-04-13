/**
 * 测试运行器 - 自动扫描 tests/ 目录（含子文件夹），支持参数过滤
 *
 * 特性:
 *   - 自动重试：失败用例自动重试 N 次（TEST_RETRIES 环境变量，默认 2）
 *   - 超时保护：单个用例超时自动中止（TEST_TIMEOUT 环境变量，默认 120s）
 *   - 永不中断：某个用例失败不影响后续用例继续执行
 *   - 结果报告：运行结束后自动输出 JSON 报告到 reports/ 目录
 *
 * 用法:
 *   npm test                # 运行所有 *.test.ts
 *   npm test -- search      # 运行路径含 "search" 的测试
 *   npm test -- zhangsan    # 运行 zhangsan 文件夹下所有测试
 *   npm test -- lisi form   # 运行 lisi 文件夹下或文件名含 "form" 的测试
 */
import 'dotenv/config';
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { type TestResult, printResult } from './config.js';

const testsDir = resolve(import.meta.dirname, '../tests');
const reportsDir = resolve(import.meta.dirname, '../reports');

const MAX_RETRIES = Number(process.env.TEST_RETRIES ?? 2);
const TEST_TIMEOUT = Number(process.env.TEST_TIMEOUT ?? 120) * 1000; // 转毫秒

function scanDir(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...scanDir(full));
    } else if (entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

function discoverTests(filters: string[]) {
  const allFiles = scanDir(testsDir).sort();

  if (filters.length === 0) return allFiles;
  return allFiles.filter((f) => {
    const rel = relative(testsDir, f).toLowerCase();
    return filters.some((s) => rel.includes(s.toLowerCase()));
  });
}

async function runWithTimeout(fn: () => Promise<TestResult>, timeoutMs: number): Promise<TestResult> {
  return Promise.race([
    fn(),
    new Promise<TestResult>((_, reject) =>
      setTimeout(() => reject(new Error(`用例执行超时 (>${timeoutMs / 1000}s)`)), timeoutMs),
    ),
  ]);
}

async function runWithRetry(file: string, label: string): Promise<TestResult> {
  let lastResult: TestResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      console.log(`   🔄 第 ${attempt}/${MAX_RETRIES} 次重试...`);
    }

    try {
      const mod = await import(file);
      if (!mod.run) {
        return { name: label, passed: true, duration: 0, details: '未导出 run()，跳过' };
      }

      lastResult = await runWithTimeout(() => mod.run(), TEST_TIMEOUT);
      lastResult.attempt = attempt;
      lastResult.totalAttempts = attempt;

      if (lastResult.passed) {
        return lastResult;
      }
    } catch (err: any) {
      lastResult = {
        name: label,
        passed: false,
        duration: 0,
        error: err.message,
        attempt,
        totalAttempts: attempt,
      };
    }
  }

  // 所有重试都失败了
  lastResult!.totalAttempts = MAX_RETRIES;
  return lastResult!;
}

interface TestReport {
  timestamp: string;
  duration: number;
  config: { provider: string; model: string; retries: number; timeout: number };
  summary: { total: number; passed: number; failed: number };
  results: TestResult[];
}

function generateReport(results: TestResult[], startTime: number): TestReport {
  return {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    config: {
      provider: process.env.LLM_PROVIDER || 'openai',
      model: process.env.LLM_MODEL || 'default',
      retries: MAX_RETRIES,
      timeout: TEST_TIMEOUT / 1000,
    },
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
    results,
  };
}

function saveReport(report: TestReport) {
  mkdirSync(reportsDir, { recursive: true });

  // JSON 报告
  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = resolve(reportsDir, `${ts}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  // 可读文本报告
  const txtPath = resolve(reportsDir, `${ts}.txt`);
  const lines: string[] = [
    '═'.repeat(60),
    `  browsernode 自动化测试报告`,
    `  时间: ${report.timestamp}`,
    `  模型: ${report.config.provider} / ${report.config.model}`,
    `  重试: ${report.config.retries} 次 | 超时: ${report.config.timeout}s`,
    `  总耗时: ${(report.duration / 1000).toFixed(1)}s`,
    '═'.repeat(60),
    '',
  ];

  // 按通过/失败分组
  const passed = report.results.filter((r) => r.passed);
  const failed = report.results.filter((r) => !r.passed);

  if (passed.length > 0) {
    lines.push(`✅ 通过 (${passed.length}):`);
    for (const r of passed) {
      const retry = r.totalAttempts && r.totalAttempts > 1 ? ` [第${r.attempt}次通过]` : '';
      lines.push(`   ✅ ${r.name} (${r.duration}ms)${retry}`);
      if (r.details) lines.push(`      ${r.details.slice(0, 200)}`);
    }
    lines.push('');
  }

  if (failed.length > 0) {
    lines.push(`❌ 失败 (${failed.length}):`);
    for (const r of failed) {
      const retry = r.totalAttempts && r.totalAttempts > 1 ? ` [重试${r.totalAttempts}次仍失败]` : '';
      lines.push(`   ❌ ${r.name} (${r.duration}ms)${retry}`);
      if (r.error) lines.push(`      错误: ${r.error.slice(0, 300)}`);
      if (r.details) lines.push(`      详情: ${r.details.slice(0, 200)}`);
    }
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push(`  总计: ${report.summary.total} | 通过: ${report.summary.passed} | 失败: ${report.summary.failed}`);
  lines.push('═'.repeat(60));

  writeFileSync(txtPath, lines.join('\n'), 'utf-8');

  return { jsonPath, txtPath };
}

async function runAll() {
  const filters = process.argv.slice(2);
  const testFiles = discoverTests(filters);

  if (testFiles.length === 0) {
    console.log('⚠️  未找到匹配的测试文件');
    const all = scanDir(testsDir).map((f) => relative(testsDir, f));
    console.log(`   可用测试:\n${all.map((f) => `     - ${f}`).join('\n')}`);
    process.exit(1);
  }

  console.log('🚀 browsernode 自动化测试套件\n');
  console.log(`📂 发现 ${testFiles.length} 个测试文件`);
  console.log(`⚙️  重试: ${MAX_RETRIES}次 | 超时: ${TEST_TIMEOUT / 1000}s`);
  console.log('='.repeat(60));

  const globalStart = Date.now();
  const results: TestResult[] = [];

  for (const file of testFiles) {
    const rel = relative(testsDir, file);
    const label = rel.replace(/\.test\.ts$/, '');
    console.log(`\n▶ 运行: ${label} ...`);

    const result = await runWithRetry(file, label);
    results.push(result);
    printResult(result);
  }

  // 汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告汇总\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  for (const r of results) {
    const retry = r.totalAttempts && r.totalAttempts > 1
      ? (r.passed ? ` (第${r.attempt}次通过)` : ` (重试${r.totalAttempts}次)`)
      : '';
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}${retry}`);
  }

  console.log(
    `\n  总计: ${results.length} | 通过: ${passed} | 失败: ${failed} | 耗时: ${totalTime}ms`,
  );
  console.log('='.repeat(60));

  // 保存报告文件
  const report = generateReport(results, globalStart);
  const { jsonPath, txtPath } = saveReport(report);
  console.log(`\n📄 报告已保存:`);
  console.log(`   JSON: ${relative(process.cwd(), jsonPath)}`);
  console.log(`   TEXT: ${relative(process.cwd(), txtPath)}`);

  // 非零退出码表示有失败
  if (failed > 0) process.exit(1);
}

runAll();
