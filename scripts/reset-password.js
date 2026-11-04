// Uso: npm run reset-password -- "NuevaContraseña"
const { setSetting } = require('../src/db');
const { hashPassword } = require('../src/auth');

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Escribe una contraseña de al menos 8 caracteres:  npm run reset-password -- "MiContraseña123"');
  process.exit(1);
}
setSetting('admin_password_hash', hashPassword(pw));
console.log('Contraseña del panel actualizada ✨');
