import * as vscode from 'vscode';

/**
 * Builds an Obsidian URI for the official `open` action using an absolute path:
 *   obsidian://open?vault=<vaultName>&path=<absolute-fs-path>
 *
 * Per Obsidian docs the `file` parameter is vault-relative; absolute file system
 * paths must use the `path` parameter (Obsidian resolves the vault itself).
 * `vaultName` is optional: when empty, Obsidian resolves the vault from the path.
 */
export function buildObsidianUri(fileUri: vscode.Uri, vaultName: string): string | undefined {
  if (fileUri.scheme !== 'file') {
    return undefined;
  }
  const parts: string[] = [];
  const vault = vaultName.trim();
  if (vault) {
    parts.push(`vault=${encodeURIComponent(vault)}`);
  }
  parts.push(`path=${encodeURIComponent(fileUri.fsPath)}`);
  return `obsidian://open?${parts.join('&')}`;
}
