export interface FileInfo {
    fullPath: string;
    parentPath: string;
    fileName: string;
    size: number;
    storagePosition: string;
    fileUuid: string;
    createdAt: string;
    updatedAt: string;
}
export interface WriteFileOptions {
    createDir?: boolean;
}

export interface BatchWriteParam {
    path: string;
    data: string | Buffer;
    // size:number;
    options: WriteFileOptions?;
}

export interface RenameParam {
    from: string;
    to: string;
}
