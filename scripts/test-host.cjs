const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

const root = mkdtempSync(path.join(tmpdir(), 'obsidian-linker-test-'));
runTests({
  extensionDevelopmentPath: path.resolve(__dirname, '..'),
  extensionTestsPath: path.resolve(__dirname, '../out-test/test/host/index.js'),
  ...(process.env.VSCODE_EXECUTABLE_PATH ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH } : {}),
  launchArgs: [root, `--user-data-dir=${root}/user`, `--extensions-dir=${root}/extensions`,
    '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes'],
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
