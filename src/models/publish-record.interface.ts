export interface PublishRecord {
    filePath: string;          // 本地文件路径
    remotePath: string;        // 远程文件路径
    platform: 'github';        // 发布平台
    lastPublished: number;     // 最后发布时间戳
    status: 'success' | 'failed'; // 发布状态
    sha?: string;              // 添加可选的 SHA 字段
}

export interface PublishHistory {
    records: { [key: string]: PublishRecord }; // 键是本地文件路径
} 