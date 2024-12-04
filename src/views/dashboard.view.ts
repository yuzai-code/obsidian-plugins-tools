import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PublishHistoryService } from '../services/publish-history.service';
import { PluginSettings } from '../settings/settings.interface';
import { createApp } from 'vue';
import DashboardComponent from './DashboardComponent.vue';

export const DASHBOARD_VIEW_TYPE = 'publish-dashboard';

export class DashboardView extends ItemView {
    private historyService: PublishHistoryService;
    private settings: PluginSettings;
    private vueApp: any;

    onRepublish: (filePath: string, platform?: string) => Promise<void> = async () => {};
    onUpdateFromRemote: (filePath: string, platform: string) => Promise<void> = async () => {};
    onDeleteFromRemote: (filePath: string, platform: string) => Promise<void> = async () => {};

    constructor(
        leaf: WorkspaceLeaf, 
        historyService: PublishHistoryService,
        settings: PluginSettings
    ) {
        super(leaf);
        this.historyService = historyService;
        this.settings = settings;
    }

    getViewType(): string {
        return DASHBOARD_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '发布仪表盘';
    }

    async onOpen() {
        // 获取 view-content 容器
        const contentEl = this.containerEl.querySelector('.view-content') as HTMLElement;
        if (!contentEl) return;

        // 清空现有内容
        contentEl.empty();
        
        // 设置样式
        contentEl.style.padding = '0';
        contentEl.style.height = '100%';
        contentEl.style.overflow = 'hidden';
        
        // 创建Vue应用
        this.vueApp = createApp(DashboardComponent, {
            notes: this.historyService.getAllRecords(),
            onRepublish: this.onRepublish,
            onUpdateFromRemote: this.onUpdateFromRemote,
            onDeleteFromRemote: this.onDeleteFromRemote
        });
        
        // 挂载Vue应用到 view-content
        this.vueApp.mount(contentEl);
    }

    async onClose() {
        // 卸载Vue应用
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
        }
    }

    refresh() {
        // 如果Vue应用存在，更新notes数据
        if (this.vueApp) {
            const component = this.vueApp._instance.proxy;
            if (component) {
                component.$props.notes = this.historyService.getAllRecords();
            }
        }
    }
} 