import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const EXECUTABLE_MODE = 0o755;
const NOT_FOUND = -1;
const folders: string[] = [];
const stubs = {
  brew: `case "$*" in
    'install ffmpeg@8') exit 0 ;;
    '--prefix ffmpeg@8') printf '%s\\n' "$TEST_FFMPEG_PREFIX" ;;
    'deps ffmpeg@8') exit 0 ;;
    *) echo 'Unexpected unpinned Homebrew selection' >&2; exit 1 ;;
  esac`,
  'pkg-config': `test "$*" = '--modversion libavcodec' || exit 1
    test "$FFMPEG_DIR" = "$TEST_FFMPEG_PREFIX" || exit 1
    case "$PKG_CONFIG_PATH" in "$TEST_FFMPEG_PREFIX/lib/pkgconfig":*) ;; *) exit 1 ;; esac
    printf '%s\\n' "$TEST_CODEC_VERSION"`,
  install_name_tool: 'exit 0',
  otool: 'exit 0',
};

type Fixture = { folder: string; bin: string; prefix: string; environmentFile: string };

const setupStep = (): string => {
  const workflow = readFileSync(
    new URL('../.github/workflows/build.yaml', import.meta.url),
    'utf8',
  );
  const start = workflow.indexOf('      - name: Install macOS dependencies');
  const end = workflow.indexOf('      - name: Install Linux dependencies', start);
  if (start === NOT_FOUND || end === NOT_FOUND) {
    throw new Error('Missing macOS dependency setup');
  }
  const [, step = ''] = workflow.slice(start, end).split('        run: |\n');
  if (step.length === 0) {
    throw new Error('Missing macOS setup script');
  }
  return step.replaceAll(/^ {10}/gm, '');
};

const writeStubs = (bin: string): void => {
  for (const [name, body] of Object.entries(stubs)) {
    const executable = path.join(bin, name);
    writeFileSync(executable, `#!/bin/sh\n${body}\n`);
    chmodSync(executable, EXECUTABLE_MODE);
  }
};

const createFixture = (): Fixture => {
  const folder = mkdtempSync(path.join(tmpdir(), 'manafish-ffmpeg-'));
  folders.push(folder);
  const fixture = {
    folder,
    bin: path.join(folder, 'bin'),
    prefix: path.join(folder, 'ffmpeg8'),
    environmentFile: path.join(folder, 'github-env'),
  };
  for (const directory of [
    fixture.bin,
    path.join(fixture.prefix, 'lib', 'pkgconfig'),
    path.join(folder, 'src-tauri'),
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(fixture.environmentFile, '');
  writeFileSync(path.join(fixture.prefix, 'lib', 'libavcodec.62.dylib'), 'fixture');
  writeStubs(fixture.bin);
  return fixture;
};

const runSetup = (codecVersion: string): { status: number | null; stderr: string; env: string } => {
  const fixture = createFixture();
  const result = spawnSync('bash', ['-eu', '-c', setupStep()], {
    cwd: fixture.folder,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fixture.bin}:${process.env['PATH'] ?? ''}`,
      GITHUB_ENV: fixture.environmentFile,
      FFMPEG_DIR: '/unversioned/ffmpeg9',
      PKG_CONFIG_PATH: '/unversioned/ffmpeg9/lib/pkgconfig',
      TEST_FFMPEG_PREFIX: fixture.prefix,
      TEST_CODEC_VERSION: codecVersion,
    },
  });
  return {
    status: result.status,
    stderr: result.stderr,
    env: readFileSync(fixture.environmentFile, 'utf8'),
  };
};

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe.skipIf(process.platform === 'win32')('macOS release FFmpeg selection', () => {
  it('selects the FFmpeg 8 keg for discovery and bundling over an inherited FFmpeg 9', () => {
    const result = runSetup('62.28.100');
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.env).toContain('/ffmpeg8\n');
    expect(result.env).toContain('/ffmpeg8/lib/pkgconfig:/unversioned/ffmpeg9/lib/pkgconfig');
  });

  it('rejects an incompatible libavcodec before packaging', () => {
    const result = runSetup('63.1.101');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Expected FFmpeg 8');
  });
});
