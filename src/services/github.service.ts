interface GitHubConfig {
    username: string;
    repo: string;
    token: string;
    branch?: string;
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
            // 文件不存在，继续创建
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
} 