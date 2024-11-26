import { BasePublisher } from './base-publisher';
import { PluginSettings } from '../settings/settings.interface';
import { GitHubService } from '../services/github.service';
import { GitLabService } from '../services/gitlab.service';
import ObsidianPublisher from '../main';

/**
 * VitePress 发布器实现类
 * 负责将内容发布到 VitePress 站点
 * @extends BasePublisher
 */
export class VitePressPublisher extends BasePublisher {
    private settings: PluginSettings;
    private githubService: GitHubService;
    private gitlabService: GitLabService;
    private plugin: ObsidianPublisher;

    constructor(plugin: ObsidianPublisher, settings: PluginSettings) {
        super({
            outputPath: settings.vitepressPath,
            siteName: settings.platform === 'github' ? settings.githubRepo : settings.gitlabProjectId
        });
        this.plugin = plugin;
        this.settings = settings;
        
        // 初始化 GitHub 服务
        if (settings.platform === 'github') {
            this.githubService = new GitHubService({
                username: settings.githubUsername,
                repo: settings.githubRepo,
                token: settings.githubToken,
                branch: settings.githubBranch
            });
        }
        
        // 初始化 GitLab 服务
        if (settings.platform === 'gitlab') {
            this.gitlabService = new GitLabService({
                url: settings.gitlabUrl,
                projectId: settings.gitlabProjectId,
                token: settings.gitlabToken,
                branch: settings.gitlabBranch
            });
        }
    }

    /**
     * 获取发布器名称
     * @returns {string} 发布器名称
     */
    getName(): string {
        return 'VitePress';
    }

    /**
     * 获取发布器描述
     * @returns {string} 发布器描述
     */
    getDescription(): string {
        return '将笔记发布到 VitePress 站点';
    }

    /**
     * 格式化路径，确保路径格式正确
     * @param path 原始路径
     * @returns 格式化后的路径
     */
    private formatPath(path: string): string {
        // 移除开头的斜杠
        path = path.replace(/^\/+/, '');
        // 移除结尾的斜杠
        path = path.replace(/\/+$/, '');
        // 替换连续的斜杠为单个斜杠
        path = path.replace(/\/+/g, '/');
        // 移除特殊字符
        path = path.replace(/[<>:"|?*\\]/g, '');
        // 替换中文空格为普通空格，然后替换空格为连字符
        path = path.replace(/\u3000/g, ' ').replace(/\s+/g, '-');
        return path;
    }

    /**
     * 记录发布状态
     */
    private async recordPublishStatus(filePath: string, remotePath: string, success: boolean) {
        await this.plugin.recordPublish(
            filePath,
            remotePath,
            this.settings.platform
        );
    }

    /**
     * 执行发布操作
     * @param content 要发布的内容
     * @param filePath 文件路径
     */
    async publish(content: string, filePath: string): Promise<void> {
        try {
            let finalPath = filePath;

            // 如果不保持文件结构，只使用文件名
            if (!this.settings.vitepress.keepFileStructure) {
                finalPath = filePath.split('/').pop() || '';
            }

            // 格式化文件路径
            const formattedPath = this.formatPath(finalPath);
            
            // 确保文件以 .md 结尾
            const targetPath = formattedPath.endsWith('.md') 
                ? formattedPath 
                : `${formattedPath}.md`;

            // 构建完整的目标路径
            const fullPath = `${this.settings.vitepressPath}/${targetPath}`;

            // 根据设置决定是否添加 frontmatter
            const processedContent = this.settings.vitepress.addFrontmatter 
                ? this.addVitepressFrontmatter(content)
                : content;

            // 根据平台选择使用不同的服务
            if (this.settings.platform === 'github' && this.githubService) {
                await this.githubService.uploadFile(
                    fullPath,
                    processedContent,
                    `Update ${targetPath} via Obsidian Publisher`
                );
            } else if (this.settings.platform === 'gitlab' && this.gitlabService) {
                await this.gitlabService.uploadFile(
                    fullPath,
                    processedContent,
                    `Update ${targetPath} via Obsidian Publisher`
                );
            } else {
                throw new Error('未配置有效的发布平台');
            }

            // 记录发布成功
            await this.recordPublishStatus(filePath, fullPath, true);
            
        } catch (error) {
            // 记录发布失败
            await this.recordPublishStatus(filePath, '', false);
            console.error('发布到 VitePress 失败:', error);
            throw new Error(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 添加 VitePress frontmatter
     * @param content 原始内容
     * @returns 添加了 frontmatter 的内容
     */
    private addVitepressFrontmatter(content: string): string {
        // 如果内容已经有 frontmatter，则不添加
        if (content.trimStart().startsWith('---')) {
            return content;
        }

        const date = new Date().toISOString().split('T')[0];
        const defaultFrontmatter = `---
date: ${date}
layout: doc
---

`;
        
        return defaultFrontmatter + content;
    }

    /**
     * 创建新目录
     * @param dirPath 目录路径
     */
    async createDirectory(dirPath: string): Promise<void> {
        try {
            if (!dirPath) return;

            // 格式化目录路径
            const formattedPath = this.formatPath(dirPath);
            
            // 在 VitePress 文档目录下创建目录
            const fullPath = `${this.settings.vitepressPath}/${formattedPath}/.gitkeep`;
            
            await this.githubService.uploadFile(
                fullPath,
                '',
                `Create directory ${formattedPath}`
            );
        } catch (error) {
            console.error('创建目录失败:', error);
            throw error;
        }
    }

    /**
     * 发布内容到指定目录
     * @param content 要发布的内容
     * @param filePath 文件路径
     * @param targetDir 目标目录
     */
    async publishToDirectory(content: string, filePath: string, targetDir: string): Promise<void> {
        try {
            // 根据设置决定是否保持文件结构
            const fileName = this.settings.vitepress.keepFileStructure
                ? filePath  // 保持完整路径
                : filePath.split('/').pop() || '';  // 只使用文件名
            
            // 构建目标路径
            const formattedDir = this.formatPath(targetDir);
            const publishPath = `${formattedDir}/${fileName}`;

            // 发布文件
            await this.publish(content, publishPath);
        } catch (error) {
            console.error('发布到目录失败:', error);
            throw error;
        }
    }

    /**
     * 获取仓库中的目录列表
     */
    async getDirectories(): Promise<string[]> {
        try {
            if (this.settings.platform === 'github' && this.githubService) {
                return await this.githubService.getDirectories(this.settings.vitepressPath);
            } else if (this.settings.platform === 'gitlab' && this.gitlabService) {
                return await this.gitlabService.getDirectories(this.settings.vitepressPath);
            }
            throw new Error('未配置有效的发布平台');
        } catch (error) {
            console.error('获取目录列表失败:', error);
            throw error;
        }
    }

    /**
     * 一键发布笔记
     * @param content 要发布的内容
     * @param filePath 文件路径
     */
    async quickPublish(content: string, filePath: string): Promise<void> {
        try {
            if (this.settings.vitepress.defaultDirectory) {
                // 如果设置了默认目录
                const fileName = this.settings.vitepress.keepFileStructure
                    ? filePath  // 保持完整路径
                    : filePath.split('/').pop() || '';  // 只使用文件名
                
                await this.publishToDirectory(content, fileName, this.settings.vitepress.defaultDirectory);
            } else {
                // 直接发布，publish 方法会根据 keepFileStructure 设置处理路径
                await this.publish(content, filePath);
            }
        } catch (error) {
            console.error('一键发布失败:', error);
            throw new Error(`一键发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
} 