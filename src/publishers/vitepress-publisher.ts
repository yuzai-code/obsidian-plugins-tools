import { BasePublisher } from './base-publisher';
import { promises as fs } from 'fs';
import * as path from 'path';

export class VitePressPublisher extends BasePublisher {
    getName(): string {
        return 'VitePress';
    }

    getDescription(): string {
        return '将笔记发布到 VitePress 站点';
    }

    async publish(content: string, filePath: string): Promise<void> {
        const processedContent = await this.processContent(content);
        const outputPath = path.join(this.options.outputPath, filePath);
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, processedContent, 'utf-8');
    }

    private async processContent(content: string): Promise<string> {
        // 添加 frontmatter
        const frontmatter = this.generateFrontmatter();
        
        // 处理内容
        let processedContent = content;
        processedContent = this.processInternalLinks(processedContent);
        processedContent = this.processImages(processedContent);
        
        return `${frontmatter}\n${processedContent}`;
    }

    private generateFrontmatter(): string {
        return `---
layout: doc
title: ${this.options.siteName}
---`;
    }

    private processInternalLinks(content: string): string {
        return content.replace(/\[\[(.*?)\]\]/g, (_, text) => {
            const [link, alias] = text.split('|');
            return `[${alias || link}](${link.replace(/ /g, '-')})`;
        });
    }

    private processImages(content: string): string {
        return content.replace(/!\[\[(.*?)\]\]/g, (_, imagePath) => {
            return `![](/assets/images/${imagePath})`;
        });
    }
} 