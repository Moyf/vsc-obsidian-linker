const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watchMode = process.argv.includes('--watch');
const tests = process.argv.includes('--tests');

async function main() {
  const options = tests
    ? {
        entryPoints: ['src/test/*.test.ts', 'src/test/host/index.ts', 'src/wikilink.ts', 'src/images.ts', 'src/preview.ts', 'src/obsidian.ts', 'src/completion-context.ts'],
        outdir: 'out-test',
        outbase: 'src',
        bundle: false,
        sourcemap: true,
      }
    : {
        entryPoints: ['src/extension.ts'],
        outfile: 'dist/extension.js',
        bundle: true,
        external: ['vscode'],
        sourcemap: !production,
        minify: production,
      };

  const ctx = await esbuild.context({
    ...options,
    platform: 'node',
    format: 'cjs',
    target: 'es2022',
    logLevel: 'info',
  });

  if (watchMode) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
