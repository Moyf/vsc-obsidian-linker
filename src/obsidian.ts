import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Builds an Obsidian URI for a file:
 *   obsidian://open?vault=<vaultName>&file=<path-relative-to-workspace-folder>
 * Both vault name and path are percent-encoded.
 */
export function buildObsidianUri(fileUri: vscode.Uri, vaultName: string): string | undefined {
  const vault = vaultName.trim();
  if (!vault) {
    return undefined;
  }
  const folder = vscode.workspace.getWorkspaceFolder(fileUri);
  if (!folder) {
    return undefined;
  }
  const rel = path
    .relative(path.dirname(folder.uri.fsPath), fileUri.fsPath)
    .split(path.sep)
    .join('/');
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(rel)}`;
}
