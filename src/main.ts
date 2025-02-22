import { App, Plugin, Notice, Menu, TFile, PluginManifest, Modal, TextComponent } from 'obsidian';
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
		const styleEl = document.createElement('style');
		styleEl.textContent = styles;
		document.head.appendChild(styleEl);
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

		if (!this.settings.githubEnabled) {
			new Notice('GitHub 发布功能未启用');
			return;
		}

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
						if (!publisher) throw new Error('VitePress 发布器未启用');
						await publisher.quickPublish(content, activeFile.path);
						new Notice('发布成功！');
					} catch (error) {
						new Notice(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('选择目录发布到 GitHub')
				.setIcon('folder')
				.onClick(() => this.publishWithDirectorySelection(evt));
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
			
			new DirectorySelectionModal(this.app, directories, publisher, activeFile, this).open();
		} catch (error) {
			new Notice(`获取目录列表失败：${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	/**
	 * 发布到选定的目录
	 */
	public async publishToSelectedDirectory(file: TFile, dirPath: string) {
		try {
			const content = await this.app.vault.read(file);
			const publisher = this.publishers.get('vitepress');
			const remotePath = dirPath ? `${dirPath}/${file.name}` : file.name;
			await publisher?.publishToDirectory(content, remotePath, dirPath);
			new Notice('发布成功！');
			this.recordPublish(file.path, remotePath, 'github', 'success');
		} catch (error) {
			new Notice(`发布失败：${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	/**
	 * 插件卸载时执行
	 */
	onunload() {
		// 移除 detach leaves 代码
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

// 自定义目录选择弹窗
class DirectorySelectionModal extends Modal {
	private directories: DirectoryNode[];
	private publisher: VitePressPublisher;
	private activeFile: TFile;
	private plugin: ObsidianPublisher;
	private filteredDirectories: DirectoryNode[];

	constructor(
		app: App,
		directories: DirectoryNode[],
		publisher: VitePressPublisher,
		activeFile: TFile,
		plugin: ObsidianPublisher
	) {
		super(app);
		this.directories = directories;
		this.publisher = publisher;
		this.activeFile = activeFile;
		this.plugin = plugin;
		this.filteredDirectories = [...directories];
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('directory-selection-modal');

		// 设置弹窗标题
		this.titleEl.setText('选择发布目录');

		// 添加搜索框
		const searchInput = new TextComponent(contentEl);
		searchInput.setPlaceholder('搜索一级目录...');
		searchInput.onChange((value) => this.filterDirectories(value));
		searchInput.inputEl.style.width = '100%';
		searchInput.inputEl.style.marginBottom = '10px';

		// 创建目录列表容器
		const listContainer = contentEl.createEl('div', { cls: 'directory-list' });
		listContainer.style.maxHeight = '300px';
		listContainer.style.overflowY = 'auto';

		// 渲染初始列表
		this.renderDirectoryList(listContainer);
	}

	// 过滤目录
	filterDirectories(searchTerm: string) {
		const term = searchTerm.toLowerCase();
		if (!term) {
			// 如果搜索词为空，恢复原始目录结构
			this.filteredDirectories = [...this.directories];
		} else {
			// 搜索并保持目录结构
			this.filteredDirectories = this.filterDirectoryTree(this.directories, term);
		}
		this.updateDirectoryList();
	}

	// 添加新的过滤树方法
	private filterDirectoryTree(dirs: DirectoryNode[], term: string): DirectoryNode[] {
		return dirs.reduce((filtered: DirectoryNode[], dir) => {
			// 创建目录节点的副本
			const dirCopy = { ...dir, children: [] as DirectoryNode[] };
			
			// 如果有子目录，递归过滤
			if (dir.children && dir.children.length > 0) {
				dirCopy.children = this.filterDirectoryTree(dir.children, term);
			}

			// 如果当前目录名称匹配或者有匹配的子目录，则包含此目录
			if (dir.name.toLowerCase().includes(term) || dirCopy.children.length > 0) {
				// 保持原有的展开状态
				dirCopy.isExpanded = dir.isExpanded;
				dirCopy.loaded = dir.loaded;
				filtered.push(dirCopy);
			}

			return filtered;
		}, []);
	}

	// 更新目录列表
	updateDirectoryList() {
		const listContainer = this.contentEl.querySelector('.directory-list');
		if (listContainer) {
			listContainer.empty();
			this.renderDirectoryList(listContainer as HTMLElement);
		}
	}

	// 渲染目录列表
	renderDirectoryList(container: HTMLElement) {
		container.empty();
		
		const createTreeItem = (item: DirectoryNode, parentEl: HTMLElement) => {
			const itemContainer = parentEl.createEl('div', {
				cls: 'directory-tree-item'
			});

			// 创建目录项主体
			const itemContent = itemContainer.createEl('div', {
				cls: 'directory-item-content'
			});

			// 创建左侧缩进和图标容器
			const leftContainer = itemContent.createEl('div', {
				cls: 'directory-left-container'
			});

			// 缩进占位
			for (let i = 0; i < item.level; i++) {
				leftContainer.createEl('span', {
					cls: 'directory-indent-spacer'
				});
			}

			// 展开/折叠图标容器
			const toggleContainer = leftContainer.createEl('span', {
				cls: 'directory-toggle-container'
			});

			// 展开/折叠图标
			if (item.hasChildren) {
				const toggleIcon = toggleContainer.createEl('span', {
					cls: `directory-toggle ${item.loaded && item.isExpanded ? 'expanded' : ''}`
				});
				
				// 添加加载中状态
				if (item.isLoading) {
					toggleIcon.innerHTML = '⌛'; // 或者使用其他加载图标
					toggleIcon.addClass('loading');
				} else {
					toggleIcon.innerHTML = '▶';
				}
			}

			// 目录图标
			const iconEl = leftContainer.createEl('span', {
				cls: `directory-icon ${item.hasChildren ? 'folder' : 'document'}`
			});
			iconEl.innerHTML = item.hasChildren ? '📁' : '📄';

			// 目录名称和按钮容器
			const contentContainer = itemContent.createEl('div', {
				cls: 'directory-content-container'
			});

			// 目录名称
			contentContainer.createEl('span', {
				text: item.name,
				cls: 'directory-name'
			});

			// 发布按钮
			if (item.type === 'dir') {
				const publishButton = contentContainer.createEl('button', {
					cls: 'directory-publish-button',
					text: '发布到此处'
				});
				
				publishButton.onclick = async (evt) => {
					evt.stopPropagation();
					try {
						const content = await this.app.vault.read(this.activeFile);
						const remotePath = item.path ? `${item.path}/${this.activeFile.name}` : this.activeFile.name;
						await this.publisher.publishToDirectory(content, remotePath, item.path);
						new Notice('发布成功！');
						this.close();
					} catch (error) {
						new Notice(`发布失败：${error instanceof Error ? error.message : '未知错误'}`);
					}
				};
			}

			// 为整个目录项添加点击事件（仅对目录有效）
			if (item.hasChildren) {
				itemContent.onclick = async () => {
					if (!item.loaded) {
						item.isLoading = true;
						this.updateDirectoryList();
						
						const subItems = await this.publisher.loadSubDirectories(item.path);
						item.children = subItems;
						item.loaded = true;
						item.isLoading = false;
					}
					
					item.isExpanded = !item.isExpanded;
					this.updateDirectoryList();
				};

				// 添加可点击的视觉提示
				itemContent.addClass('clickable');
			}

			// 如果有子目录且已展开，则渲染子目录
			if (item.hasChildren && item.loaded && item.isExpanded) {
				const childrenContainer = itemContainer.createEl('div', {
					cls: 'directory-children'
				});
				item.children.forEach(child => createTreeItem(child, childrenContainer));
			}

			return itemContainer;
		};

		// 创建根目录列表
		const treeContainer = container.createEl('div', {
			cls: 'directory-tree'
		});
		
		this.filteredDirectories.forEach(item => {
			createTreeItem(item, treeContainer);
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

const styles = `
	.directory-tree {
		border: 1px solid var(--background-modifier-border);
		border-radius: 3px;
		background: var(--background-secondary);
		padding: 8px;
	}

	.directory-tree-item {
		margin: 2px 0;
	}

	.directory-item-content {
		display: flex;
		align-items: center;
		padding: 4px 8px;
		border-radius: 3px;
		gap: 4px;
	}

	.directory-item-content.clickable {
		cursor: pointer;
	}

	.directory-item-content.clickable:hover {
		background-color: var(--background-modifier-hover);
	}

	.directory-left-container {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.directory-indent-spacer {
		width: 16px;
		flex-shrink: 0;
	}

	.directory-toggle-container {
		width: 16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.directory-content-container {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	.directory-icon {
		width: 16px;
		text-align: center;
		margin-right: 4px;
		flex-shrink: 0;
	}

	.directory-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 2px 0;
	}

	.directory-publish-button {
		padding: 2px 8px;
		border-radius: 3px;
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
		font-size: 12px;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.directory-item-content:hover .directory-publish-button {
		opacity: 1;
	}

	.directory-children {
		margin-left: 0;
	}

	.directory-toggle {
		transition: transform 0.15s ease;
	}

	.directory-toggle.expanded {
		transform: rotate(90deg);
	}

	.directory-toggle.loading {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
`;

