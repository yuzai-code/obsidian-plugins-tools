import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { PublishHistoryService } from '../services/publish-history.service';
import { PublishRecord } from '../models/publish-record.interface';
import { PluginSettings } from '../settings/settings.interface';
import { setIcon } from "obsidian";

export const DASHBOARD_VIEW_TYPE = 'publish-dashboard';

export class DashboardView extends ItemView {
    private historyService: PublishHistoryService;
    private settings: PluginSettings;
    private selectedNotes: Set<string> = new Set();
    private currentTab: 'published' | 'all' = 'published';

    constructor(
        leaf: WorkspaceLeaf, 
        historyService: PublishHistoryService,
        settings: PluginSettings
    ) {
        super(leaf);
        this.historyService = historyService;
        this.settings = settings;
    }

    onRepublish: (filePath: string, platform?: string) => Promise<void> = async () => {};

    getViewType(): string {
        return DASHBOARD_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '发布仪表盘';
    }

    async onOpen() {
        // 添加样式
        this.containerEl.createEl('style', {
            text: `
                .dashboard-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--background-modifier-border);
                    margin-bottom: 16px;
                }
                .dashboard-header h2 {
                    margin: 0;
                    font-size: 1.5em;
                    color: var(--text-normal);
                }
                .notes-list {
                    padding: 0 16px;
                }
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--text-muted);
                    font-size: 1.1em;
                }
                .note-item {
                    margin-bottom: 16px;
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 8px;
                    overflow: hidden;
                }
                .note-title-bar {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    background: var(--background-secondary);
                    cursor: pointer;
                    user-select: none;
                }
                .note-title-bar:hover {
                    background: var(--background-modifier-hover);
                }
                .toggle-icon {
                    margin-right: 8px;
                    color: var(--text-muted);
                    font-size: 0.8em;
                    width: 16px;
                    text-align: center;
                }
                .note-title {
                    flex: 1;
                    font-weight: 500;
                    color: var(--text-normal);
                }
                .action-button {
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 0.9em;
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .action-button:hover {
                    background: var(--interactive-accent-hover);
                }
                .note-details {
                    padding: 16px;
                    background: var(--background-primary);
                    border-top: 1px solid var(--background-modifier-border);
                }
                .note-details.hidden {
                    display: none;
                }
                .detail-item {
                    margin-bottom: 12px;
                    color: var(--text-muted);
                    font-size: 0.9em;
                }
                .platforms-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .platform-info {
                    padding: 12px;
                    background: var(--background-secondary);
                    border-radius: 6px;
                }
                .platform-name {
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--text-normal);
                }
                .platform-name.github {
                    color: #2da44e;
                }
                .platform-name.gitlab {
                    color: #fc6d26;
                }
                .publish-time, .remote-path {
                    font-size: 0.9em;
                    color: var(--text-muted);
                    margin-top: 4px;
                }
                .remote-path {
                    word-break: break-all;
                }
                .batch-publish-section {
                    padding: 16px;
                    margin-bottom: 16px;
                    background: var(--background-secondary);
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .batch-publish-button {
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    border: none;
                }
                .batch-publish-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .note-checkbox {
                    margin-right: 8px;
                }
                .platform-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    margin-right: 8px;
                    font-size: 0.8em;
                }
                .platform-badge.github {
                    background: #2da44e33;
                    color: #2da44e;
                }
                .platform-badge.gitlab {
                    background: #fc6d2633;
                    color: #fc6d26;
                }
                .section-title {
                    font-size: 1.2em;
                    font-weight: 600;
                    margin: 24px 0 16px;
                    padding: 0 16px;
                }
                .tab-group {
                    display: flex;
                    gap: 1px;
                    padding: 8px 16px;
                    background: var(--background-secondary);
                    margin-bottom: 16px;
                }
                .tab-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    border-radius: 4px;
                    color: var(--text-muted);
                    user-select: none;
                    flex: 1;
                    text-align: center;
                }
                .tab-item:hover {
                    background: var(--background-modifier-hover);
                }
                .tab-item.active {
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                }
                .tab-content {
                    display: none;
                }
                .tab-content.active {
                    display: block;
                }
            `
        });

        await this.refresh();
    }

    async refresh() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        
        // 创建标签切换组
        const tabGroup = container.createEl('div', { cls: 'tab-group' });
        
        // 已发布笔记标签
        const publishedTab = tabGroup.createEl('div', {
            cls: `tab-item ${this.currentTab === 'published' ? 'active' : ''}`,
            text: '已发布笔记'
        });

        // 所有笔记标签
        const allTab = tabGroup.createEl('div', {
            cls: `tab-item ${this.currentTab === 'all' ? 'active' : ''}`,
            text: '所有笔记'
        });

        // 创建内容区域
        const publishedContent = container.createEl('div', {
            cls: `tab-content ${this.currentTab === 'published' ? 'active' : ''}`
        });
        const allContent = container.createEl('div', {
            cls: `tab-content ${this.currentTab === 'all' ? 'active' : ''}`
        });

        // 渲染已发布笔记内容
        if (this.currentTab === 'published') {
            await this.renderPublishedNotes(publishedContent);
        }

        // 渲染所有笔记内容
        if (this.currentTab === 'all') {
            // 批量发布区域
            const batchSection = allContent.createEl('div', { cls: 'batch-publish-section' });
            const selectedCount = batchSection.createEl('span');
            const updateSelectedCount = () => {
                selectedCount.setText(`已选择 ${this.selectedNotes.size} 个笔记`);
            };
            updateSelectedCount();

            const batchPublishBtn = batchSection.createEl('button', {
                cls: 'batch-publish-button',
                text: '批量发布'
            });
            batchPublishBtn.disabled = this.selectedNotes.size === 0;

            await this.renderAllNotes(allContent, updateSelectedCount, batchPublishBtn);

            // 批量发布按钮点击事件
            batchPublishBtn.addEventListener('click', async () => {
                if (this.selectedNotes.size === 0) return;

                const enabledPlatforms: string[] = [];
                if (this.settings.githubEnabled) enabledPlatforms.push('github');
                if (this.settings.gitlabEnabled) enabledPlatforms.push('gitlab');

                if (enabledPlatforms.length === 0) {
                    new Notice('请先启用至少一个发布平台');
                    return;
                }

                try {
                    for (const filePath of this.selectedNotes) {
                        const file = this.app.vault.getAbstractFileByPath(filePath);
                        if (!(file instanceof TFile)) continue;

                        for (const platform of enabledPlatforms) {
                            await this.onRepublish(filePath, platform);
                        }
                    }
                    new Notice('批量发布完成！');
                    this.selectedNotes.clear();
                    await this.refresh();
                } catch (error) {
                    new Notice(`批量发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
                }
            });
        }

        // 添加标签切换事件
        publishedTab.addEventListener('click', async () => {
            if (this.currentTab !== 'published') {
                this.currentTab = 'published';
                await this.refresh();
            }
        });

        allTab.addEventListener('click', async () => {
            if (this.currentTab !== 'all') {
                this.currentTab = 'all';
                await this.refresh();
            }
        });
    }

    private async renderPublishedNotes(container: HTMLElement) {
        const notesList = container.createEl('div', { cls: 'notes-list' });
        const records = this.historyService.getAllRecords();
        const noteGroups = this.groupRecordsByFilePath(records);
        
        if (noteGroups.size === 0) {
            const emptyState = notesList.createEl('div', { cls: 'empty-state' });
            emptyState.createEl('div', { text: '暂无已发布的笔记' });
            return;
        }

        for (const [filePath, noteRecords] of noteGroups) {
            const hasSuccessRecord = noteRecords.some(r => r.status === 'success');
            if (!hasSuccessRecord) continue;

            const noteItem = notesList.createEl('div', { cls: 'note-item' });
            
            const titleBar = noteItem.createEl('div', { cls: 'note-title-bar' });
            
            const toggleIcon = titleBar.createEl('span', { 
                cls: 'toggle-icon',
                text: '▶'
            });
            
            const fileName = filePath.split('/').pop() || '';
            titleBar.createEl('span', { 
                cls: 'note-title',
                text: fileName
            });

            const detailsPanel = noteItem.createEl('div', { 
                cls: 'note-details hidden'
            });

            detailsPanel.createEl('div', { 
                cls: 'detail-item local-path',
                text: `本地路径: ${filePath}`
            });

            const platformsList = detailsPanel.createEl('div', { cls: 'platforms-list' });
            
            // GitHub 发布信息
            const githubRecord = noteRecords.find(r => r.platform === 'github' && r.status === 'success');
            if (githubRecord) {
                const githubInfo = platformsList.createEl('div', { cls: 'platform-info' });
                const githubHeader = githubInfo.createEl('div', { cls: 'platform-header' });
                
                githubHeader.createEl('div', { 
                    cls: 'platform-name github',
                    text: 'GitHub'
                });

                const githubActions = githubHeader.createEl('div', { cls: 'platform-actions' });
                
                // 更新按钮
                const updateBtn = githubActions.createEl('button', {
                    cls: 'action-button update',
                    attr: {
                        'aria-label': '从远程更新'
                    }
                });
                setIcon(updateBtn, 'download');
                
                // 重新发布按钮
                const republishBtn = githubActions.createEl('button', {
                    cls: 'action-button republish',
                    attr: {
                        'aria-label': '重新发布'
                    }
                });
                setIcon(republishBtn, 'upload');
                
                // 删除按钮
                const deleteBtn = githubActions.createEl('button', {
                    cls: 'action-button delete',
                    attr: {
                        'aria-label': '从远程删除'
                    }
                });
                setIcon(deleteBtn, 'trash');

                githubInfo.createEl('div', { 
                    cls: 'publish-time',
                    text: `发布时间: ${new Date(githubRecord.lastPublished).toLocaleString()}`
                });
                
                if (githubRecord.remotePath) {
                    githubInfo.createEl('div', { 
                        cls: 'remote-path',
                        text: `远程路径: ${githubRecord.remotePath}`
                    });
                }

                // 添加按钮事件
                updateBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.onUpdateFromRemote(filePath, 'github');
                });

                republishBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.onRepublish(filePath, 'github');
                });

                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.onDeleteFromRemote(filePath, 'github');
                });
            }

            // GitLab 发布信息
            const gitlabRecord = noteRecords.find(r => r.platform === 'gitlab' && r.status === 'success');
            if (gitlabRecord) {
                const gitlabInfo = platformsList.createEl('div', { cls: 'platform-info' });
                const gitlabHeader = gitlabInfo.createEl('div', { cls: 'platform-header' });
                
                gitlabHeader.createEl('div', { 
                    cls: 'platform-name gitlab',
                    text: 'GitLab'
                });

                const gitlabActions = gitlabHeader.createEl('div', { cls: 'platform-actions' });
                
                // 更新按钮
                const updateBtn = gitlabActions.createEl('button', {
                    cls: 'action-button update',
                    attr: {
                        'aria-label': '从远程更新'
                    }
                });
                setIcon(updateBtn, 'download');
                
                // 重新发布按钮
                const republishBtn = gitlabActions.createEl('button', {
                    cls: 'action-button republish',
                    attr: {
                        'aria-label': '重新发布'
                    }
                });
                setIcon(republishBtn, 'upload');
                
                // 删除按钮
                const deleteBtn = gitlabActions.createEl('button', {
                    cls: 'action-button delete',
                    attr: {
                        'aria-label': '从远程删除'
                    }
                });
                setIcon(deleteBtn, 'trash');

                gitlabInfo.createEl('div', { 
                    cls: 'publish-time',
                    text: `发布时间: ${new Date(gitlabRecord.lastPublished).toLocaleString()}`
                });
                
                if (gitlabRecord.remotePath) {
                    gitlabInfo.createEl('div', { 
                        cls: 'remote-path',
                        text: `远程路径: ${gitlabRecord.remotePath}`
                    });
                }

                // 添加按钮事件
                updateBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.onUpdateFromRemote(filePath, 'gitlab');
                });

                republishBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.onRepublish(filePath, 'gitlab');
                });

                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.onDeleteFromRemote(filePath, 'gitlab');
                });
            }

            // 添加展开/折叠事件
            titleBar.addEventListener('click', () => {
                const isHidden = detailsPanel.hasClass('hidden');
                if (isHidden) {
                    detailsPanel.removeClass('hidden');
                    toggleIcon.setText('▼');
                } else {
                    detailsPanel.addClass('hidden');
                    toggleIcon.setText('▶');
                }
            });
        }
    }

    // 从远程更新笔记
    onUpdateFromRemote: (filePath: string, platform: string) => Promise<void> = async () => {};

    // 从远程删除笔记
    onDeleteFromRemote: (filePath: string, platform: string) => Promise<void> = async () => {};

    private async renderAllNotes(
        container: HTMLElement, 
        updateSelectedCount: () => void,
        batchPublishBtn: HTMLButtonElement
    ) {
        const notesList = container.createEl('div', { cls: 'notes-list' });
        const files = this.app.vault.getMarkdownFiles();
        
        if (files.length === 0) {
            const emptyState = notesList.createEl('div', { cls: 'empty-state' });
            emptyState.createEl('div', { text: '暂无笔记' });
            return;
        }

        for (const file of files) {
            const noteItem = notesList.createEl('div', { cls: 'note-item' });
            
            // 创建笔记标题栏
            const titleBar = noteItem.createEl('div', { cls: 'note-title-bar' });
            
            // 添加复选框
            const checkbox = titleBar.createEl('input', {
                type: 'checkbox',
                cls: 'note-checkbox'
            });
            checkbox.checked = this.selectedNotes.has(file.path);
            
            // 添加展开/折叠图标
            const toggleIcon = titleBar.createEl('span', { 
                cls: 'toggle-icon',
                text: '▶'
            });
            
            // 显示文件名
            titleBar.createEl('span', { 
                cls: 'note-title',
                text: file.name
            });

            // 创建详细信息面板
            const detailsPanel = noteItem.createEl('div', { 
                cls: 'note-details hidden'
            });

            // 添加本地路径信息
            detailsPanel.createEl('div', { 
                cls: 'detail-item local-path',
                text: `本地路径: ${file.path}`
            });

            // 添加可用平台信息
            const platformsList = detailsPanel.createEl('div', { cls: 'platforms-list' });
            
            if (this.settings.githubEnabled) {
                const githubBadge = platformsList.createEl('span', {
                    cls: 'platform-badge github',
                    text: 'GitHub'
                });
            }
            
            if (this.settings.gitlabEnabled) {
                const gitlabBadge = platformsList.createEl('span', {
                    cls: 'platform-badge gitlab',
                    text: 'GitLab'
                });
            }

            // 复选框事件
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedNotes.add(file.path);
                } else {
                    this.selectedNotes.delete(file.path);
                }
                updateSelectedCount();
                batchPublishBtn.disabled = this.selectedNotes.size === 0;
            });

            // 标题栏点击事件（展开/折叠）
            titleBar.addEventListener('click', (e) => {
                if (e.target === checkbox) return;
                
                const isHidden = detailsPanel.hasClass('hidden');
                if (isHidden) {
                    detailsPanel.removeClass('hidden');
                    toggleIcon.setText('▼');
                } else {
                    detailsPanel.addClass('hidden');
                    toggleIcon.setText('▶');
                }
            });
        }
    }

    private groupRecordsByFilePath(records: PublishRecord[]): Map<string, PublishRecord[]> {
        const groups = new Map<string, PublishRecord[]>();
        
        for (const record of records) {
            const existing = groups.get(record.filePath) || [];
            existing.push(record);
            groups.set(record.filePath, existing);
        }
        
        return groups;
    }
} 