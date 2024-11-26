import { Plugin, Notice } from 'obsidian';
import { PublisherSettingTab } from './settings/settings-tab';
import { PluginSettings } from './settings/settings.interface';
import { VitePressPublisher } from './publishers/vitepress-publisher';

/**
 * 插件默认设置
 */
const DEFAULT_SETTINGS: PluginSettings = {
	vitepress: {
		enabled: false,
		outputPath: '',
		siteName: 'My VitePress Site'
	},
	githubToken: '',
	githubUsername: '',
	githubRepo: '',
	githubBranch: 'main',
	vitepressPath: 'docs'
};

/**
 * Obsidian 发布插件主类
 * @extends Plugin
 */
export default class ObsidianPublisher extends Plugin {
	/** 插件设置 */
	settings: PluginSettings;
	/** 发布器集合 */
	private publishers: Map<string, VitePressPublisher>;

	/**
	 * 插件加载时执行
	 */
	async onload() {
		await this.loadSettings();
		this.initializePublishers();
		this.addCommands();
		this.addSettingTab(new PublisherSettingTab(this.app, this));
	}

	/**
	 * 初始化所有发布器
	 * @private
	 */
	private initializePublishers() {
		this.publishers = new Map();
		
		if (this.settings.vitepress.enabled) {
			this.publishers.set('vitepress', new VitePressPublisher(this.settings));
		}
	}

	/**
	 * 添加命令到命令面板
	 * @private
	 */
	private addCommands() {
		this.publishers.forEach((publisher, key) => {
			this.addCommand({
				id: `publish-to-${key}`,
				name: `发布到 ${publisher.getName()}`,
				callback: () => this.publishTo(key)
			});
		});
	}

	/**
	 * 加载插件设置
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * 保存插件设置
	 */
	async saveSettings() {
		await this.saveData(this.settings);
		this.initializePublishers();
	}

	/**
	 * 发布内容到指定平台
	 * @private
	 * @param {string} platform - 目标平台标识
	 */
	private async publishTo(platform: string) {
		const publisher = this.publishers.get(platform);
		if (!publisher) {
			new Notice(`未找到 ${platform} 发布器`);
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('没有打开的文件');
			return;
		}

		try {
			const content = await this.app.vault.read(activeFile);
			await publisher.publish(content, activeFile.path);
			new Notice(`成功发布到 ${publisher.getName()}！`);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : '未知错误';
			new Notice(`发布失败：${errorMessage}`);
		}
	}
}


