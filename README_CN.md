# Obsidian Publisher Plugin

[English](README.md) | 简体中文

一个用于将 Obsidian 笔记发布到个人博客的插件。目前支持发布到 VitePress 站点。

## 功能特点

- 支持发布到 VitePress 站点
- 支持一键发布和选择目录发布
- 支持保持原有文件目录结构
- 支持自动添加 frontmatter
- 支持设置默认发布目录
- 支持 GitHub Token 安全输入

## 安装方法

1. 下载最新版本的插件
2. 解压到 Obsidian 插件目录 `.obsidian/plugins/`
3. 在 Obsidian 设置中启用插件

## 配置说明

### VitePress 设置

- **启用 VitePress 发布**：开启/关闭 VitePress 发布功能
- **添加 Frontmatter**：自动为发布的文档添加 frontmatter（包含日期等信息）
- **保持文件结构**：发布时保持 Obsidian 中的原有文件目录结构
- **默认发布目录**：设置一键发布时的默认目标目录

### GitHub 设置

- **GitHub Token**：用于访问 GitHub API 的个人访问令牌
- **GitHub 用户名**：你的 GitHub 用户名
- **GitHub 仓库**：VitePress 站点所在的仓库名
- **GitHub 分支**：要发布到的分支名称（默认为 main）
- **VitePress 路径**：VitePress 文档在仓库中的路径

## 使用方法

### 一键发布

1. 点击工具栏的发布图标（纸飞机）
2. 选择"一键发布"选项
3. 文档将被发布到默认目录（如果已设置）或根目录

### 选择目录发布

1. 点击工具栏的发布图标
2. 选择"选择目录发布"选项
3. 在弹出的目录列表中选择目标目录
4. 文档将被发布到选定的目录

### 命令面板

也可以通过命令面板使用以下命令：

- `一键发布到 VitePress`：快速发布当前文档
- `发布到 VitePress`：常规发布当前文档

## 目录结构说明

当启用"保持文件结构"选项时：

- 插件会保持 Obsidian 中的原有目录结构
- 例如：如果文件在 Obsidian 中的路径是 `docs/frontend/vue.md`
  - 不设置默认目录时：发布后的路径将是 `vitepressPath/docs/frontend/vue.md`
  - 设置默认目录为 `posts` 时：发布后的路径将是 `vitepressPath/posts/docs/frontend/vue.md`

当禁用"保持文件结构"选项时：

- 插件只使用文件名
- 例如：对于同一个文件 `docs/frontend/vue.md`
  - 不设置默认目录时：发布后的路径将是 `vitepressPath/vue.md`
  - 设置默认目录为 `posts` 时：发布后的路径将是 `vitepressPath/posts/vue.md`

## 注意事项

1. 首次使用前需要配置 GitHub Token 和相关设置
2. GitHub Token 需要有仓库的读写权限
3. 建议在发布前检查文档格式是否符合 VitePress 要求
4. 如果启用了"保持文件结构"，请注意目标路径的长度限制

## 问题反馈

如果遇到问题或有功能建议，欢迎在 GitHub Issues 中反馈。

## License

MIT
