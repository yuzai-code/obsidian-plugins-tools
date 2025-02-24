interface GitHubConfig {
    username: string;
    repo: string;
    token: string;
    branch?: string;
}

interface GitHubContent {
    type: 'file' | 'dir';
    path: string;
    name: string;
    hasSubDirs?: boolean;
}

export class GitHubService {
    private config: GitHubConfig;

    constructor(config: GitHubConfig) {
        this.config = {
            ...config,
            branch: config.branch || 'main'
        };
    }

    private getHeaders() {
        return {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    async uploadFile(path: string, content: string, message: string): Promise<void> {
        const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}/contents/${path}`;
        
        // 检查文件是否已存在
        let sha: string | undefined;
        try {
            const checkResponse = await fetch(apiUrl, { headers: this.getHeaders() });
            if (checkResponse.ok) {
                const data = await checkResponse.json();
                sha = data.sha;
            }
        } catch (e) {
            // 文件不存在，续创建
        }

        const body = {
            message,
            content: Buffer.from(content).toString('base64'),
            branch: this.config.branch,
            ...(sha ? { sha } : {})
        };

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub 操作失败: ${errorData.message || response.statusText}`);
        }
    }

    async getDirectories(basePath: string): Promise<string[]> {
        const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}/contents/${basePath}`;
        
        const response = await fetch(apiUrl, { headers: this.getHeaders() });
        if (!response.ok) {
            console.log(`output->response`,response);
            throw new Error(`获取目录列表失败: ${response.statusText}`);
        }

        const contents = await response.json();
        return contents
            .filter((item: any) => item.type === 'dir')
            .map((item: any) => item.path.replace(`${basePath}/`, ''));
    }

    async validateConfig(): Promise<{ success: boolean; message: string }> {
        try {
            const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}`;
            const response = await fetch(apiUrl, { headers: this.getHeaders() });
            
            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    message: `配置验证失败: ${errorData.message || response.statusText}`
                };
            }

            return {
                success: true,
                message: '配置验证成功！'
            };
        } catch (error) {
            return {
                success: false,
                message: `配置验证出错: ${error.message}`
            };
        }
    }

    /**
     * 获取文件内容
     */
    async getFileContent(path: string): Promise<string> {
        try {
            const encodedPath = encodeURIComponent(path);
            const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}/contents/${encodedPath}`;
            const response = await fetch(apiUrl, {
                headers: this.getHeaders(),
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`获取文件失败: ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            return Buffer.from(data.content, 'base64').toString();
        } catch (error) {
            throw new Error(`获取文件内容失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(path: string, message: string): Promise<void> {
        try {
            // 首先获取文件的 SHA
            const encodedPath = encodeURIComponent(path);
            const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}/contents/${encodedPath}`;
            const response = await fetch(apiUrl, {
                headers: this.getHeaders(),
                method: 'GET'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`无法获取文件: ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            const sha = data.sha;

            const deleteResponse = await fetch(apiUrl, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    message,
                    sha,
                    branch: this.config.branch
                })
            });

            if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json();
                throw new Error(`删除文件失败: ${errorData.message || deleteResponse.statusText}`);
            }
        } catch (error) {
            throw new Error(`删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 获取目录内容
     * @param path 目录路径
     * @returns 目录内容列表
     */
    async getContents(path: string): Promise<GitHubContent[]> {
        try {
            const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}/contents/${path}`;
            // console.log(`output->apiUrl`,apiUrl);
            const response = await fetch(apiUrl, {
                headers: this.getHeaders(),
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`获取目录内容失败: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log(`output->data`,data)
            
            // 确保返回的是数组
            if (!Array.isArray(data)) {
                return [];
            }

            return data.map((item: { type: string; path: string; name: string; }) => ({
                type: item.type === 'dir' ? 'dir' : 'file',
                path: item.path,
                name: item.name
            }));
        } catch (error) {
            console.error('获取 GitHub 目录内容失败:', error);
            throw error;
        }
    }

    /**
     * 获取目录内容，并检查子目录是否为空
     */
    async getContentsWithSubDirCheck(path: string): Promise<GitHubContent[]> {
        const contents = await this.getContents(path);
        
        // 对于每个目录类型的项目，检查其是否包含子内容
        const contentsWithCheck = await Promise.all(contents.map(async item => {
            if (item.type === 'dir') {
                try {
                    const subContents = await this.getContents(item.path);
                    return {
                        ...item,
                        hasSubDirs: subContents.length > 0
                    };
                } catch (error) {
                    console.warn(`检查子目录 ${item.path} 失败:`, error);
                    return {
                        ...item,
                        hasSubDirs: false
                    };
                }
            }
            return item;
        }));

        return contentsWithCheck;
    }
} 