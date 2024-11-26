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
    
    // GitLab 相关设置（与 GitHub 保持一致的命名）
    gitlabToken: string;
    gitlabUsername: string;
    gitlabRepo: string;
    gitlabBranch: string;
    gitlabPath: string;
    gitlabEnabled: boolean;
    platform: 'github' | 'gitlab';
    gitlabUrl: string;
    gitlabProjectId: string;
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
    
    // GitLab 默认设置
    gitlabToken: '',
    gitlabUsername: '',
    gitlabRepo: '',
    gitlabBranch: 'main',
    gitlabPath: 'docs',
    gitlabEnabled: false,
    gitlabUrl: '',
    gitlabProjectId: '',
    
    // 平台选择
    platform: 'github'
}; 