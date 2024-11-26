import { BasePublisher } from './base-publisher';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * VitePress 发布器实现类
 * 负责将内容发布到 VitePress 站点
 * @extends BasePublisher
 */
export class VitePressPublisher extends BasePublisher {
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
     * @param {string} content - 要发布的内容
     * @param {string} filePath - 文件路径
     * @returns {Promise<void>}
     */
    async publish(content: string, filePath: string): Promise<void> {
        const processedContent = await this.processContent(content);
        const outputPath = path.join(this.options.outputPath, filePath);
        
        // 确保输出目录存在
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        // 写入处理后的内容
        await fs.writeFile(outputPath, processedContent, 'utf-8');
    }

    /**
     * 处理内容，转换为 VitePress 兼容格式
     * @private
     * @param {string} content - 原始内容
     * @returns {Promise<string>} 处理后的内容
     */
    private async processContent(content: string): Promise<string> {
        const frontmatter = this.generateFrontmatter();
        let processedContent = content;
        processedContent = this.processInternalLinks(processedContent);
        processedContent = this.processImages(processedContent);
        
        return `${frontmatter}\n${processedContent}`;
    }

    /**
     * 生成 VitePress frontmatter
     * @private
     * @returns {string} frontmatter 内容
     */
    private generateFrontmatter(): string {
        return `---
layout: doc
title: ${this.options.siteName}
---`;
    }

    /**
     * 处理 Obsidian 内部链接
     * @private
     * @param {string} content - 包含内部链接的内容
     * @returns {string} 处理后的内容
     */
    private processInternalLinks(content: string): string {
        return content.replace(/\[\[(.*?)\]\]/g, (_, text) => {
            const [link, alias] = text.split('|');
            return `[${alias || link}](${link.replace(/ /g, '-')})`;
        });
    }

    /**
     * 处理图片链接
     * @private
     * @param {string} content - 包含图片链接的内容
     * @returns {string} 处理后的内容
     */
    private processImages(content: string): string {
        return content.replace(/!\[\[(.*?)\]\]/g, (_, imagePath) => {
            return `![](/assets/images/${imagePath})`;
        });
    }
} 