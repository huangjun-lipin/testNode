/**
 * jQuery UI / 动态下拉组件兼容性补丁
 *
 * 问题：jQuery UI SelectMenu 等动态下拉组件的选项（.ui-selectmenu-menu li）
 * 在 browsernode 的 isHeuristicallyInteractive 检查中被 isInKnownContainer 过滤掉了，
 * 因为它们不在默认的 'button,a,[role="button"],.menu,.dropdown,.list,.toolbar' 容器列表中。
 *
 * 解决方案：通过 Playwright 的 addInitScript 在浏览器启动时注入 monkey-patch，
 * 替换 browsernode 的 isHeuristicallyInteractive 函数，加入 jQuery UI 等常见动态组件的识别。
 */
import { type BrowserSession } from 'browsernode/browser';

export function applyCompatibilityPatches(browserSession: BrowserSession) {
  // 在页面加载前注入 patch
  browserSession.page.addInitScript(() => {
    // 等待 browsernode 的 DOM tree 代码加载后执行 patch
    const patch = () => {
      // 找到 browsernode 暴露到 window 的 DOM tree 函数
      // isHeuristicallyInteractive 在闭包中，需要找到它的引用链
      const win = window as any;

      // 备份原始函数（如果存在）
      const origFn = win.isHeuristicallyInteractive;

      // 重新定义 isHeuristicallyInteractive，扩展 jQuery UI / Ant Design / Bootstrap Select 检测
      win.isHeuristicallyInteractive =
        function isHeuristicallyInteractivePatched(element: Element) {
          if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

          // 调用原始检查（如果存在）
          if (typeof origFn === 'function') {
            const origResult = origFn.call(this, element);
            if (origResult) return true;
          }

          // 扩展：jQuery UI SelectMenu 选项
          // 特征：位于 .ui-selectmenu-menu 容器内的 li 元素
          const jqUiOption = element.closest?.('.ui-selectmenu-menu');
          if (jqUiOption) {
            // 检查元素是否可见
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              return true;
            }
          }

          // Ant Design Select / Dropdown 选项
          const antdOption = element.closest?.(
            '.ant-select-dropdown, .ant-dropdown-menu, .rc-select-dropdown',
          );
          if (antdOption) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              return true;
            }
          }

          // Bootstrap Select / Dropdown 选项
          const bsOption = element.closest?.(
            '.bootstrap-select .dropdown-menu, .dropdown-menu.show',
          );
          if (bsOption) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              return true;
            }
          }

          // 通用动态下拉选项：位于非 body 容器内的隐藏选项
          // 如果元素的父容器有 role="listbox" 或 class 含 "dropdown-menu"
          const inDropdownContainer = element.closest?.(
            '[role="listbox"],[role="menu"],.dropdown-menu,.select-options,.options-list',
          );
          if (inDropdownContainer) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              return true;
            }
          }

          return false;
        };

      // 扩展 isInKnownContainer 的容器列表
      // 这个函数也是在闭包中，需要通过替换 isHeuristicallyInteractive 的引用来间接修复
      // 如果 isHeuristicallyInteractive 已经通过上述 patch 被替换，检测就会自动生效

      console.log(
        '[browsernode-patch] jQuery UI / 动态下拉组件兼容性补丁已应用',
      );
    };

    // 立即执行（如果 DOM 已就绪），或者等待 DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', patch, { once: true });
    } else {
      patch();
    }
  });
}
