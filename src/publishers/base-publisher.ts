/**
 * 发布器的配置选项接口
 * @interface PublisherOptions
 */
export interface PublisherOptions {
    /** 发布内容的输出路径 */
    outputPath: string;
    /** 站点名称 */
    siteName: string;
}

/**
 * 发布器的基础接口
 * 定义了所有发布器必须实现的方法
 * @interface Publisher
 */
export interface Publisher {
    /**
     * 发布内容到目标平台
     * @param content - 要发布的内容
     * @param filePath - 文件路径
     * @returns Promise<void>
     */
    publish(content: string, filePath: string): Promise<void>;

    /**
     * 获取发布器的名称
     * @returns 发布器名称
     */
    getName(): string;

    /**
     * 获取发布器的描述信息
     * @returns 发布器描述
     */
    getDescription(): string;
}

/**
 * 发布器的抽象基类
 * 实现了基本的配置管理，要求子类实现具体的发布逻辑
 * @abstract
 * @class BasePublisher
 * @implements {Publisher}
 */
export abstract class BasePublisher implements Publisher {
    /**
     * 发布器的配置选项
     * @protected
     * @type {PublisherOptions}
     */
    protected options: PublisherOptions;

    /**
     * 创建发布器实例
     * @constructor
     * @param {PublisherOptions} options - 发布器的配置选项
     */
    constructor(options: PublisherOptions) {
        this.options = options;
    }

    /**
     * 发布内容到目标平台
     * 子类必须实现此方法
     * @abstract
     * @param {string} content - 要发布的内容
     * @param {string} filePath - 文件路径
     * @returns {Promise<void>}
     */
    abstract publish(content: string, filePath: string): Promise<void>;

    /**
     * 获取发布器的名称
     * 子类必须实现此方法
     * @abstract
     * @returns {string} 发布器名称
     */
    abstract getName(): string;

    /**
     * 获取发布器的描述信息
     * 子类必须实现此方法
     * @abstract
     * @returns {string} 发布器描述
     */
    abstract getDescription(): string;
} 