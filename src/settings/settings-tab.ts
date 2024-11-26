import { App, PluginSettingTab, Setting, ButtonComponent, Notice } from 'obsidian';
import ObsidianPublisher from '../main';

/**
 * 插件设置页面类
 * 负责渲染和处理插件的设置界面
 * @extends PluginSettingTab
 */
export class PublisherSettingTab extends PluginSettingTab {
    /** 插件实例引用 */
    plugin: ObsidianPublisher;

    /**
     * 创建设置页面实例
     * @param {App} app - Obsidian 应用实例
     * @param {ObsidianPublisher} plugin - 插件实例
     */
    constructor(app: App, plugin: ObsidianPublisher) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * 渲染设置页面
     * 当设置页面打开时调用
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h3', { text: 'VitePress 设置' });

        // 启用开关设置
        new Setting(containerEl)
            .setName('启用 VitePress 发布')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vitepress.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.enabled = value;
                    await this.plugin.saveSettings();
                }));

        // 输出路径设置
        new Setting(containerEl)
            .setName('输出路径')
            .setDesc('VitePress 文档目录的路径')
            .addText(text => text
                .setPlaceholder('例如：/path/to/vitepress/docs')
                .setValue(this.plugin.settings.vitepress.outputPath)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.outputPath = value;
                    await this.plugin.saveSettings();
                }));

        // 站点名称设置
        new Setting(containerEl)
            .setName('站点名称')
            .setDesc('VitePress 站点的名称')
            .addText(text => text
                .setPlaceholder('我的知识库')
                .setValue(this.plugin.settings.vitepress.siteName)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.siteName = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'GitHub 设置' });

        // GitHub Token
        new Setting(containerEl)
            .setName('GitHub 访问令牌')
            .setDesc('输入您的 GitHub Personal Access Token')
            .addText(text => text
                .setPlaceholder('ghp_xxxxxxxxxxxxxxxx')
                .setValue(this.plugin.settings.githubToken)
                .onChange(async (value) => {
                    this.plugin.settings.githubToken = value;
                    await this.plugin.saveSettings();
                }));

        // GitHub 用户名
        new Setting(containerEl)
            .setName('GitHub 用户名')
            .setDesc('输入您的 GitHub 用户名')
            .addText(text => text
                .setPlaceholder('username')
                .setValue(this.plugin.settings.githubUsername)
                .onChange(async (value) => {
                    this.plugin.settings.githubUsername = value;
                    await this.plugin.saveSettings();
                }));

        // GitHub 仓库
        new Setting(containerEl)
            .setName('GitHub 仓库名')
            .setDesc('输入您的文档仓库名称')
            .addText(text => text
                .setPlaceholder('docs-repository')
                .setValue(this.plugin.settings.githubRepo)
                .onChange(async (value) => {
                    this.plugin.settings.githubRepo = value;
                    await this.plugin.saveSettings();
                }));

        // GitHub 分支
        new Setting(containerEl)
            .setName('GitHub 分支')
            .setDesc('输入要推送的分支名称')
            .addText(text => text
                .setPlaceholder('main')
                .setValue(this.plugin.settings.githubBranch)
                .onChange(async (value) => {
                    this.plugin.settings.githubBranch = value;
                    await this.plugin.saveSettings();
                }));

        // VitePress 路径
        new Setting(containerEl)
            .setName('VitePress 文档路径')
            .setDesc('指定 VitePress 文档在仓库中的路径')
            .addText(text => text
                .setPlaceholder('docs')
                .setValue(this.plugin.settings.vitepressPath)
                .onChange(async (value) => {
                    this.plugin.settings.vitepressPath = value;
                    await this.plugin.saveSettings();
                }));

        // 添加验证按钮
        containerEl.createEl('h3', { text: '配置验证' });

        new Setting(containerEl)
            .setName('验证配置')
            .setDesc('点击验证当前配置是否正确')
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText('验证配置')
                    .setCta()
                    .onClick(async () => {
                        button.setDisabled(true);
                        try {
                            await this.validateSettings();
                            new Notice('配置验证成功！');
                        } catch (error) {
                            new Notice(`配置验证失败：${error instanceof Error ? error.message : '未知错误'}`);
                        } finally {
                            button.setDisabled(false);
                        }
                    });
            });
    }

    /**
     * 验证配置是否正确
     * @private
     */
    private async validateSettings(): Promise<void> {
        const settings = this.plugin.settings;

        // 检查必填字段
        if (!settings.githubToken) {
            throw new Error('GitHub Token 不能为空');
        }
        if (!settings.githubUsername) {
            throw new Error('GitHub 用户名不能为空');
        }
        if (!settings.githubRepo) {
            throw new Error('GitHub 仓库名不能为空');
        }

        // 验证 GitHub API 访问权限
        const testUrl = `https://api.github.com/repos/${settings.githubUsername}/${settings.githubRepo}`;
        const headers = {
            'Authorization': `token ${settings.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        const response = await fetch(testUrl, { headers });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('仓库不存在或无访问权限');
            } else if (response.status === 401) {
                throw new Error('GitHub Token 无效或已过期');
            } else {
                throw new Error(`GitHub API 响应错误: ${response.statusText}`);
            }
        }

        // 验证分支是否存在
        const branchUrl = `${testUrl}/branches/${settings.githubBranch || 'main'}`;
        const branchResponse = await fetch(branchUrl, { headers });
        
        if (!branchResponse.ok) {
            if (branchResponse.status === 404) {
                throw new Error(`分支 "${settings.githubBranch || 'main'}" 不存在`);
            } else {
                throw new Error(`验证分支失败: ${branchResponse.statusText}`);
            }
        }

        // 验证 VitePress 文档路径
        const contentUrl = `${testUrl}/contents/${settings.vitepressPath}`;
        const contentResponse = await fetch(contentUrl, { headers });
        
        if (!contentResponse.ok) {
            if (contentResponse.status === 404) {
                throw new Error(`VitePress 文档路径 "${settings.vitepressPath}" 不存在`);
            } else {
                throw new Error(`验证文档路径失败: ${contentResponse.statusText}`);
            }
        }
    }
} 