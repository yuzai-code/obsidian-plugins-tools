/**
 * 单个发布平台的设置接口
 * @interface PublisherSettings
 */
export interface PublisherSettings {
    /** 是否启用该发布平台 */
    enabled: boolean;
    /** 发布内容的输出路径 */
    outputPath: string;
    /** 站点名称 */
    siteName: string;
}

/**
 * 插件整体设置接口
 * 包含所有支持的发布平台的设置
 * @interface PluginSettings
 */
export interface PluginSettings {
    /** VitePress 平台的设置 */
    vitepress: PublisherSettings;
    // 后续可添加其他平台设置
    // notion: PublisherSettings;
    // hugo: PublisherSettings;
} 