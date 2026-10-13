import * as vscode from 'vscode';
import * as path from 'path';

export async function openFileInObsidian(fileUri: vscode.Uri): Promise<void> {
  const vaultName = vscode.workspace.getConfiguration('obsidian-linker').get<string>('vaultName', '');
  const insideVault = await isInsideVault(fileUri);
  const url = buildObsidianUri(fileUri, vaultName, insideVault);
  if (url) await vscode.env.openExternal(vscode.Uri.parse(url));
}

export async function isInsideVault(fileUri: vscode.Uri): Promise<boolean> {
  let directory = path.dirname(fileUri.fsPath);
  while (true) {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path.join(directory, '.obsidian')));
      if (stat.type & vscode.FileType.Directory) return true;
    } catch (error) {
      if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return false;
    directory = parent;
  }
}

export function buildObsidianUri(fileUri: vscode.Uri, vaultName: string, insideVault = true): string | undefined {
  if (fileUri.scheme !== 'file') {
    return undefined;
  }
  const parts: string[] = [];
  const vault = vaultName.trim();
  if (vault) {
    parts.push(`vault=${encodeURIComponent(vault)}`);
  }
  const filePath = fileUri.fsPath.replace(/\\/g, '/');
  parts.push(insideVault ? `path=${encodeURIComponent(filePath)}` : `file=${encodeURIComponent(`file:${filePath}`)}`);
  return `obsidian://open?${parts.join('&')}`;
}
