import { BasePublisher } from './base-publisher';
import { PluginSettings } from '../settings/settings.interface';
import { GitHubService } from '../services/github.service';
import { GitLabService } from '../services/gitlab.service';
import ObsidianPublisher from '../main';

// 在类定义之前声明接口
export interface DirectoryNode {
    path: string;
    name: string;
    children: DirectoryNode[];
    level: number;
}

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
    private directoryCache: {
        data: DirectoryNode[];
        timestamp: number;
        platform: string;
    } | null = null;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 缓存有效期5分钟

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
            this.settings.platform,
            success ? 'success' : 'failed'
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

            // 据设置决定是否添加 frontmatter
            const processedContent = this.settings.vitepress.addFrontmatter 
                ? this.addVitepressFrontmatter(content)
                : content;

            // 根据平台选择使用不同的务
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
        // 如果内容已有 frontmatter，则不添加
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
     * @param filePath 文件路径（已包含目标目录）
     * @param targetDir 目标目录
     */
    async publishToDirectory(content: string, filePath: string, targetDir: string): Promise<void> {
        try {
            // 构建目标路径（支持多级目录）
            const fileName = this.settings.vitepress.keepFileStructure
                ? filePath.split('/').pop() || ''  // 只取文件名
                : filePath;
            
            // 组合完整路径，确保路径格式正确
            const fullPath = this.formatPath(`${this.settings.vitepressPath}/${targetDir}/${fileName}`);

            // 根据设置决定是否添加 frontmatter
            const processedContent = this.settings.vitepress.addFrontmatter 
                ? this.addVitepressFrontmatter(content)
                : content;

            const service = this.getService();
            await service.uploadFile(
                fullPath,
                processedContent,
                `Update ${fileName} via Obsidian Publisher`
            );

            // 记录发布成功
            await this.recordPublishStatus(filePath, fullPath, true);
        } catch (error) {
            // 记录发布失败
            await this.recordPublishStatus(filePath, '', false);
            console.error('发布到目录失败:', error);
            throw error;
        }
    }

    /**
     * 构建目录树结构
     * @param dirs 目录路径数组
     * @returns 目录结构
     */
    private buildDirectoryTree(dirs: string[]): DirectoryNode[] {
        const root: DirectoryNode[] = [];
        
        for (const dir of dirs) {
            const parts = dir.split('/');
            let currentLevel = root;
            let currentPath = '';
            let level = 0;
            
            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const existing = currentLevel.find(node => node.name === part);
                
                if (existing) {
                    currentLevel = existing.children;
                } else {
                    const newNode: DirectoryNode = {
                        path: currentPath,
                        name: part,
                        children: [],
                        level: level
                    };
                    currentLevel.push(newNode);
                    currentLevel = newNode.children;
                }
                level++;
            }
        }
        
        return root;
    }

    /**
     * 获取仓库中的所有目录（包括子目录）
     * @returns 包含所有目录路径的数组
     */
    private async getAllDirectories(): Promise<DirectoryNode[]> {
        try {
            const basePath = this.settings.vitepressPath;
            const allDirs: string[] = [];

            if (this.settings.platform === 'github' && this.githubService) {
                // 获取顶级目录
                const contents = await this.githubService.getContents(basePath);
                const directories = contents.filter(item => item.type === 'dir');
                
                // 将所有目录的路径添加到列表
                directories.forEach(dir => {
                    const dirPath = dir.path.replace(`${basePath}/`, '');
                    allDirs.push(dirPath);
                });

                // 并行获取所有子目录
                await Promise.all(
                    directories.map(async (dir) => {
                        try {
                            const subContents = await this.githubService.getContents(dir.path);
                            subContents
                                .filter(item => item.type === 'dir')
                                .forEach(subDir => {
                                    allDirs.push(subDir.path.replace(`${basePath}/`, ''));
                                });
                        } catch (error) {
                            console.warn(`获取子目录 ${dir.path} 失败:`, error);
                        }
                    })
                );
            } else if (this.settings.platform === 'gitlab' && this.gitlabService) {
                // GitLab 的类似实现...
                // ...
            }
            
            // 构建目录树结构
            return this.buildDirectoryTree(allDirs.sort());
        } catch (error) {
            console.error('获取目录列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取仓库中的目录列表（带缓存）
     */
    async getDirectories(): Promise<DirectoryNode[]> {
        try {
            // 检查缓存是否有效
            if (this.directoryCache && 
                Date.now() - this.directoryCache.timestamp < this.CACHE_DURATION &&
                this.directoryCache.platform === this.settings.platform) {
                return this.directoryCache.data;
            }

            // 获取新数据
            const directories = await this.getAllDirectories();
            
            // 更新缓存
            this.directoryCache = {
                data: directories,
                timestamp: Date.now(),
                platform: this.settings.platform
            };

            return directories;
        } catch (error) {
            console.error('获取目录列表失败:', error);
            // 如果有缓存，在出错时返回缓存的数据
            if (this.directoryCache) {
                return this.directoryCache.data;
            }
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

    /**
     * 获取远程文件内容
     */
    async getRemoteContent(filePath: string): Promise<string> {
        const service = this.getService();
        const remotePath = this.getRemotePath(filePath);
        return await service.getFileContent(remotePath);
    }

    /**
     * 删除远程文件
     */
    async deleteRemote(filePath: string): Promise<void> {
        const service = this.getService();
        const remotePath = this.getRemotePath(filePath);
        await service.deleteFile(remotePath, '从 Obsidian 删除文件');
    }

    private getService(): GitHubService | GitLabService {
        if (this.settings.platform === 'github' && this.githubService) {
            return this.githubService;
        } else if (this.settings.platform === 'gitlab' && this.gitlabService) {
            return this.gitlabService;
        }
        throw new Error('未配置有效的发布平台');
    }

    private getRemotePath(filePath: string): string {
        // 获取 VitePress 基础路径
        const basePath = this.settings.platform === 'github' 
            ? this.settings.vitepressPath 
            : this.settings.gitlabPath;

        // 如果设置了保持文件结构
        if (this.settings.vitepress.keepFileStructure) {
            return `${basePath}/${filePath}`;
        }

        // 否则只使用文件名，放在基础路径下
        const fileName = filePath.split('/').pop() || '';
        return `${basePath}/${fileName}`;
    }

    /**
     * 清除目录缓存
     */
    clearDirectoryCache() {
        this.directoryCache = null;
    }
} 