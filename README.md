# Research Workbench · 通用科研工作台

一个完全本地、通用且可自由扩展的桌面工作台。项目不包含任何特定个人、学科或单位属性；记录、内容类型、工作区和自定义字段都可以由使用者自行维护。

## 主要能力

- 记录的新增、编辑、复制、归档和删除
- 项目、任务、笔记、数据记录、文件、复盘等通用类型
- 自定义内容类型与工作区的新增、重命名和删除
- 每条记录可自由添加、修改和删除自定义字段
- 搜索、类型筛选、状态筛选和今日重点
- JSON 数据导入、导出和恢复示例数据
- 数据保存在本机 `localStorage`，无需账号或网络
- Windows 原生桌面封装（Tauri）

## 本地开发

环境要求：Node.js 20+、Rust stable、Windows WebView2。

```powershell
npm install
npm run dev
```

质量检查：

```powershell
npm run lint
npm test
npm run test:e2e
npm run build
```

生成 Windows 安装包：

```powershell
npm run tauri -- build
```

## 目录

- `src/`：React + TypeScript 前端源码
- `src/store.ts`：Zustand 数据状态与全部 CRUD 操作
- `src/components/`：编辑器、表格、设置等界面组件
- `src/test/`：单元测试与端到端测试
- `src-tauri/`：Windows 桌面程序封装
- `design/`：视觉概念稿
- `docs/`：使用说明

## 数据说明

应用首次启动会载入可删除的通用示例数据。之后的更改自动保存在当前 Windows 用户的 WebView2 本地存储中。换电脑或重装前，请在“设置 → 数据管理”中导出 JSON 备份。

许可证：当前源码仅作为本次交付提供，使用者可继续修改和打包。
