interface GitLabConfig {
    url: string;  // GitLab 实例的 URL
    projectId: string | number;  // 项目 ID
    token: string;
    branch?: string;
}

interface GitLabContent {
    type: 'tree' | 'blob';
    path: string;
    name: string;
}

export class GitLabService {
    private config: GitLabConfig;
    private api: any; // 根据你使用的 GitLab API 客户端类型来定义具体类型
    private projectId: string | number;
    private branch: string;

    constructor(config: GitLabConfig) {
        this.config = {
            ...config,
            branch: config.branch || 'main',
            url: config.url.replace(/\/$/, '') // 移除末尾的斜杠
        };
    }

    private getHeaders() {
        return {
            'PRIVATE-TOKEN': this.config.token,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 上传文件到 GitLab
     */
    async uploadFile(path: string, content: string, message: string): Promise<void> {
        const encodedPath = encodeURIComponent(path);
        const apiUrl = `${this.config.url}/api/v4/projects/${this.config.projectId}/repository/files/${encodedPath}`;

        // 检查文件是否已存在
        let existingFile: any;
        try {
            const checkResponse = await fetch(`${apiUrl}?ref=${this.config.branch}`, {
                headers: this.getHeaders()
            });
            if (checkResponse.ok) {
                existingFile = await checkResponse.json();
            }
        } catch (e) {
            // 文件不存在，继续创建
        }

        const method = existingFile ? 'PUT' : 'POST';
        const body = {
            branch: this.config.branch,
            content,
            commit_message: message,
            encoding: 'text'
        };

        const response = await fetch(apiUrl, {
            method,
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitLab 操作失败: ${errorData.message || response.statusText}`);
        }
    }

    /**
     * 获取目录列表
     */
    async getDirectories(basePath: string): Promise<string[]> {
        const apiUrl = `${this.config.url}/api/v4/projects/${this.config.projectId}/repository/tree`;
        
        const params = new URLSearchParams({
            path: basePath,
            ref: this.config.branch,
            per_page: '100'
        });

        const response = await fetch(`${apiUrl}?${params}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`获取目录列表失败: ${response.statusText}`);
        }

        const contents = await response.json();
        return contents
            .filter((item: any) => item.type === 'tree')
            .map((item: any) => item.path.replace(`${basePath}/`, ''));
    }

    /**
     * 获取文件内容
     */
    async getFileContent(path: string): Promise<string> {
        try {
            const response = await this.api.RepositoryFiles.show(
                this.projectId,
                path,
                this.branch
            );
            return Buffer.from(response.content, 'base64').toString();
        } catch (error) {
            throw new Error(`获取文件内容失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(path: string, message: string): Promise<void> {
        try {
            await this.api.RepositoryFiles.remove(
                this.projectId,
                path,
                this.branch,
                message
            );
        } catch (error) {
            throw new Error(`删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 创建分支
     */
    async createBranch(branchName: string, ref: string): Promise<void> {
        const apiUrl = `${this.config.url}/api/v4/projects/${this.config.projectId}/repository/branches`;
        
        const body = {
            branch: branchName,
            ref
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitLab 创建分支失败: ${errorData.message || response.statusText}`);
        }
    }

    async validateConfig(): Promise<{ success: boolean; message: string }> {
        try {
            const apiUrl = `${this.config.url}/api/v4/projects/${this.config.projectId}`;
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
     * 获取目录内容
     * @param path 目录路径
     * @returns 目录内容列表
     */
    async getContents(path: string): Promise<GitLabContent[]> {
        try {
            const response = await this.api.get(`/projects/${this.config.projectId}/repository/tree`, {
                params: {
                    path: path,
                    ref: this.config.branch
                }
            });

            return response.data.map((item: any) => ({
                type: item.type,  // GitLab 已经使用 'tree' 和 'blob'
                path: item.path,
                name: item.name
            }));
        } catch (error) {
            console.error('获取 GitLab 目录内容失败:', error);
            throw error;
        }
    }
} 