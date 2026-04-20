#!/usr/bin/env node
/**
 * postinstall: 自动修补 browsernode 的动态下拉组件兼容性问题
 *
 * 问题：jQuery UI SelectMenu / Ant Design Select / Bootstrap Select 等动态下拉
 * 的选项在 isInKnownContainer 检查中被过滤掉，因为默认容器选择器不包含它们。
 *
 * 修补内容：
 * 1. 扩展 interactiveRoles，加入 'menuitem' 和 'listbox'
 * 2. 扩展 isInKnownContainer 的选择器，加入 jQuery UI / Ant Design / Bootstrap 等常见下拉容器
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const domTreePath = resolve(
  __dirname,
  'node_modules/browsernode/dist/dom/dom_tree/index.js',
);

let content = readFileSync(domTreePath, 'utf-8');

// 检查是否已经打过补丁（幂等检查）
if (content.includes('ui-selectmenu-menu')) {
  console.log('[patch] browsernode 动态下拉兼容补丁已存在，跳过');
  process.exit(0);
}

// ========== Patch 1: 扩展 isInKnownContainer ==========
// 原代码: 'button,a,[role="button"],.menu,.dropdown,.list,.toolbar'
// 修补后: 加入 jQuery UI / Ant Design / Bootstrap / 原生 select 等下拉容器
const oldContainerSelector = `'button,a,[role="button"],.menu,.dropdown,.list,.toolbar'`;
const newContainerSelector = `'button,a,[role="button"],.menu,.dropdown,.list,.toolbar,.ui-selectmenu-menu,.ant-select-dropdown,.ant-dropdown-menu,.bootstrap-select .dropdown-menu,.select-options,.options-list,[role="listbox"],[role="menu"]'`;

if (!content.includes(oldContainerSelector)) {
  console.error(
    '[patch] 未找到 isInKnownContainer 目标字符串，browsernode 版本可能已更新',
  );
  process.exit(1);
}

content = content.replace(oldContainerSelector, newContainerSelector);

// ========== Patch 2: 扩展 interactiveRoles ==========
// 加入 'menuitem' 和 'listbox'（当前代码中被注释掉了）
const oldInteractiveRoles = `// 'menuitem',        // Clickable menu item\n\t\t\t// 'listbox',         // Selectable list`;
const newInteractiveRoles = `"menuitem", // Clickable menu item\n\t\t\t"listbox", // Selectable list`;

content = content.replace(oldInteractiveRoles, newInteractiveRoles);

writeFileSync(domTreePath, content, 'utf-8');
console.log('[patch] browsernode 动态下拉兼容补丁已应用:');
console.log(
  '       - isInKnownContainer: 扩展了 jQuery UI / Ant Design / Bootstrap 等选择器',
);
console.log('       - interactiveRoles: 启用了 menuitem / listbox');
