import { App, PluginSettingTab, Setting, Notice, ButtonComponent, setIcon } from 'obsidian';
import ObsidianPublisher from '../main';
import { GitHubService } from '../services/github.service';
import { GitLabService } from '../services/gitlab.service';
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

    private async validateGitLabConfig() {
        const service = new GitLabService({
            token: this.settings.gitlabToken,
            url: this.settings.gitlabUrl,
            projectId: this.settings.gitlabProjectId,
            branch: this.settings.gitlabBranch
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
                .setValue(this.settings.githubEnabled)
                .onChange(async (value) => {
                    this.settings.githubEnabled = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.settings.githubEnabled) {
            // GitHub Token
            const tokenSetting = new Setting(githubSection)
                .setName('GitHub Token')
                .setDesc('用于访问 GitHub API 的个人访问令牌')
                .addText(text => {
                    const textComponent = text
                        .setPlaceholder('ghp_xxxxxxxxxxxxxxxxxxxx')
                        .setValue(this.settings.githubToken)
                        .onChange(async (value) => {
                            this.settings.githubToken = value;
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
                    .setValue(this.settings.githubUsername)
                    .onChange(async (value) => {
                        this.settings.githubUsername = value;
                        await this.plugin.saveSettings();
                    }));

            // GitHub 仓库名
            new Setting(githubSection)
                .setName('GitHub 仓库名')
                .setDesc('你的 GitHub 仓库名')
                .addText(text => text
                    .setPlaceholder('repository')
                    .setValue(this.settings.githubRepo)
                    .onChange(async (value) => {
                        this.settings.githubRepo = value;
                        await this.plugin.saveSettings();
                    }));

            // GitHub 分支名
            new Setting(githubSection)
                .setName('GitHub 分支名')
                .setDesc('你的 GitHub 仓库分支名')
                .addText(text => text
                    .setPlaceholder('main')
                    .setValue(this.settings.githubBranch)
                    .onChange(async (value) => {
                        this.settings.githubBranch = value;
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

        // GitLab 设置区域
        const gitlabSection = containerEl.createEl('div', { cls: 'setting-section' });
        const gitlabHeader = gitlabSection.createEl('div', { cls: 'setting-section-header' });
        gitlabHeader.createEl('h3', { text: 'GitLab 设置' });

        // GitLab 启用开关
        new Setting(gitlabHeader)
            .setName('启用 GitLab')
            .setDesc('启用 GitLab 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.gitlabEnabled)
                .onChange(async (value) => {
                    this.settings.gitlabEnabled = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.settings.gitlabEnabled) {
            // GitLab Token
            const tokenSetting = new Setting(gitlabSection)
                .setName('GitLab Token')
                .setDesc('用于访问 GitLab API 的个人访问令牌')
                .addText(text => {
                    const textComponent = text
                        .setPlaceholder('glpat-xxxxxxxxxxxxxxxxxxxx')
                        .setValue(this.settings.gitlabToken)
                        .onChange(async (value) => {
                            this.settings.gitlabToken = value;
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

            // GitLab URL
            new Setting(gitlabSection)
                .setName('GitLab URL')
                .setDesc('你的 GitLab 实例 URL')
                .addText(text => text
                    .setPlaceholder('https://gitlab.com')
                    .setValue(this.settings.gitlabUrl)
                    .onChange(async (value) => {
                        this.settings.gitlabUrl = value;
                        await this.plugin.saveSettings();
                    }));

            // GitLab 项目 ID
            new Setting(gitlabSection)
                .setName('GitLab 项目 ID')
                .setDesc('你的 GitLab 项目 ID')
                .addText(text => text
                    .setPlaceholder('12345678')
                    .setValue(this.settings.gitlabProjectId)
                    .onChange(async (value) => {
                        this.settings.gitlabProjectId = value;
                        await this.plugin.saveSettings();
                    }));

            // GitLab 分支名
            new Setting(gitlabSection)
                .setName('GitLab 分支名')
                .setDesc('你的 GitLab 仓库分支名')
                .addText(text => text
                    .setPlaceholder('main')
                    .setValue(this.settings.gitlabBranch)
                    .onChange(async (value) => {
                        this.settings.gitlabBranch = value;
                        await this.plugin.saveSettings();
                    }));

            // GitLab 验证按钮
            new Setting(gitlabHeader)
                .addButton((button: ButtonComponent) => {
                    button
                        .setButtonText('验证配置')
                        .setCta()
                        .onClick(async () => {
                            button.setDisabled(true);
                            try {
                                await this.validateGitLabConfig();
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
            .setDesc('启用 VitePress 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.enabled)
                .onChange(async (value) => {
                    this.settings.vitepress.enabled = value;
                    await this.plugin.saveSettings();
                }));

        // VitePress 路径
        new Setting(vitepressSection)
            .setName('VitePress 路径')
            .setDesc('VitePress 文档目录路径')
            .addText(text => text
                .setPlaceholder('docs')
                .setValue(this.settings.vitepressPath)
                .onChange(async (value) => {
                    this.settings.vitepressPath = value;
                    await this.plugin.saveSettings();
                }));

        // 添加 frontmatter
        new Setting(vitepressSection)
            .setName('添加 frontmatter')
            .setDesc('自动为发布的文档添加 frontmatter')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.addFrontmatter)
                .onChange(async (value) => {
                    this.settings.vitepress.addFrontmatter = value;
                    await this.plugin.saveSettings();
                }));

        // 保持文件结构
        new Setting(vitepressSection)
            .setName('保持文件结构')
            .setDesc('保持原始文件的目录结构')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.keepFileStructure)
                .onChange(async (value) => {
                    this.settings.vitepress.keepFileStructure = value;
                    await this.plugin.saveSettings();
                }));

        // 默认目录
        new Setting(vitepressSection)
            .setName('默认目录')
            .setDesc('一键发布时的默认目录')
            .addText(text => text
                .setPlaceholder('guide')
                .setValue(this.settings.vitepress.defaultDirectory)
                .onChange(async (value) => {
                    this.settings.vitepress.defaultDirectory = value;
                    await this.plugin.saveSettings();
                }));

        // 发布平台选择
        new Setting(containerEl)
            .setName('发布平台')
            .setDesc('选择要使用的发布平台')
            .addDropdown(dropdown => dropdown
                .addOption('github', 'GitHub')
                .addOption('gitlab', 'GitLab')
                .setValue(this.settings.platform)
                .onChange(async (value: 'github' | 'gitlab') => {
                    this.settings.platform = value;
                    await this.plugin.saveSettings();
                }));
    }
} 