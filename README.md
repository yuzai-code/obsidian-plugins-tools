# Obsidian Publisher Plugin

一个用于将 Obsidian 笔记发布到 VitePress 站点的插件。

## 功能特点

- 支持一键发布笔记到 VitePress 文档站点
- 通过 GitHub API 自动同步内容
- 完整的配置验证功能
- 支持自定义发布路径和分支

## 安装方法

1. 在 Obsidian 中打开设置
2. 进入第三方插件设置
3. 关闭安全模式
4. 点击"浏览"，搜索"Publisher"
5. 安装插件

## 配置说明

### VitePress 设置

- **启用 VitePress 发布**: 开启/关闭 VitePress 发布功能
- **输出路径**: VitePress 文档目录的路径
- **站点名称**: VitePress 站点的显示名称

### GitHub 设置

- **GitHub 访问令牌**: 您的 GitHub Personal Access Token
  - 需要具有仓库读写权限
  - 可以在 GitHub Settings > Developer settings > Personal access tokens 中创建
- **GitHub 用户名**: 您的 GitHub 用户名
- **GitHub 仓库名**: 文档仓库的名称
- **GitHub 分支**: 要推送的目标分支（默认为 main）
- **VitePress 文档路径**: 文档在仓库中的路径（默认为 docs）

## 使用方法

1. 完成插件配置
2. 使用验证按钮检查配置是否正确
3. 打开要发布的笔记
4. 使用命令面板（Ctrl/Cmd + P）
5. 输入"发布到 VitePress"并执行

## 注意事项

- 确保 GitHub Token 具有足够的权限
- 仓库需要已经初始化并包含指定的分支
- VitePress 文档路径必须存在于仓库中
- 建议在首次使用时进行配置验证

## 错误处理

常见错误及解决方案：

- **GitHub Token 无效**: 检查 Token 是否正确且未过期
- **仓库不存在**: 确认仓库名称和访问权限
- **分支不存在**: 验证分支名称是否正确
- **路径不存在**: 确保 VitePress 文档路径在仓库中已创建

## 开发计划

- [ ] 支持更多文档站点平台
- [ ] 添加文件变更预览
- [ ] 支持批量发布
- [ ] 添加发布历史记录

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
