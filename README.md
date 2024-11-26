# Obsidian Publisher Plugin

一个强大的 Obsidian 插件，支持将您的笔记发布到多个平台。目前支持发布到 VitePress，未来会支持更多平台。

## 功能特点

- 🚀 一键发布笔记到 VitePress
- 🔄 自动转换 Obsidian 特有语法
- 🖼️ 智能处理图片和内部链接
- ⚙️ 灵活的配置选项
- 🎯 保持文件结构和资源引用
- 🔌 可扩展的架构，易于添加新的发布平台

## 安装方法

1. 在 Obsidian 中打开设置
2. 进入第三方插件设置
3. 关闭安全模式
4. 点击"浏览"，搜索"Publisher"
5. 安装插件

或者手动安装：

1. 下载最新的 release
2. 解压到您的 vault 的 `.obsidian/plugins` 目录下
3. 重启 Obsidian
4. 在设置中启用插件

## 使用方法

### 基础配置

1. 进入插件设置
2. 启用需要的发布平台（如 VitePress）
3. 配置相应平台的设置：
   - 输出路径：VitePress 文档目录的路径
   - 站点名称：您的 VitePress 站点名称

### 发布笔记

1. 打开要发布的笔记
2. 使用以下方式之一发布：
   - 使用命令面板（Ctrl/Cmd + P），搜索"发布到 VitePress"
   - 使用自定义快捷键（可在设置中配置）

## VitePress 发布说明

### 前置要求

- 已安装并配置 VitePress
- 插件有权限访问 VitePress 目录
- VitePress 配置中正确设置了静态资源路径

### 转换规则

插件会自动处理以下内容：

- Obsidian 内部链接 `[[链接]]` → Markdown 链接 `[链接](链接)`
- 图片链接 `![[图片.png]]` → `![](/assets/images/图片.png)`
- 自动添加 VitePress 所需的 frontmatter

## 开发计划

- [ ] 支持更多发布平台（如 Notion、Hugo 等）
- [ ] 批量发布功能
- [ ] 自动生成侧边栏配置
- [ ] 发布历史记录
- [ ] 自定义模板支持
- [ ] 实时预览功能

## 贡献指南

欢迎提交 Pull Request 或 Issue！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 开发环境设置
