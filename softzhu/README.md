# 软著交付包说明

## 软件信息
- 全称：基于大语言模型的低代码智能体工作流构建系统
- 简称：智能体工作流引擎
- 版本：V1.0
- 完成日期：2026-06-30

## 目录结构
- `prototype/`：高保真可交互系统原型（浏览器直接打开 `index.html`）
- `source/core/`：TypeScript 核心引擎源码（智能体 / 工作流 / 知识库 / 风控 / 发布）
- `docs/`：操作手册与源代码 Word 文档

## 使用方式
1. 用浏览器打开 `prototype/index.html`（建议 Chrome / Edge）
2. 点击「进入工作台」体验六大模块
3. 操作手册与源代码文档见 `docs/` 目录

## 重新生成文档
```bash
cd softzhu
node scripts/generate-docs.js
```
