import { spawnSync } from 'node:child_process';

const python = process.platform === 'win32' ? 'python' : 'python3';
const result = spawnSync(python, ['scripts/prepare-python-editor.py'], { stdio: 'inherit' });
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error('Could not prepare the bundled Python language server');
}
