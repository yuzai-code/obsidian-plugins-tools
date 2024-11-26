/**
 * 插件整体设置接口
 * @interface PluginSettings
 */
export interface PluginSettings {
    /** VitePress 平台的设置 */
    vitepress: VitePressSettings;
    // GitHub 相关设置
    githubToken: string;
    githubUsername: string;
    githubRepo: string;
    githubBranch: string;
    vitepressPath: string;
}

export interface VitePressSettings {
    enabled: boolean;
    addFrontmatter: boolean;
    keepFileStructure: boolean;
    defaultDirectory?: string;
} 