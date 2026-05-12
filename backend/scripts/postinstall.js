import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const frontendPath = resolve(process.cwd(), '../frontend');
const frontendPackageJson = resolve(frontendPath, 'package.json');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!existsSync(frontendPath) || !existsSync(frontendPackageJson)) {
  console.log('[postinstall] Pasta frontend nao encontrada. Pulando build do frontend.');
  process.exit(0);
}

try {
  console.log(`[postinstall] Frontend encontrado em: ${frontendPath}`);
  execSync(`${npmCmd} install --include=dev`, { cwd: frontendPath, stdio: 'inherit' });
  execSync(`${npmCmd} run build`, { cwd: frontendPath, stdio: 'inherit' });
  console.log('[postinstall] Build do frontend concluido.');
} catch (error) {
  console.error('[postinstall] Falha ao buildar frontend.', error);
  process.exit(1);
}
