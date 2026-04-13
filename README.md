# browsernode 自动化测试项目

基于 [browsernode](https://github.com/leoning60/browsernode)（Browser-use 的 TypeScript 实现）构建的浏览器自动化测试项目。利用 AI Agent 驱动浏览器执行测试，无需编写传统的选择器和断言代码。

## 项目结构

```
testNode/
├── src/
│   ├── config.ts          # LLM 和浏览器的共享配置
│   └── runner.ts          # 批量测试运行器
├── tests/
│   ├── search.test.ts     # 搜索功能测试
│   ├── form-fill.test.ts  # 表单填写测试
│   ├── navigation.test.ts # 页面导航测试
│   └── data-extraction.test.ts  # 结构化数据提取测试
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
# 运行单个测试
npm run test:search
npm run test:form
npm run test:nav
npm run test:extract

# 运行所有测试
npm run test:all

# 无头模式运行
npm run test:headless
```

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
- **统一报告**: 批量运行后输出汇总结果
- **Trace 支持**: 自动保存浏览器操作轨迹用于调试
