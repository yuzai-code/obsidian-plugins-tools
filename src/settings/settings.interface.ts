/**
 * 插件整体设置接口
 * @interface PluginSettings
 */
export interface PluginSettings {
    /** VitePress 平台的设置 */
    vitepress: VitePressSettings;
    
    // GitHub 相关设置
    githubEnabled: boolean;
    githubToken: string;
    githubUsername: string;
    githubRepo: string;
    githubBranch: string;
    vitepressPath: string;
    
    // 平台选择
    platform: 'github';
}

export interface VitePressSettings {
    enabled: boolean;
    addFrontmatter: boolean;
    keepFileStructure: boolean;
    defaultDirectory?: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    // GitHub 默认设置
    githubEnabled: false,
    githubToken: '',
    githubUsername: '',
    githubRepo: '',
    githubBranch: 'main',
    vitepressPath: 'docs',
    
    // VitePress 默认设置
    vitepress: {
        enabled: true,
        addFrontmatter: true,
        keepFileStructure: true,
        defaultDirectory: ''
    },
    
    // 平台选择
    platform: 'github'
}; 