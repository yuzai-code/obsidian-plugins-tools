import { App, PluginSettingTab, Setting } from 'obsidian';
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

        this.addVitePressSettings();
    }

    /**
     * 添加 VitePress 相关设置选项
     * @private
     */
    private addVitePressSettings(): void {
        const { containerEl } = this;

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
    }
} 