require('dotenv').config({ path: '../.env' });
const { encrypt, decrypt } = require('../services/crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
Escolha uma opção:
1 - Criptografar secret
2 - Descriptografar secret
`);

rl.question('Opção: ', (opcao) => {
  if (opcao === '1') {
    rl.question('Informe a secret a ser criptografada: ', (input) => {
      const encrypted = encrypt(input.trim());
      console.log('\n🔐 Secret criptografada:\n');
      console.log(encrypted);
      rl.close();
    });
  } else if (opcao === '2') {
    rl.question('Informe a secret criptografada: ', (input) => {
      try {
        const decrypted = decrypt(input.trim());
        console.log('\n🔓 Secret original:\n');
        console.log(decrypted);
      } catch (e) {
        console.error('\n❌ Erro ao descriptografar. Verifique se a secret está correta.');
      }
      rl.close();
    });
  } else {
    console.log('❌ Opção inválida.');
    rl.close();
  }
});
