const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

const root = mkdtempSync(path.join(tmpdir(), 'obsidian-linker-test-'));
const workspace = path.join(root, 'workspace');
mkdirSync(workspace);
const workspaceFile = path.join(root, 'test.code-workspace');
writeFileSync(workspaceFile, JSON.stringify({ folders: [{ path: workspace }] }));
const singleNote = process.env.TEST_SINGLE_FILE ? path.join(root, 'single.md') : undefined;
if (singleNote) {
  writeFileSync(singleNote, '[[target|oo]] [[#Local Heading]]\n\n# Local Heading');
  writeFileSync(path.join(root, 'target.md'), '# Target');
}
runTests({
  extensionDevelopmentPath: path.resolve(__dirname, '..'),
  extensionTestsPath: path.resolve(__dirname, '../out-test/test/host/index.js'),
  ...(process.env.VSCODE_EXECUTABLE_PATH ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH } : {}),
  ...(singleNote ? { extensionTestsEnv: { OBSIDIAN_LINKER_SINGLE_NOTE: singleNote } } : {}),
  launchArgs: [singleNote ?? workspaceFile, `--user-data-dir=${root}/user`, `--extensions-dir=${root}/extensions`,
    '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes'],
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
