/**
 * 共享配置模块 - 多 LLM 提供商和浏览器配置
 *
 * 支持的提供商 (LLM_PROVIDER 环境变量):
 *   openai      - OpenAI 及兼容 API（配合 OPENAI_BASE_URL 可接入国内平台）
 *                 硅基流动: https://api.siliconflow.cn/v1
 *                 DeepSeek: https://api.deepseek.com/v1
 *                 月之暗面: https://api.moonshot.cn/v1
 *                 智谱AI:   https://open.bigmodel.cn/api/paas/v4
 *                 零一万物: https://api.lingyiwanwu.com/v1
 *   anthropic   - Anthropic (claude-4-sonnet 等)
 *   google      - Google Gemini (gemini-2.5-flash 等)
 *   ollama      - 本地 Ollama (qwen3:32b 等)
 *   openrouter  - OpenRouter (任意模型)
 *   azure       - Azure OpenAI
 */
import 'dotenv/config';
import {
  ChatOpenAI,
  ChatAnthropic,
  ChatGoogle,
  ChatOllama,
  ChatOpenRouter,
  ChatAzureOpenAI,
} from 'browsernode/llm';
import type { BaseChatModel } from 'browsernode/llm';
import { BrowserProfile, BrowserSession } from 'browsernode/browser';

const PROVIDER_DEFAULTS: Record<string, string> = {
  openai: 'gpt-4.1',
  anthropic: 'claude-4-sonnet-20250514',
  google: 'gemini-2.5-flash',
  ollama: 'qwen3:32b',
  openrouter: 'google/gemini-2.5-flash',
  azure: 'gpt-4.1',
};

export function createLLM(): BaseChatModel {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  const model =
    process.env.LLM_MODEL || PROVIDER_DEFAULTS[provider] || 'gpt-4.1';
  const temperature = Number(process.env.LLM_TEMPERATURE ?? 0.0);

  switch (provider) {
    case 'anthropic':
      return new ChatAnthropic({
        model,
        temperature,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

    case 'google':
      return new ChatGoogle({
        model,
        temperature,
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      });

    case 'ollama':
      return new ChatOllama({
        model,
        host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      });

    case 'openrouter':
      return new ChatOpenRouter({
        model,
        temperature,
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: process.env.OPENROUTER_BASE_URL,
      });

    case 'azure':
      return new ChatAzureOpenAI({
        model,
        temperature,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
      });

    case 'openai':
    default:
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: process.env.OPENAI_API_KEY,
        ...(process.env.OPENAI_BASE_URL
          ? { baseUrl: process.env.OPENAI_BASE_URL }
          : {}),
      });
  }
}

export function createBrowserSession(traceDir?: string) {
  return new BrowserSession({
    browserProfile: new BrowserProfile({
      headless: process.env.HEADLESS === 'true',
      windowSize: {
        width: Number(process.env.BROWSER_WIDTH ?? 1280),
        height: Number(process.env.BROWSER_HEIGHT ?? 900),
      },
      ...(traceDir ? { tracesDir: traceDir } : {}),
    }),
  });
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

export function printResult(result: TestResult) {
  const icon = result.passed ? '✅' : '❌';
  console.log(
    `\n${icon} [${result.name}] ${result.passed ? 'PASSED' : 'FAILED'} (${result.duration}ms)`,
  );
  if (result.details) console.log(`   📋 ${result.details}`);
  if (result.error) console.log(`   ⚠️  ${result.error}`);
}
