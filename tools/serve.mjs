// Resolve a working Python on Windows as well as macOS/Linux.
import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const candidates = process.platform === 'win32'
  ? [['py', '-3'], ['python'], ['python3'], [join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe')]]
  : [['python3'], ['python']];
const python = candidates.find(([command, ...args]) => {
  const result = spawnSync(command, [...args, '--version'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  return result.status === 0 && /^Python 3\./.test(result.stdout || result.stderr || '');
});
if (!python) {
  console.error('Python 3 is required. Install it and run npm run serve again.');
  process.exit(1);
}
const [command, ...args] = python;
const child = spawn(command, [...args, fileURLToPath(new URL('./serve.py', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
