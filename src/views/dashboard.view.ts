import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PublishHistoryService } from '../services/publish-history.service';
import { PublishRecord } from '../models/publish-record.interface';

export const DASHBOARD_VIEW_TYPE = 'publish-dashboard';

export class DashboardView extends ItemView {
    private historyService: PublishHistoryService;

    constructor(leaf: WorkspaceLeaf, historyService: PublishHistoryService) {
        super(leaf);
        this.historyService = historyService;
    }

    getViewType(): string {
        return DASHBOARD_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '发布仪表盘';
    }

    async onOpen() {
        await this.refresh();
    }

    async refresh() {
        const container = this.containerEl.children[1];
        container.empty();
        
        // 创建标题
        const header = container.createEl('div', { cls: 'dashboard-header' });
        header.createEl('h2', { text: '已发布笔记' });

        // 创建笔记列表
        const notesList = container.createEl('div', { cls: 'notes-list' });
        
        // 获取所有记录并按文件路径分组
        const records = this.historyService.getAllRecords();
        const noteGroups = this.groupRecordsByFilePath(records);
        
        if (noteGroups.size === 0) {
            const emptyState = notesList.createEl('div', { cls: 'empty-state' });
            emptyState.createEl('div', { text: '暂无已发布的笔记' });
            return;
        }

        // 渲染每个笔记的发布状态
        for (const [filePath, noteRecords] of noteGroups) {
            // 只显示至少有一个成功发布记录的笔记
            const hasSuccessRecord = noteRecords.some(r => r.status === 'success');
            if (!hasSuccessRecord) continue;

            const noteItem = notesList.createEl('div', { cls: 'note-item' });
            
            // 创建笔记标题栏（始终显示）
            const titleBar = noteItem.createEl('div', { cls: 'note-title-bar' });
            
            // 添加展开/折叠图标
            const toggleIcon = titleBar.createEl('span', { 
                cls: 'toggle-icon',
                text: '▶'
            });
            
            // 显示文件名
            const fileName = filePath.split('/').pop() || '';
            titleBar.createEl('span', { 
                cls: 'note-title',
                text: fileName
            });

            // 添加重新发布按钮
            const republishButton = titleBar.createEl('button', {
                cls: 'action-button publish',
                text: '重新发布'
            });

            // 创建详细信息面板（默认隐藏）
            const detailsPanel = noteItem.createEl('div', { 
                cls: 'note-details hidden'
            });

            // 添加本地路径信息
            detailsPanel.createEl('div', { 
                cls: 'detail-item local-path',
                text: `本地路径: ${filePath}`
            });

            // 添加平台发布信息
            const platformsList = detailsPanel.createEl('div', { cls: 'platforms-list' });
            
            // GitHub 发布信息
            const githubRecord = noteRecords.find(r => r.platform === 'github' && r.status === 'success');
            if (githubRecord) {
                const githubInfo = platformsList.createEl('div', { cls: 'platform-info' });
                githubInfo.createEl('div', { 
                    cls: 'platform-name github',
                    text: 'GitHub'
                });
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
            }

            // GitLab 发布信息
            const gitlabRecord = noteRecords.find(r => r.platform === 'gitlab' && r.status === 'success');
            if (gitlabRecord) {
                const gitlabInfo = platformsList.createEl('div', { cls: 'platform-info' });
                gitlabInfo.createEl('div', { 
                    cls: 'platform-name gitlab',
                    text: 'GitLab'
                });
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
            }

            // 添加点击事件处理展开/折叠
            titleBar.addEventListener('click', (e) => {
                // 如果点击的是重新发布按钮，不处理折叠
                if (e.target === republishButton) return;
                
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