import { Plugin, Notice } from 'obsidian';
import { PublisherSettingTab } from './settings/settings-tab';
import { PluginSettings } from './settings/settings.interface';
import { VitePressPublisher } from './publishers/vitepress-publisher';

const DEFAULT_SETTINGS: PluginSettings = {
	vitepress: {
		enabled: false,
		outputPath: '',
		siteName: 'My VitePress Site'
	}
};

export default class ObsidianPublisher extends Plugin {
	settings: PluginSettings;
	private publishers: Map<string, VitePressPublisher>;

	async onload() {
		await this.loadSettings();
		this.initializePublishers();
		this.addCommands();
		this.addSettingTab(new PublisherSettingTab(this.app, this));
	}

	private initializePublishers() {
		this.publishers = new Map();
		
		if (this.settings.vitepress.enabled) {
			this.publishers.set('vitepress', new VitePressPublisher(this.settings.vitepress));
		}
	}

	private addCommands() {
		this.publishers.forEach((publisher, key) => {
			this.addCommand({
				id: `publish-to-${key}`,
				name: `发布到 ${publisher.getName()}`,
				callback: () => this.publishTo(key)
			});
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initializePublishers();
	}

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


