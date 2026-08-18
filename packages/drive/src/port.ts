export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder' as const;

export interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  parentId: string;
}

export interface DrivePort {
  listChildren(parentId: string): Promise<DriveNode[]>;
  createFolder(parentId: string, name: string): Promise<DriveNode>;
  getNode(id: string): Promise<DriveNode | null>;
}

export interface SourceFilePort {
  readTextFile(fileId: string): Promise<{ mimeType: string; text: string }>;
}
