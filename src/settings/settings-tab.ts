import { App, PluginSettingTab, Setting, TextComponent, setIcon } from 'obsidian';
import { PluginSettings } from './settings.interface';
import ObsidianVitePressPlugin from '../main';

export class SettingsTab extends PluginSettingTab {
    private plugin: ObsidianVitePressPlugin;
    private settings: PluginSettings;

    constructor(app: App, plugin: ObsidianVitePressPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = plugin.settings;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // VitePress 设置区域
        containerEl.createEl('h2', { text: 'VitePress 设置' });

        new Setting(containerEl)
            .setName('启用 VitePress 发布')
            .setDesc('是否启用 VitePress 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.enabled)
                .onChange(async (value) => {
                    this.settings.vitepress.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('添加 Frontmatter')
            .setDesc('自动为发布的文档添加 frontmatter')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.addFrontmatter)
                .onChange(async (value) => {
                    this.settings.vitepress.addFrontmatter = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('保持文件结构')
            .setDesc('发布时保持原有的文件目录结构')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.keepFileStructure)
                .onChange(async (value) => {
                    this.settings.vitepress.keepFileStructure = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('默认发布目录')
            .setDesc('设置一键发布时的默认目录')
            .addText(text => text
                .setPlaceholder('例如: posts')
                .setValue(this.settings.vitepress.defaultDirectory || '')
                .onChange(async (value) => {
                    this.settings.vitepress.defaultDirectory = value;
                    await this.plugin.saveSettings();
                }));

        // GitHub 设置区域
        containerEl.createEl('h2', { text: 'GitHub 设置' });

        new Setting(containerEl)
            .setName('GitHub Token')
            .setDesc('用于访问 GitHub API 的个人访问令牌')
            .addText((text) => {
                const textComponent: TextComponent = text
                    .setPlaceholder('输入你的 GitHub Token')
                    .setValue(this.settings.githubToken)
                    .onChange(async (value) => {
                        this.settings.githubToken = value;
                        await this.plugin.saveSettings();
                    });
                
                // 设置为密码输入
                textComponent.inputEl.type = 'password';
                
                // 添加显示/隐藏按钮
                const toggleButton = createEl('button', {
                    cls: 'github-token-toggle',
                    attr: {
                        type: 'button',
                        'aria-label': '显示/隐藏 Token'
                    }
                });
                
                // 添加眼睛图标
                setIcon(toggleButton, 'eye-off');
                
                // 添加点击事件
                toggleButton.addEventListener('click', () => {
                    const isPassword = textComponent.inputEl.type === 'password';
                    textComponent.inputEl.type = isPassword ? 'text' : 'password';
                    setIcon(toggleButton, isPassword ? 'eye' : 'eye-off');
                });
                
                // 将按钮添加到输入框后面
                textComponent.inputEl.after(toggleButton);
                
                return textComponent;
            });

        new Setting(containerEl)
            .setName('GitHub 用户名')
            .setDesc('你的 GitHub 用户名')
            .addText(text => text
                .setPlaceholder('输入你的 GitHub 用户名')
                .setValue(this.settings.githubUsername)
                .onChange(async (value) => {
                    this.settings.githubUsername = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('GitHub 仓库')
            .setDesc('VitePress 站点所在的仓库名')
            .addText(text => text
                .setPlaceholder('输入仓库名')
                .setValue(this.settings.githubRepo)
                .onChange(async (value) => {
                    this.settings.githubRepo = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('GitHub 分支')
            .setDesc('要发布到的分支名称')
            .addText(text => text
                .setPlaceholder('例如: main')
                .setValue(this.settings.githubBranch)
                .onChange(async (value) => {
                    this.settings.githubBranch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('VitePress 路径')
            .setDesc('VitePress 文档在仓库中的路径')
            .addText(text => text
                .setPlaceholder('例如: docs')
                .setValue(this.settings.vitepressPath)
                .onChange(async (value) => {
                    this.settings.vitepressPath = value;
                    await this.plugin.saveSettings();
                }));

        // GitLab 设置区域
        containerEl.createEl('h2', { text: 'GitLab 设置' });

        new Setting(containerEl)
            .setName('启用 GitLab')
            .setDesc('是否启用 GitLab 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.gitlabEnabled)
                .onChange(async (value) => {
                    this.settings.gitlabEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('GitLab Token')
            .setDesc('用于访问 GitLab API 的访问令牌')
            .addText((text) => {
                const textComponent = text
                    .setPlaceholder('输入你的 GitLab Token')
                    .setValue(this.settings.gitlabToken)
                    .onChange(async (value) => {
                        this.settings.gitlabToken = value;
                        await this.plugin.saveSettings();
                    });
                
                // 设置为密码输入
                textComponent.inputEl.type = 'password';
                
                // 添加显示/隐藏按钮
                const toggleButton = createEl('button', {
                    cls: 'gitlab-token-toggle',
                    attr: {
                        type: 'button',
                        'aria-label': '显示/隐藏 Token'
                    }
                });
                
                setIcon(toggleButton, 'eye-off');
                
                toggleButton.addEventListener('click', () => {
                    const isPassword = textComponent.inputEl.type === 'password';
                    textComponent.inputEl.type = isPassword ? 'text' : 'password';
                    setIcon(toggleButton, isPassword ? 'eye' : 'eye-off');
                });
                
                textComponent.inputEl.after(toggleButton);
                
                return textComponent;
            });

        new Setting(containerEl)
            .setName('GitLab 用户名')
            .setDesc('你的 GitLab 用户名')
            .addText(text => text
                .setPlaceholder('输入你的 GitLab 用户名')
                .setValue(this.settings.gitlabUsername)
                .onChange(async (value) => {
                    this.settings.gitlabUsername = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('GitLab 仓库')
            .setDesc('GitLab 仓库名称')
            .addText(text => text
                .setPlaceholder('输入仓库名')
                .setValue(this.settings.gitlabRepo)
                .onChange(async (value) => {
                    this.settings.gitlabRepo = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('GitLab 分支')
            .setDesc('要发布到的分支名称')
            .addText(text => text
                .setPlaceholder('例如: main')
                .setValue(this.settings.gitlabBranch)
                .onChange(async (value) => {
                    this.settings.gitlabBranch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('GitLab 路径')
            .setDesc('文档在 GitLab 仓库中的路径')
            .addText(text => text
                .setPlaceholder('例如: docs')
                .setValue(this.settings.gitlabPath)
                .onChange(async (value) => {
                    this.settings.gitlabPath = value;
                    await this.plugin.saveSettings();
                }));
    }
} 