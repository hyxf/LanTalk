/**
 * Cross-compile lantalk-server for all platforms.
 * Run after `npm run build` and copy-static.mjs have completed.
 */
import { execSync } from 'child_process';
import { mkdirSync }  from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root      = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = resolve(root, 'server');
const outDir    = resolve(root, 'dist-bin');

mkdirSync(outDir, { recursive: true });

const targets = [
  { GOOS: 'linux',   GOARCH: 'amd64', out: 'lantalk-linux-amd64'       },
  { GOOS: 'linux',   GOARCH: 'arm64', out: 'lantalk-linux-arm64'        },
  { GOOS: 'darwin',  GOARCH: 'amd64', out: 'lantalk-macos-amd64'        },
  { GOOS: 'darwin',  GOARCH: 'arm64', out: 'lantalk-macos-arm64'        },
  { GOOS: 'windows', GOARCH: 'amd64', out: 'lantalk-windows-amd64.exe'  },
];

for (const { GOOS, GOARCH, out } of targets) {
  const outPath = resolve(outDir, out);
  console.log(`Building ${out}...`);
  execSync(
    `go build -ldflags="-s -w" -o "${outPath}" .`,
    {
      cwd:   serverDir,
      env:   { ...process.env, GOOS, GOARCH, CGO_ENABLED: '0' },
      stdio: 'inherit',
    }
  );
}

console.log('\n✅ All binaries written to dist-bin/');
