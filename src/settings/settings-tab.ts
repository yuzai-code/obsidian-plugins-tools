import { App, PluginSettingTab, Setting, Notice, ButtonComponent, setIcon } from 'obsidian';
import ObsidianPublisher from '../main';
import { GitHubService } from '../services/github.service';
import { PluginSettings } from '../settings/settings.interface';

export class SettingsTab extends PluginSettingTab {
    private plugin: ObsidianPublisher;
    private settings: PluginSettings;

    constructor(app: App, plugin: ObsidianPublisher) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = plugin.settings;
    }

    private async validateGitHubConfig() {
        const service = new GitHubService({
            token: this.settings.githubToken,
            username: this.settings.githubUsername,
            repo: this.settings.githubRepo,
            branch: this.settings.githubBranch
        });
        const result = await service.validateConfig();
        new Notice(result.message);
        return result.success;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 标题
        containerEl.createEl('h2', { text: 'VitePress 发布设置' });

        // GitHub 设置区域
        const githubSection = containerEl.createEl('div', { cls: 'setting-section' });
        const githubHeader = githubSection.createEl('div', { cls: 'setting-section-header' });
        githubHeader.createEl('h3', { text: 'GitHub 设置' });

        // GitHub 启用开关
        new Setting(githubHeader)
            .setName('启用 GitHub')
            .setDesc('启用 GitHub 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.githubEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.githubEnabled = value;
                    await this.plugin.saveSettings();
                    this.plugin.initializePublishers();
                    this.display();
                }));

        if (this.plugin.settings.githubEnabled) {
            // GitHub Token
            new Setting(githubSection)
                .setName('GitHub Token')
                .setDesc('用于访问 GitHub API 的个人访问令牌')
                .addText(text => {
                    const textComponent = text
                        .setPlaceholder('ghp_xxxxxxxxxxxxxxxxxxxx')
                        .setValue(this.plugin.settings.githubToken)
                        .onChange(async (value) => {
                            this.plugin.settings.githubToken = value;
                            await this.plugin.saveSettings();
                        });

                    // 添加显示/隐藏密码按钮
                    textComponent.inputEl.type = 'password';
                    const toggleButton = textComponent.inputEl.parentElement?.createEl('button', {
                        cls: 'password-toggle-button'
                    });

                    if (toggleButton) {
                        setIcon(toggleButton, 'eye-off');
                        
                        toggleButton.addEventListener('click', () => {
                            const isPassword = textComponent.inputEl.type === 'password';
                            textComponent.inputEl.type = isPassword ? 'text' : 'password';
                            setIcon(toggleButton, isPassword ? 'eye' : 'eye-off');
                        });
                        
                        textComponent.inputEl.after(toggleButton);
                    }

                    return textComponent;
                });

            // GitHub 用户名
            new Setting(githubSection)
                .setName('GitHub 用户名')
                .setDesc('你的 GitHub 用户名')
                .addText(text => text
                    .setPlaceholder('username')
                    .setValue(this.plugin.settings.githubUsername)
                    .onChange(async (value) => {
                        this.plugin.settings.githubUsername = value;
                        await this.plugin.saveSettings();
                    }));

            // GitHub 仓库名
            new Setting(githubSection)
                .setName('GitHub 仓库名')
                .setDesc('你的 GitHub 仓库名')
                .addText(text => text
                    .setPlaceholder('repository')
                    .setValue(this.plugin.settings.githubRepo)
                    .onChange(async (value) => {
                        this.plugin.settings.githubRepo = value;
                        await this.plugin.saveSettings();
                    }));

            // GitHub 分支名
            new Setting(githubSection)
                .setName('GitHub 分支名')
                .setDesc('你的 GitHub 仓库分支名')
                .addText(text => text
                    .setPlaceholder('main')
                    .setValue(this.plugin.settings.githubBranch)
                    .onChange(async (value) => {
                        this.plugin.settings.githubBranch = value;
                        await this.plugin.saveSettings();
                    }));

            // GitHub 验证按钮
            new Setting(githubHeader)
                .addButton((button: ButtonComponent) => {
                    button
                        .setButtonText('验证配置')
                        .setCta()
                        .onClick(async () => {
                            button.setDisabled(true);
                            try {
                                await this.validateGitHubConfig();
                            } finally {
                                button.setDisabled(false);
                            }
                        });
                });
        }

        // VitePress 设置区域
        const vitepressSection = containerEl.createEl('div', { cls: 'setting-section' });
        vitepressSection.createEl('h3', { text: 'VitePress 设置' });

        // VitePress 启用开关
        new Setting(vitepressSection)
            .setName('启用 VitePress')
            .setDesc('是否启用 VitePress 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vitepress.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.enabled = value;
                    await this.plugin.saveSettings();
                    this.plugin.initializePublishers();
                    new Notice('VitePress设置已更新');
                    this.display();
                }));

        // VitePress 路径
        new Setting(vitepressSection)
            .setName('VitePress 路径')
            .setDesc('VitePress 文档目录路径')
            .addText(text => text
                .setPlaceholder('docs')
                .setValue(this.plugin.settings.vitepressPath)
                .onChange(async (value) => {
                    this.plugin.settings.vitepressPath = value;
                    await this.plugin.saveSettings();
                }));

        // 添加 frontmatter
        new Setting(vitepressSection)
            .setName('添加 frontmatter')
            .setDesc('自动为发布的文档添加 frontmatter')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vitepress.addFrontmatter)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.addFrontmatter = value;
                    await this.plugin.saveSettings();
                }));

        // 保持文件结构
        new Setting(vitepressSection)
            .setName('保持文件结构')
            .setDesc('保持原始文件的目录结构')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vitepress.keepFileStructure)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.keepFileStructure = value;
                    await this.plugin.saveSettings();
                }));

        // 默认目录
        new Setting(vitepressSection)
            .setName('默认目录')
            .setDesc('一键发布时的默认目录')
            .addText(text => text
                .setPlaceholder('guide')
                .setValue(this.plugin.settings.vitepress.defaultDirectory)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.defaultDirectory = value;
                    await this.plugin.saveSettings();
                }));

        // 发布平台选择
        new Setting(containerEl)
            .setName('发布平台')
            .setDesc('选择要使用的发布平台')
            .addDropdown(dropdown => dropdown
                .addOption('github', 'GitHub')
                .setValue(this.plugin.settings.platform)
                .onChange(async (value: 'github') => {
                    this.plugin.settings.platform = value;
                    await this.plugin.saveSettings();
                }));
    }
}