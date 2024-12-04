import { App, Plugin, Notice, Menu, TFile, PluginManifest } from 'obsidian';
import { SettingsTab } from './settings/settings-tab';
import { PluginSettings, DEFAULT_SETTINGS } from './settings/settings.interface';
import { VitePressPublisher, DirectoryNode } from './publishers/vitepress-publisher';
import { PublishHistoryService } from './services/publish-history.service';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/dashboard.view';
import { SuggestModal } from 'obsidian';

/**
 * Obsidian 发布插件主类
 * @extends Plugin
 */
export default class ObsidianPublisher extends Plugin {
	/** 插件设置 */
	public settings: PluginSettings;
	/** 发布器集合 */
	private publishers: Map<string, VitePressPublisher>;
	private publishHistory: PublishHistoryService;
	private dashboardView: DashboardView;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.publishers = new Map();
		this.publishHistory = new PublishHistoryService(this);
	}

	/**
	 * 插件加载时执行
	 */
	async onload() {
		await this.loadSettings();
		await this.publishHistory.load();

		// 初始化发布器
		this.initializePublishers();

		// 添加发布命令
		this.addCommand({
			id: 'publish-note',
			name: '发布当前笔记',
			callback: () => this.publishCurrentNote()
		});

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
					await publisher.publish(content, activeFile.path);
					new Notice('发布成功！');
				} catch (error) {
					new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
				}
			}
		});

		// 添加功能按钮到编辑器菜单
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

			menu.showAtMouseEvent(evt);
		});

		// 添加仪表盘按钮
		this.addRibbonIcon('gauge', '发布仪表盘', () => {
			this.openDashboard();
		});

		// 注册视图
		this.registerView(
			DASHBOARD_VIEW_TYPE,
			(leaf) => {
				this.dashboardView = new DashboardView(leaf, this.publishHistory, this.settings);
				
				// 发布/重新发布处理
				this.dashboardView.onRepublish = async (filePath: string, platform?: string) => {
					try {
						const file = this.app.vault.getAbstractFileByPath(filePath);
						if (!(file instanceof TFile)) {
							new Notice('文件不存在或不可访问');
							return;
						}

						const content = await this.app.vault.read(file);
						const publisher = this.publishers.get('vitepress');
						if (!publisher) {
							throw new Error('VitePress 发布器未启用');
						}

						if (platform) {
							const originalPlatform = this.settings.platform;
							this.settings.platform = platform as 'github';
							await publisher.publish(content, filePath);
							this.settings.platform = originalPlatform;
						} else {
							await publisher.publish(content, filePath);
						}
						
						new Notice('发布成功！');
						this.dashboardView.refresh();
					} catch (error) {
						new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
					}
				};

				// 从远程更新处理
				this.dashboardView.onUpdateFromRemote = async (filePath: string, platform: string) => {
					try {
						const file = this.app.vault.getAbstractFileByPath(filePath);
						if (!(file instanceof TFile)) {
							new Notice('本地文件不存在');
							return;
						}

						const publisher = this.publishers.get('vitepress');
						if (!publisher) {
							throw new Error('VitePress 发布器未启用');
						}

						const originalPlatform = this.settings.platform;
						this.settings.platform = platform as 'github';
						
						const content = await publisher.getRemoteContent(filePath);
						await this.app.vault.modify(file, content);
						
						this.settings.platform = originalPlatform;
						
						new Notice('从远程更新成功！');
						this.dashboardView.refresh();
					} catch (error) {
						new Notice(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
					}
				};

				// 从远程删除处理
				this.dashboardView.onDeleteFromRemote = async (filePath: string, platform: string) => {
					try {
						const publisher = this.publishers.get('vitepress');
						if (!publisher) {
							throw new Error('VitePress 发布器未启用');
						}

						const originalPlatform = this.settings.platform;
						this.settings.platform = platform as 'github';
						
						await publisher.deleteRemote(filePath);
						this.settings.platform = originalPlatform;
						
						this.publishHistory.removeRecord(filePath, platform);
						
						new Notice('从远程删除成功！');
						this.dashboardView.refresh();
					} catch (error) {
						new Notice(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
					}
				};

				return this.dashboardView;
			}
		);

		// 添加设置标签页
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	/**
	 * 显示发布选项菜单
	 */
	private showPublishMenu(evt: MouseEvent) {
		const menu = new Menu();

		// 检查 GitHub 是否启用
		if (!this.settings.githubEnabled) {
			new Notice('GitHub 发布功能未启用');
			return;
		}

		// 一键发布选项
		menu.addItem((item) => {
			item
				.setTitle('一键发布到 GitHub')
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
						new Notice('发布成功！');
					} catch (error) {
						new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
					}
				});
		});

		// 选择目录发布选项
		menu.addItem((item) => {
			item
				.setTitle('选择目录发布到 GitHub')
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
			const loadingNotice = new Notice('正在获取目录列表...', 0);
			const directories = await publisher.getDirectories();
			loadingNotice.hide();
			
			const menu = new Menu();

			// 递归创建目录菜单
			const createDirectoryMenu = (parentMenu: Menu, item: DirectoryNode) => {
				parentMenu.addItem((menuItem) => {
					const indent = '  '.repeat(item.level);
					menuItem.setTitle(indent + item.name);
					
					if (item.type === 'dir') {
						menuItem.setIcon(item.hasChildren ? 'chevron-right' : 'folder');
					} else {
						menuItem.setIcon('document');
					}
					
					menuItem.onClick(async (evt: MouseEvent) => {
						if (item.type === 'file') {
							// 如果选择的是文件，显示提示
							new Notice('请选择目录进行发布，不能选择文件');
							return;
						}

						if (item.type === 'dir' && item.hasChildren) {
							const target = evt.target as HTMLElement;
							const iconEl = target.closest('.menu-item')?.querySelector('.svg-icon');
							if (!iconEl) return;
							
							const iconRect = iconEl.getBoundingClientRect();
							const clickX = evt.clientX;
							
							// 如果点击在图标区域，展开子菜单
							if (clickX >= iconRect.left - 10 && clickX <= iconRect.right + 10) {
								evt.stopPropagation();
								
								if (!item.loaded) {
									item.isLoading = true;
									const subItems = await publisher.loadSubDirectories(item.path);
									item.children = subItems;
									item.loaded = true;
									item.isLoading = false;
								}
								
								const subMenu = new Menu();
								item.children.forEach(child => createDirectoryMenu(subMenu, child));
								
								const rect = target.closest('.menu-item')?.getBoundingClientRect();
								if (rect) {
									subMenu.showAtPosition({ x: rect.right, y: rect.top });
								}
							} else {
								// 击目录名称时执行发布
								await this.publishToSelectedDirectory(activeFile, item.path);
							}
						} else if (item.type === 'dir') {
							// 普通目录直接发布
							await this.publishToSelectedDirectory(activeFile, item.path);
						}
					});
				});
			};

			// 创建顶级目录和文件列表
			directories.forEach(item => createDirectoryMenu(menu, item));

			menu.showAtMouseEvent(evt);
		} catch (error) {
			new Notice(`获取目录列表失败：${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	/**
	 * 发布到选定的目录
	 */
	private async publishToSelectedDirectory(file: TFile, dirPath: string) {
		try {
			const content = await this.app.vault.read(file);
			const publisher = this.publishers.get('vitepress');
			
			// 构建远程路径：如果有选择目录，则将文件直接放在该目录下
			const remotePath = dirPath 
				? `${dirPath}/${file.name}`  // 直接使用文件名，而不是完整路径
				: file.name;
				
			await publisher?.publishToDirectory(content, remotePath, dirPath);
			new Notice('发布成功！');
		} catch (error) {
			new Notice(`发布失败：${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	/**
	 * 插件卸载时执行
	 */
	onunload() {
		this.app.workspace.detachLeavesOfType(DASHBOARD_VIEW_TYPE);
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
	}

	/**
	 * 初始化发布器
	 * 从私有方法变更为公开方法，允许外部调用
	 */
	public initializePublishers() {
		// 清空现有发布器
		this.publishers.clear();

		// 根据设置初始化 VitePress 发布器
		if (this.settings.vitepress.enabled) {
			if (this.settings.platform === 'github' && !this.settings.githubEnabled) {
				new Notice('GitHub 发布功能未启用');
				return;
			}
			this.publishers.set('vitepress', new VitePressPublisher(this, this.settings));
		}
	}

	/**
	 * 打开发布仪表盘
	 */
	async openDashboard() {
		const { workspace } = this.app;
		
		let leaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE });
		}
		
		workspace.revealLeaf(leaf);
	}

	public async recordPublish(filePath: string, remotePath: string, platform: 'github' , status: 'success' | 'failed' = 'success') {
		this.publishHistory.addRecord({
			filePath,
			remotePath,
			platform,
			lastPublished: Date.now(),
			status
		});
		
		if (this.dashboardView) {
			this.dashboardView.refresh();
		}
	}

	/**
	 * 发布当前打开的笔记
	 * @private
	 */
	private async publishCurrentNote() {
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
			await publisher.publish(content, activeFile.path);
			new Notice('发布成功！');
		} catch (error) {
			new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	/**
	 * 显示目录选择器并发布到选定目录
	 */
	async showDirectorySelector(activeFile: TFile) {
		const publisher = this.getPublisher();
		if (!publisher) return;

		try {
			const directories = await publisher.getDirectories();
			const modal = new DirectoryModal(
				this.app,
				directories,
				async (dir: DirectoryNode) => {
					await this.publishToSelectedDirectory(activeFile, dir.path);
				}
			);
			modal.open();
		} catch (error) {
			console.error('获取目录列表失败:', error);
			new Notice('获取目录列表失败');
		}
	}

	/**
	 * 获取发布器
	 */
	private getPublisher(): VitePressPublisher | undefined {
		return this.publishers.get('vitepress');
	}
}

class DirectoryModal extends SuggestModal<DirectoryNode> {
	private directories: DirectoryNode[];
	private onSelect: (dir: DirectoryNode) => void;

	constructor(app: App, directories: DirectoryNode[], onSelect: (dir: DirectoryNode) => void) {
		super(app);
		this.directories = directories;
		this.onSelect = onSelect;
		this.setPlaceholder('选择目标目录');
	}

	getSuggestions(): DirectoryNode[] {
		return this.directories;
	}

	renderSuggestion(dir: DirectoryNode, el: HTMLElement) {
		const indent = '  '.repeat(dir.level);
		el.setText(indent + dir.name);
	}

	onChooseSuggestion(dir: DirectoryNode) {
		this.onSelect(dir);
	}
}
