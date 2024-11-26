/**
 * 发布器的配置选项接口
 */
export interface PublisherOptions {
    outputPath: string;
    siteName: string;
}

/**
 * 发布器的抽象基类
 * 实现了基本的配置管理，要求子类实现具体的发布逻辑
 */
export abstract class BasePublisher {
    protected options: PublisherOptions;

    /**
     * 创建发布器实例
     * @param options - 发布器的配置选项
     */
    constructor(options: PublisherOptions) {
        this.options = options;
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
} 