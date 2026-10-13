import * as vscode from 'vscode';

const zh = vscode.env.language.toLowerCase().startsWith('zh');

/** Returns the English string, or the Chinese one when VS Code runs with a zh locale. */
export function t(en: string, zhText: string): string {
  return zh ? zhText : en;
}
