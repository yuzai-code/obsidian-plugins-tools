/**
 * 插件整体设置接口
 * @interface PluginSettings
 */
export interface PluginSettings {
    /** VitePress 平台的设置 */
    vitepress: {
        enabled: boolean;
        outputPath: string;
        siteName: string;
    };
    // GitHub 相关设置
    githubToken: string;
    githubUsername: string;
    githubRepo: string;
    githubBranch: string;
    vitepressPath: string;
} 