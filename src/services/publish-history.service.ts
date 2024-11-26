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
        this.history.records[record.filePath] = record;
        this.save();
    }

    getRecord(filePath: string): PublishRecord | undefined {
        return this.history.records[filePath];
    }

    getAllRecords(): PublishRecord[] {
        return Object.values(this.history.records);
    }

    removeRecord(filePath: string) {
        delete this.history.records[filePath];
        this.save();
    }

    getRecentPublishes(limit: number = 10): PublishRecord[] {
        return Object.values(this.history.records)
            .sort((a, b) => b.lastPublished - a.lastPublished)
            .slice(0, limit);
    }
} 