import readline from 'node:readline';
import { hashPassword } from '../server/services/password.js';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s === question) process.stdout.write(s); }; // no mostrar la contrasena
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const password = await ask('Nueva contrasena (minimo 12 caracteres): ');
if (password.length < 12) { console.error('Demasiado corta.'); process.exit(1); }
if (password !== await ask('Repite la contrasena: ')) { console.error('No coinciden.'); process.exit(1); }
console.log('\nPega esta linea en tu archivo .env:\n');
console.log(`ADMIN_PASSWORD_HASH="${hashPassword(password)}"`);
