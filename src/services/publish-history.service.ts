import { PublishRecord, PublishHistory } from '../models/publish-record.interface';
import { Plugin } from 'obsidian';

export class PublishHistoryService {
    private plugin: Plugin;
    private history: PublishHistory = { records: {} };

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    async load() {
        const data = await this.plugin.loadData();
        if (data?.publishHistory) {
            this.history = data.publishHistory;
        }
    }

    async save() {
        const data = await this.plugin.loadData() || {};
        data.publishHistory = this.history;
        await this.plugin.saveData(data);
    }

    addRecord(record: PublishRecord) {
        const key = `${record.filePath}:${record.platform}`;
        this.history.records[key] = record;
        this.save();
    }

    getRecord(filePath: string, platform: string): PublishRecord | undefined {
        const key = `${filePath}:${platform}`;
        return this.history.records[key];
    }

    getAllRecords(): PublishRecord[] {
        return Object.values(this.history.records);
    }

    removeRecord(filePath: string, platform: string) {
        const key = `${filePath}:${platform}`;
        delete this.history.records[key];
        this.save();
    }

    getRecentPublishes(limit: number = 10): PublishRecord[] {
        return Object.values(this.history.records)
            .sort((a, b) => b.lastPublished - a.lastPublished)
            .slice(0, limit);
    }

    getFileRecords(filePath: string): PublishRecord[] {
        return Object.values(this.history.records)
            .filter(record => record.filePath === filePath);
    }
} 