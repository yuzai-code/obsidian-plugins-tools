import * as fs from 'fs';

/**
 * 已发布笔记的接口定义
 */
export interface PublishedNote {
    localPath: string;
    remotePath: string;
    platform: string;
    status: 'success' | 'failed';
    lastPublished?: string;
}

/**
 * 发布器的配置选项接口
 */
export interface PublisherOptions {
    outputPath: string;
    siteName: string;
}

/**
 * 发布器的抽象基类
 */
export abstract class BasePublisher {
    protected options: PublisherOptions;
    protected publishedNotesPath: string;

    constructor(options: PublisherOptions) {
        this.options = options;
        this.publishedNotesPath = `${options.outputPath}/.published_notes.json`;
    }

    /**
     * 发布内容到目标平台
     * @param content - 要发布的内容
     * @param filePath - 文件路径
     */
    abstract publish(content: string, filePath: string): Promise<void>;

    /**
     * 获取发布器的名称
     */
    abstract getName(): string;

    /**
     * 获取发布器的描述信息
     */
    abstract getDescription(): string;

    protected async loadPublishedNotes(): Promise<PublishedNote[]> {
        try {
            const data = await fs.promises.readFile(this.publishedNotesPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    protected async savePublishedNotes(notes: PublishedNote[]): Promise<void> {
        await fs.promises.writeFile(
            this.publishedNotesPath,
            JSON.stringify(notes, null, 2),
            'utf-8'
        );
    }
} 