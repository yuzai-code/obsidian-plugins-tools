export interface PublishRecord {
    filePath: string;          // 本地文件路径
    remotePath: string;        // 远程文件路径
    platform: 'github';        // 发布平台
    lastPublished: number;     // 最后发布时间戳
    status: 'success' | 'failed'; // 发布状态
    fileHash?: string;         // 文件内容哈希，用于检测变化
}

export interface PublishHistory {
    records: Record<string, PublishRecord>; // 键是本地文件路径
} 