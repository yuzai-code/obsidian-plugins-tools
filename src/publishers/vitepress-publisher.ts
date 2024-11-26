import { BasePublisher } from './base-publisher';
import { PluginSettings } from '../settings/settings.interface';

/**
 * VitePress 发布器实现类
 * 负责将内容发布到 VitePress 站点
 * @extends BasePublisher
 */
export class VitePressPublisher extends BasePublisher {
    private settings: PluginSettings;

    constructor(settings: PluginSettings) {
        super({
            outputPath: settings.vitepress.outputPath,
            siteName: settings.vitepress.siteName
        });
        this.settings = settings;
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
     * 执行发布操作
     * @param content 要发布的内容
     * @param filePath 文件路径
     */
    async publish(content: string, filePath: string): Promise<void> {
        try {
            const apiUrl = `https://api.github.com/repos/${this.settings.githubUsername}/${this.settings.githubRepo}/contents/${this.settings.vitepressPath}/${filePath}`;
            
            const headers = {
                'Authorization': `token ${this.settings.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            };

            // 获取文件 SHA（如果存在）
            let sha: string | undefined;
            try {
                const response = await fetch(apiUrl, { headers });
                if (response.ok) {
                    const data = await response.json();
                    sha = data.sha;
                }
            } catch (e) {
                // 文件不存在，继续创建
            }

            // 准备请求体
            const body = {
                message: `Update ${filePath}`,
                content: Buffer.from(content).toString('base64'),
                branch: this.settings.githubBranch || 'main',
                ...(sha ? { sha } : {})
            };

            // 发送请求
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`GitHub API 响应错误: ${response.statusText}`);
            }
        } catch (error) {
            console.error('发布到 VitePress 失败:', error);
            throw error;
        }
    }
} 