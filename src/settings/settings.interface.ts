export interface PublisherSettings {
    enabled: boolean;
    outputPath: string;
    siteName: string;
}

export interface PluginSettings {
    vitepress: PublisherSettings;
    // 后续可以添加其他平台的设置
    // notion: PublisherSettings;
} 