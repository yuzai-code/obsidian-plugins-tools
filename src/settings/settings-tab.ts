import { App, PluginSettingTab, Setting, TextComponent, setIcon, Notice, ButtonComponent } from 'obsidian';
import { PluginSettings } from './settings.interface';
import ObsidianVitePressPlugin from '../main';
import { GitHubService } from '../services/github.service';
import { GitLabService } from '../services/gitlab.service';

export class SettingsTab extends PluginSettingTab {
    private plugin: ObsidianVitePressPlugin;
    private settings: PluginSettings;

    constructor(app: App, plugin: ObsidianVitePressPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = plugin.settings;
    }

    private async validateGitHubConfig() {
        const { githubToken, githubUsername, githubRepo, githubBranch } = this.settings;
        if (!githubToken || !githubUsername || !githubRepo) {
            new Notice('请先填写完整的 GitHub 配置信息');
            return;
        }

        const githubService = new GitHubService({
            token: githubToken,
            username: githubUsername,
            repo: githubRepo,
            branch: githubBranch
        });

        const result = await githubService.validateConfig();
        new Notice(result.message);
    }

    private async validateGitLabConfig() {
        const { gitlabToken, gitlabUsername, gitlabRepo } = this.settings;
        if (!gitlabToken || !gitlabUsername || !gitlabRepo) {
            new Notice('请先填写完整的 GitLab 配置信息');
            return;
        }

        const gitlabService = new GitLabService({
            token: gitlabToken,
            url: 'https://gitlab.com', // 这里可能需要从设置中获取
            projectId: `${gitlabUsername}/${gitlabRepo}`,
            branch: this.settings.gitlabBranch
        });

        const result = await gitlabService.validateConfig();
        new Notice(result.message);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 添加样式
        containerEl.createEl('style', {
            text: `
                .setting-item.setting-item-heading {
                    padding: 18px 0 8px 0;
                    border-top: 1px solid var(--background-modifier-border);
                    margin-top: 18px;
                }
                .setting-item.setting-item-heading:first-child {
                    border-top: none;
                    margin-top: 0;
                }
                .setting-item-heading .setting-item-name {
                    font-size: 1.2em;
                    font-weight: 600;
                }
                .setting-item-info {
                    margin-bottom: 12px;
                }
                .setting-item-control {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .setting-item-control button {
                    white-space: nowrap;
                    padding: 4px 12px;
                }
                .setting-item-control button:hover {
                    background-color: var(--interactive-accent-hover);
                }
                .github-section, .gitlab-section {
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 8px;
                    padding: 16px;
                    margin: 16px 0;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                }
                .section-title {
                    margin: 0;
                    font-size: 1.2em;
                    font-weight: 600;
                }
                .validate-button {
                    background-color: var(--interactive-accent);
                    color: var(--text-on-accent);
                }
            `
        });

        // VitePress 设置区域
        const vitepressSection = containerEl.createDiv({ cls: 'vitepress-section' });
        vitepressSection.createEl('div', { cls: 'section-header' }).createEl('h2', { 
            cls: 'section-title',
            text: 'VitePress 设置'
        });

        new Setting(vitepressSection)
            .setName('启用 VitePress 发布')
            .setDesc('是否启用 VitePress 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.enabled)
                .onChange(async (value) => {
                    this.settings.vitepress.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(vitepressSection)
            .setName('添加 Frontmatter')
            .setDesc('自动为发布的文档添加 frontmatter')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.addFrontmatter)
                .onChange(async (value) => {
                    this.settings.vitepress.addFrontmatter = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(vitepressSection)
            .setName('保持文件结构')
            .setDesc('发布时保持原有的文件目录结构')
            .addToggle(toggle => toggle
                .setValue(this.settings.vitepress.keepFileStructure)
                .onChange(async (value) => {
                    this.settings.vitepress.keepFileStructure = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(vitepressSection)
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
        const githubSection = containerEl.createDiv({ cls: 'github-section' });
        const githubHeader = githubSection.createDiv({ cls: 'section-header' });
        githubHeader.createEl('h2', { 
            cls: 'section-title',
            text: 'GitHub 设置'
        });

        // GitHub 启用开关
        new Setting(githubSection)
            .setName('启用 GitHub')
            .setDesc('是否启用 GitHub 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.githubEnabled)
                .onChange(async (value) => {
                    this.settings.githubEnabled = value;
                    await this.plugin.saveSettings();
                }));

        // GitHub 验证按钮
        new Setting(githubHeader)
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText('验证配置')
                    .setCta()
                    .setDisabled(!this.settings.githubEnabled)
                    .onClick(() => this.validateGitHubConfig());
                return button;
            });

        new Setting(githubSection)
            .setName('GitHub Token')
            .setDesc('用于访问 GitHub API 的个人访问令牌')
            .addText((text) => {
                const textComponent = text
                    .setPlaceholder('输入你的 GitHub Token')
                    .setValue(this.settings.githubToken)
                    .onChange(async (value) => {
                        this.settings.githubToken = value;
                        await this.plugin.saveSettings();
                    });
                
                textComponent.inputEl.type = 'password';
                
                const toggleButton = createEl('button', {
                    cls: 'github-token-toggle',
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

        new Setting(githubSection)
            .setName('GitHub 用户名')
            .setDesc('你的 GitHub 用户名')
            .addText(text => text
                .setPlaceholder('输入你的 GitHub 用户名')
                .setValue(this.settings.githubUsername)
                .onChange(async (value) => {
                    this.settings.githubUsername = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(githubSection)
            .setName('GitHub 仓库')
            .setDesc('VitePress 站点所在的仓库名')
            .addText(text => text
                .setPlaceholder('输入仓库名')
                .setValue(this.settings.githubRepo)
                .onChange(async (value) => {
                    this.settings.githubRepo = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(githubSection)
            .setName('GitHub 分支')
            .setDesc('要发布到的分支名称')
            .addText(text => text
                .setPlaceholder('例如: main')
                .setValue(this.settings.githubBranch)
                .onChange(async (value) => {
                    this.settings.githubBranch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(githubSection)
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
        const gitlabSection = containerEl.createDiv({ cls: 'gitlab-section' });
        const gitlabHeader = gitlabSection.createDiv({ cls: 'section-header' });
        gitlabHeader.createEl('h2', { 
            cls: 'section-title',
            text: 'GitLab 设置'
        });

        // GitLab 验证按钮
        new Setting(gitlabHeader)
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText('验证配置')
                    .setCta()
                    .onClick(() => this.validateGitLabConfig());
                return button;
            });

        new Setting(gitlabSection)
            .setName('启用 GitLab')
            .setDesc('是否启用 GitLab 发布功能')
            .addToggle(toggle => toggle
                .setValue(this.settings.gitlabEnabled)
                .onChange(async (value) => {
                    this.settings.gitlabEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(gitlabSection)
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
                
                textComponent.inputEl.type = 'password';
                
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

        new Setting(gitlabSection)
            .setName('GitLab 用户名')
            .setDesc('你的 GitLab 用户名')
            .addText(text => text
                .setPlaceholder('输入你的 GitLab 用户名')
                .setValue(this.settings.gitlabUsername)
                .onChange(async (value) => {
                    this.settings.gitlabUsername = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(gitlabSection)
            .setName('GitLab 仓库')
            .setDesc('GitLab 仓库名称')
            .addText(text => text
                .setPlaceholder('输入仓库名')
                .setValue(this.settings.gitlabRepo)
                .onChange(async (value) => {
                    this.settings.gitlabRepo = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(gitlabSection)
            .setName('GitLab 分支')
            .setDesc('要发布到的分支名称')
            .addText(text => text
                .setPlaceholder('例如: main')
                .setValue(this.settings.gitlabBranch)
                .onChange(async (value) => {
                    this.settings.gitlabBranch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(gitlabSection)
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