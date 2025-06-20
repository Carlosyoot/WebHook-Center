const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

const SESSION_LOG = path.join(__dirname, '../../logs/Redis-Now.log');
const FULL_LOG = path.join(__dirname, '../../logs/Redis-Full.log');

let currentFile = SESSION_LOG;
let modoAjuda = false;

function printHelp() {
  modoAjuda = true;
  console.clear();
  console.log(chalk.cyanBright('🔹 MODO AJUDA ATIVO — pressione S ou F para voltar aos logs\n'));
  console.log(chalk.cyan(' [S] - Ver logs da sessão atual'));
  console.log(chalk.cyan(' [F] - Ver log completo (histórico)'));
  console.log(chalk.cyan(' [H] - Exibir esta ajuda'));
  console.log(chalk.cyan(' [Q] - Sair do terminal de logs\n'));
}

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function updateLogs() {
  if (modoAjuda) return;
  if (!fs.existsSync(currentFile)) return;

  clearScreen();

  const content = fs.readFileSync(currentFile, 'utf-8');
  const lines = content.trim().split('\n');

  console.clear();
  console.log(chalk.gray(`📂 Visualizando: ${currentFile.includes('Full') ? 'Log Completo' : 'Sessão Atual'}`));
  console.log(chalk.gray('Pressione H para ajuda | Q para sair\n'));

  for (const line of lines) {
    const match = line.match(/^(\[.*?\]) (✅|❌)? ?(.*)$/);
    if (match) {
      const [, timestamp, tag, message] = match;
      const timePart = chalk.yellowBright.bold(timestamp);
      let msgColor;

      if (tag === '❌') msgColor = chalk.red(`${tag} ${message}`);
      else if (tag === '✅') msgColor = chalk.green(`${tag} ${message}`);
      else msgColor = chalk.white(message);

      console.log(`${timePart} ${msgColor}`);
    } else {
      console.log(chalk.white(line));
    }
  }
}

updateLogs();

fs.watchFile(SESSION_LOG, { interval: 500 }, () => {
  if (currentFile === SESSION_LOG) updateLogs();
});
fs.watchFile(FULL_LOG, { interval: 500 }, () => {
  if (currentFile === FULL_LOG) updateLogs();
});

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (_, key) => {
  const k = key.name?.toLowerCase();

  if (k === 'q' || (key.ctrl && k === 'c')) {
    fs.unwatchFile(SESSION_LOG);
    fs.unwatchFile(FULL_LOG);
    process.exit(0);
  }

  if (k === 's') {
    currentFile = SESSION_LOG;
    modoAjuda = false;
    updateLogs();
  }

  if (k === 'f') {
    currentFile = FULL_LOG;
    modoAjuda = false;
    updateLogs();
  }

  if (k === 'h') {
    printHelp();
  }
});
