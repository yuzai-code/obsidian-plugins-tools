export interface PublisherOptions {
    outputPath: string;
    siteName: string;
}

export interface Publisher {
    publish(content: string, filePath: string): Promise<void>;
    getName(): string;
    getDescription(): string;
}

export abstract class BasePublisher implements Publisher {
    protected options: PublisherOptions;

    constructor(options: PublisherOptions) {
        this.options = options;
    }

    abstract publish(content: string, filePath: string): Promise<void>;
    abstract getName(): string;
    abstract getDescription(): string;
} 