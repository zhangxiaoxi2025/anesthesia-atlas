import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packages = ['react', 'react-dom', 'scheduler', 'three', 'lucide-react'];
const notices = ['第三方软件许可 / Third-party software notices', 'Original application code and anatomy asset rights are separate. Z-Anatomy anatomy attribution and CC BY-SA terms appear in the model attribution panel.', ''];
for (const name of packages) {
  const folder = join(root, 'node_modules', name);
  const metadata = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
  const license = await readFile(join(folder, 'LICENSE'), 'utf8');
  notices.push('='.repeat(72), `${metadata.name} ${metadata.version}`, `License: ${metadata.license}`, metadata.homepage || '', '', license.trim(), '');
}
await writeFile(join(root, 'public/THIRD_PARTY_NOTICES.txt'), notices.join('\n'));
console.log(`Third-party notices generated for ${packages.length} runtime packages.`);
