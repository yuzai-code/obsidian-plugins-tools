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
    private vueComponent: any;

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

    getIcon(): string {
        return 'gauge';
    }

    async onOpen() {
        const contentEl = this.containerEl.querySelector('.view-content') as HTMLElement;
        if (!contentEl) return;

        contentEl.empty();
        contentEl.addClass('dashboard-view-content');
        
        const component = createApp(DashboardComponent, {
            notes: this.historyService.getAllRecords(),
            onRepublish: this.onRepublish,
            onUpdateFromRemote: this.onUpdateFromRemote,
            onDeleteFromRemote: this.onDeleteFromRemote
        });

        this.vueApp = component;
        this.vueComponent = component.mount(contentEl);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
            this.vueComponent = null;
        }
    }

    refresh() {
        if (this.vueComponent) {
            this.vueComponent.updateNotes(this.historyService.getAllRecords());
        }
    }
} 