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

export interface BatchWriteParam {
    path: string;
    data: string | Buffer;
    // size:number;
}
export interface RenameParam {
    from: string;
    to: string;
}
