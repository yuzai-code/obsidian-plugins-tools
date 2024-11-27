import { App, Plugin, Notice, Menu, TFile, PluginManifest } from 'obsidian';
import { SettingsTab } from './settings/settings-tab';
import { PluginSettings, DEFAULT_SETTINGS } from './settings/settings.interface';
import { VitePressPublisher, DirectoryNode } from './publishers/vitepress-publisher';
import { PublishHistoryService } from './services/publish-history.service';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/dashboard.view';
import { SuggestModal } from 'obsidian';
import { setIcon } from 'obsidian';

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

		// 添加仪表盘命令
		this.addCommand({
			id: 'open-dashboard',
			name: '打开发布仪表盘',
			callback: () => this.openDashboard()
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
					await publisher.quickPublish(content, activeFile.path);
					new Notice('发布成功！');
				} catch (error) {
					new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
				}
			}
		});

		// 添加设置标签页
		this.addSettingTab(new SettingsTab(this.app, this));

		// 添加功能钮到编辑器菜单
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

		// 添加仪表盘按钮
		this.addRibbonIcon('gauge', '发布仪表盘', () => this.openDashboard());

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

						// 如果指定了平台，则临时切换平台
						if (platform) {
							const originalPlatform = this.settings.platform;
							this.settings.platform = platform as 'github' | 'gitlab';
							await publisher.publish(content, filePath);
							this.settings.platform = originalPlatform;
						} else {
							await publisher.publish(content, filePath);
						}
						
						new Notice('发布成功！');
						// 刷新仪表盘视图
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

						// 临时切换平台
						const originalPlatform = this.settings.platform;
						this.settings.platform = platform as 'github' | 'gitlab';
						
						// 从远程获取内容
						const content = await publisher.getRemoteContent(filePath);
						
						// 更新本地文件
						await this.app.vault.modify(file, content);
						
						// 恢复原平台设置
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

						// 临时切换平台
						const originalPlatform = this.settings.platform;
						this.settings.platform = platform as 'github' | 'gitlab';
						
						// 删除远程文件
						await publisher.deleteRemote(filePath);
						
						// 恢复原平台设置
						this.settings.platform = originalPlatform;
						
						// 更新发布历史
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
	}

	/**
	 * 显示发布选项菜单
	 */
	private showPublishMenu(evt: MouseEvent) {
		const menu = new Menu();

		// 检查当前平台是否启用
		const isEnabled = this.settings.platform === 'github' 
			? this.settings.githubEnabled 
			: this.settings.gitlabEnabled;

		if (!isEnabled) {
			new Notice(`${this.settings.platform === 'github' ? 'GitHub' : 'GitLab'} 发布功能未启用`);
			return;
		}

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

			// 递归创建目录菜单
			const createDirectoryMenu = (parentMenu: Menu, dir: DirectoryNode) => {
				parentMenu.addItem((item) => {
					const hasChildren = dir.children.length > 0;
					
					// 使用 setTitle 来设置带缩进的文本
					const indent = '  '.repeat(dir.level);
					item.setTitle(indent + dir.name);
					
					// 设置图标
					if (hasChildren) {
						item.setIcon('chevron-right');
					} else {
						item.setIcon('folder');
					}
					
					// 处理点击事件
					item.onClick(async (evt: MouseEvent) => {
						const target = evt.target as HTMLElement;
						const menuItem = target.closest('.menu-item');
						if (!menuItem) return;
						
						// 获取图标区域的位置
						const iconEl = menuItem.querySelector('.svg-icon');
						if (!iconEl) return;
						
						const iconRect = iconEl.getBoundingClientRect();
						const clickX = evt.clientX;
						
						// 扩大图标的点击区域，左右各增加 10px
						const expandedIconArea = {
							left: iconRect.left - 10,
							right: iconRect.right + 10
						};
						
						// 如果点击在扩展的图标区域内且有子目录，则展开子菜单
						if (hasChildren && clickX >= expandedIconArea.left && clickX <= expandedIconArea.right) {
							evt.stopPropagation();
							const subMenu = new Menu();
							dir.children.forEach(child => createDirectoryMenu(subMenu, child));
							
							// 计算子菜单的位置
							const rect = menuItem.getBoundingClientRect();
							subMenu.showAtPosition({
								x: rect.right,
								y: rect.top
							});
						} else {
							// 如果点击在图标区域外，则执行发布操作
							await this.publishToSelectedDirectory(activeFile, dir.path);
						}
					});
				});
			};

			// 创建顶级目录
			directories.forEach(dir => createDirectoryMenu(menu, dir));

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
	 */
	private initializePublishers() {
		if (this.settings.vitepress.enabled) {
			if (this.settings.platform === 'github' && !this.settings.githubEnabled) {
				new Notice('GitHub 发布功能未启用');
				return;
			}
			if (this.settings.platform === 'gitlab' && !this.settings.gitlabEnabled) {
				new Notice('GitLab 发布功能未启用');
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

	public async recordPublish(filePath: string, remotePath: string, platform: 'github' | 'gitlab', status: 'success' | 'failed' = 'success') {
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


