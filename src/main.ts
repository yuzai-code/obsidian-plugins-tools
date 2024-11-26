import { Plugin, Notice, Menu, TFile } from 'obsidian';
import { SettingsTab } from './settings/settings-tab';
import { PluginSettings } from './settings/settings.interface';
import { VitePressPublisher } from './publishers/vitepress-publisher';
import { PublishHistoryService } from './services/publish-history.service';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/dashboard.view';

/**
 * 插件默认设置
 */
const DEFAULT_SETTINGS: PluginSettings = {
	githubToken: '',
	githubUsername: '',
	githubRepo: '',
	githubBranch: 'main',
	vitepressPath: 'docs',
	vitepress: {
		enabled: true,
		addFrontmatter: true,
		keepFileStructure: false,
		defaultDirectory: ''
	},
	gitlabToken: '',
	gitlabUsername: '',
	gitlabRepo: '',
	gitlabBranch: 'main',
	gitlabPath: 'docs',
	gitlabEnabled: false,
	platform: 'github',
	gitlabUrl: '',
	gitlabProjectId: ''
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
	private publishHistory: PublishHistoryService;
	private dashboardView: DashboardView;

	/**
	 * 插件加载时执行
	 */
	async onload() {
		await this.loadSettings();
		this.initializePublishers();
		this.addCommands();
		this.addSettingTab(new SettingsTab(this.app, this));
		this.initializeRibbonIcon();

		this.publishHistory = new PublishHistoryService(this);
		await this.publishHistory.load();

		this.registerView(
			DASHBOARD_VIEW_TYPE,
			(leaf) => (this.dashboardView = new DashboardView(leaf, this.publishHistory))
		);

		this.addCommand({
			id: 'open-publish-dashboard',
			name: '打开发布仪表盘',
			callback: () => this.openDashboard()
		});

		this.addRibbonIcon('gauge', '发布仪表盘', () => this.openDashboard());

		// 添加一键发布命令
		this.addCommand({
			id: 'quick-publish',
			name: '一键发布到 VitePress',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('没有打开的文件');
					return;
				}

				try {
					const content = await this.app.vault.read(activeFile);
					const publisher = this.publishers.get('vitepress');
					if (!publisher) {
						throw new Error('VitePress 发布器未启用');
					}
					await publisher.quickPublish(content, activeFile.path);
					new Notice('发布成功！');
				} catch (error) {
					new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
				}
			}
		});
	}

	/**
	 * 初始化所有发布器
	 * @private
	 */
	private initializePublishers() {
		this.publishers = new Map();
		
		if (this.settings.vitepress.enabled) {
			this.publishers.set('vitepress', new VitePressPublisher(this, this.settings));
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

	/**
	 * 添加功能按钮到编辑器菜单
	 */
	private initializeRibbonIcon() {
		this.addRibbonIcon('paper-plane', '发布笔记', (evt: MouseEvent) => {
			const menu = new Menu();

			// 添加平台选择子菜单
			menu.addItem((item) => {
				item
					.setTitle('GitHub')
					.setIcon('github')
					.onClick(async () => {
						this.settings.platform = 'github';
						await this.saveSettings();
						this.showPublishMenu(evt);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('GitLab')
					.setIcon('gitlab')
					.onClick(async () => {
						this.settings.platform = 'gitlab';
						await this.saveSettings();
						this.showPublishMenu(evt);
					});
			});

			menu.showAtMouseEvent(evt);
		});
	}

	/**
	 * 显示发布选项菜单
	 */
	private showPublishMenu(evt: MouseEvent) {
		const menu = new Menu();

		// 一键发布选项
		menu.addItem((item) => {
			item
				.setTitle(`一键发布到 ${this.settings.platform === 'github' ? 'GitHub' : 'GitLab'}`)
				.setIcon('rocket')
				.onClick(async () => {
					const activeFile = this.app.workspace.getActiveFile();
					if (!activeFile) {
						new Notice('没有打开的文件');
						return;
					}

					try {
						const content = await this.app.vault.read(activeFile);
						const publisher = this.publishers.get('vitepress');
						if (!publisher) {
							throw new Error('VitePress 发布器未启用');
						}
						await publisher.quickPublish(content, activeFile.path);
						new Notice(`成功发布到 ${this.settings.platform === 'github' ? 'GitHub' : 'GitLab'}！`);
					} catch (error) {
						new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
					}
				});
		});

		// 选择目录发布选项
		menu.addItem((item) => {
			item
				.setTitle(`选择目录发布到 ${this.settings.platform === 'github' ? 'GitHub' : 'GitLab'}`)
				.setIcon('folder')
				.onClick(async () => {
					await this.publishWithDirectorySelection(evt);
				});
		});

		menu.showAtMouseEvent(evt);
	}

	/**
	 * 显示目录选择对话框并发布
	 */
	private async publishWithDirectorySelection(evt: MouseEvent) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('没有打开的文件');
			return;
		}

		const publisher = this.publishers.get('vitepress');
		if (!publisher) {
			new Notice('VitePress 发布器未启用');
			return;
		}

		try {
			const directories = await publisher.getDirectories();
			const menu = new Menu();

			// 添加根目录选项
			menu.addItem((item) => {
				item
					.setTitle('根目录')
					.onClick(async () => {
						await this.publishToSelectedDirectory(activeFile, '');
					});
			});

			// 添加现有目录选项
			for (const dir of directories) {
				menu.addItem((item) => {
					item
						.setTitle(dir)
						.onClick(async () => {
							await this.publishToSelectedDirectory(activeFile, dir);
						});
				});
			}

			menu.showAtMouseEvent(evt);
		} catch (error) {
			new Notice(`获取目录列表失败：${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	/**
	 * 发布到选定的目录
	 */
	private async publishToSelectedDirectory(file: TFile, directory: string) {
		try {
			const content = await this.app.vault.read(file);
			const publisher = this.publishers.get('vitepress');
			await publisher?.publishToDirectory(content, file.path, directory);
			new Notice('发布成功！');
		} catch (error) {
			new Notice(`发布失败：${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	async openDashboard() {
		const { workspace } = this.app;
		
		let leaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE });
		}
		
		workspace.revealLeaf(leaf);
	}

	public async recordPublish(filePath: string, remotePath: string, platform: 'github' | 'gitlab') {
		this.publishHistory.addRecord({
			filePath,
			remotePath,
			platform,
			lastPublished: Date.now(),
			status: 'success'
		});
		
		if (this.dashboardView) {
			this.dashboardView.refresh();
		}
	}
}


