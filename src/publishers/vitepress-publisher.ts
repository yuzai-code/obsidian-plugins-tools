import { BasePublisher, PublishedNote } from './base-publisher';
import { PluginSettings } from '../settings/settings.interface';
import { GitHubService } from '../services/github.service';
import ObsidianPublisher from '../main';

// 在文件顶部添加类型定义
interface GitHubResponse {
    sha: string;
    content?: string;
}

// 在类定义之前声明接口
export interface DirectoryNode {
    path: string;
    name: string;
    type: 'file' | 'dir';  // 添加类型区分
    children: DirectoryNode[];
    level: number;
    hasChildren?: boolean;  // 是否可能有子内容
    isLoading: boolean;    
    loaded: boolean;      
}

/**
 * VitePress 发布器实现类
 * 负责将内容发布到 VitePress 站点
 * @extends BasePublisher
 */
export class VitePressPublisher extends BasePublisher {
    private settings: PluginSettings;
    private githubService: GitHubService;
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
            siteName: settings.githubRepo
        });
        this.plugin = plugin;
        this.settings = settings;
        
        // 只初始化 GitHub 服务
        this.githubService = new GitHubService({
            username: settings.githubUsername,
            repo: settings.githubRepo,
            token: settings.githubToken,
            branch: settings.githubBranch
        });
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
        // 替换中文空格为普通空格，然后替换空为连字符
        path = path.replace(/\u3000/g, ' ').replace(/\s+/g, '-');
        return path;
    }

    /**
     * 记录发布状态
     */
    private async recordPublishStatus(filePath: string, remotePath: string, success: boolean, sha?: string) {
        await this.plugin.recordPublish(
            filePath,
            remotePath,
            this.settings.platform,
            success ? 'success' : 'failed',
            sha
        );
    }

    /**
     * 执行发布操作
     * @param content 要发布的内容
     * @param filePath 文件路径
     */
    async publish(content: string, filePath: string): Promise<void> {
        try {
            // 检查本地文件是否存在，使用 app.vault.adapter.exists 来检查
            const exists = await this.plugin.app.vault.adapter.exists(filePath);
            if (!exists) {
                await this.removePublishedNote(filePath);
                throw new Error(`本地文件不存在: ${filePath}`);
            }

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

            // 上传文件并获取 SHA
            const result = await this.githubService.uploadFile(
                fullPath,
                processedContent,
                `Update ${targetPath} via Obsidian Publisher`
            ) as GitHubResponse;

            // 记录发布成功，包含 SHA
            await this.recordPublishStatus(filePath, fullPath, true, result.sha);
            
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
     * 发布内容到指定目
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
                        type: 'dir',
                        children: [],
                        level: level,
                        loaded: false,
                        isLoading: false
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
     * 获取仓库中的顶级内容
     */
    private async getAllDirectories(): Promise<DirectoryNode[]> {
        try {
            const basePath = this.settings.vitepressPath;
            const service = this.getService();
            
            // 获取顶级目录内容
            const contents = await service.getContentsWithSubDirCheck(basePath);
            
            // 转换为 DirectoryNode 格式
            return contents.map(item => ({
                path: item.path.replace(`${basePath}/`, ''),
                name: item.name,
                type: item.type,
                children: [],
                level: 0,
                hasChildren: item.type === 'dir' && item.hasSubDirs,
                isLoading: false,
                loaded: false
            }));
        } catch (error) {
            console.error('获取目录列表失败:', error);
            throw error;
        }
    }

    /**
     * 加载指定目录的子内容
     */
    async loadSubDirectories(dirPath: string): Promise<DirectoryNode[]> {
        try {
            const basePath = this.settings.vitepressPath;
            const fullPath = `${basePath}/${dirPath}`;
            const service = this.getService();
            
            // 获取子目录内容
            const contents = await service.getContentsWithSubDirCheck(fullPath);
            const level = dirPath.split('/').length;
            
            // 转换所有内容（包括文件和目录）
            return contents.map(item => ({
                path: item.path.replace(`${basePath}/`, ''),
                name: item.name,
                type: item.type,
                children: [],
                level: level,
                hasChildren: item.type === 'dir' && item.hasSubDirs,
                isLoading: false,
                loaded: false
            }));
        } catch (error) {
            console.error(`加载子目录失败 ${dirPath}:`, error);
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
        // 使用 Obsidian API 检查文件是否存在
        const exists = await this.plugin.app.vault.adapter.exists(filePath);
        if (!exists) {
            await this.removePublishedNote(filePath);
            throw new Error(`本地文件不存在: ${filePath}`);
        }

        const service = this.getService();
        const remotePath = this.getRemotePath(filePath);
        return await service.getFileContent(remotePath);
    }

    /**
     * 删除远程文件
     */
    async deleteRemote(filePath: string): Promise<void> {
        try {
            const service = this.getService();
            const remotePath = this.getRemotePath(filePath);
            
            // 先删除远程文件
            await service.deleteFile(remotePath, '从 Obsidian 删除文件');
            
            // 远程文件删除成功后，删除发布记录
            await this.removePublishedNote(filePath);
            
            console.log(`成功删除远程文件: ${remotePath}`);
        } catch (error) {
            console.error('删除远程文件失败:', error);
            throw error;
        }
    }

    private getService(): GitHubService {
        if (!this.githubService) {
            throw new Error('GitHub 服务未初始化');
        }
        return this.githubService;
    }

    private getRemotePath(filePath: string): string {
        // 获取 VitePress 基础路径
        const basePath = this.settings.vitepressPath;

        // 如果设置了保持文件结构
        if (this.settings.vitepress.keepFileStructure) {
            return `${basePath}/${filePath}`;
        }

        // 否则只使用文件名，放基础径下
        const fileName = filePath.split('/').pop() || '';
        return `${basePath}/${fileName}`;
    }

    /**
     * 清除目录缓存
     */
    clearDirectoryCache() {
        this.directoryCache = null;
    }

    async getPublishedNotes(): Promise<PublishedNote[]> {
        const publishedNotes = await this.loadPublishedNotes();
        
        // 使用 Obsidian API 检查文件是否存在
        const validNotes = await Promise.all(
            publishedNotes.map(async note => {
                const exists = await this.plugin.app.vault.adapter.exists(note.localPath);
                if (!exists) {
                    await this.removePublishedNote(note.localPath);
                }
                return { note, exists };
            })
        );

        return validNotes
            .filter(({ exists }) => exists)
            .map(({ note }) => note);
    }

    /**
     * 从发布记录中删除笔记
     */
    private async removePublishedNote(localPath: string) {
        try {
            const publishedNotes = await this.loadPublishedNotes();
            const updatedNotes = publishedNotes.filter(note => {
                // 保留不是当前平台的记录，或者不是当前文件的记录
                return note.platform !== this.settings.platform || note.localPath !== localPath;
            });
            
            // 只有当记录确实发生变化时才保存
            if (publishedNotes.length !== updatedNotes.length) {
                await this.savePublishedNotes(updatedNotes);
                console.log(`已从 ${this.settings.platform} 平台的发布记录中删除: ${localPath}`);
            }
        } catch (error) {
            console.error('删除发布记录失败:', error);
        }
    }
} 