/**
 * 测试运行器 - 自动扫描 tests/ 目录（含子文件夹），支持参数过滤
 *
 * 用法:
 *   npm test                # 运行所有 *.test.ts
 *   npm test -- search      # 运行路径含 "search" 的测试
 *   npm test -- zhangsan    # 运行 zhangsan 文件夹下所有测试
 *   npm test -- lisi form   # 运行 lisi 文件夹下或文件名含 "form" 的测试
 */
import 'dotenv/config';
import { readdirSync, statSync } from 'node:fs';
import { resolve, relative, basename, dirname } from 'node:path';
import { type TestResult, printResult } from './config.js';

const testsDir = resolve(import.meta.dirname, '../tests');

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
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  for (const file of testFiles) {
    const rel = relative(testsDir, file);
    const label = rel.replace(/\.test\.ts$/, '');
    console.log(`\n▶ 运行: ${label} ...`);
    try {
      const mod = await import(file);
      if (mod.run) {
        const result = await mod.run();
        results.push(result);
        printResult(result);
      } else {
        console.log(`   ⏭️  ${rel} 未导出 run()，跳过`);
      }
    } catch (err: any) {
      const failResult: TestResult = {
        name: label,
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
