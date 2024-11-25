import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianPublisher from '../main';

export class PublisherSettingTab extends PluginSettingTab {
    plugin: ObsidianPublisher;

    constructor(app: App, plugin: ObsidianPublisher) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.addVitePressSettings();
        // 后续可以添加其他平台的设置
        // this.addNotionSettings();
    }

    private addVitePressSettings(): void {
        const { containerEl } = this;

        containerEl.createEl('h3', { text: 'VitePress 设置' });

        new Setting(containerEl)
            .setName('启用 VitePress 发布')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vitepress.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.vitepress.enabled = value;
                    await this.plugin.saveSettings();
                }));

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
    }
} 