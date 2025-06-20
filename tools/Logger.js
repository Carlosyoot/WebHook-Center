const fs = require('fs-extra');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const SESSION_LOG = path.join(LOG_DIR, 'Redis-Now.log');
const FULL_LOG = path.join(LOG_DIR, 'Redis-Full.log');

fs.ensureDirSync(LOG_DIR);
fs.writeFileSync(SESSION_LOG, '');

function formatarData() {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  const hora = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');
  const seg = String(agora.getSeconds()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
}

function logCustom({ emoji = '', message = '', type = 'info' }) {
  const timestamp = formatarData();
  const line = `[${timestamp}] ${emoji} ${message}`;

  fs.appendFileSync(SESSION_LOG, line + '\n');
  fs.appendFileSync(FULL_LOG, line + '\n');
}

function logSuccess(message) {
  logCustom({ emoji: '✅', message, type: 'success' });
}

function logError(message) {
  logCustom({ emoji: '❌', message, type: 'error' });
}
function logWarning(message) {
  logCustom({ emoji: '⚠️', message, type: 'warning' });
}

function logInfo(message) {
  logCustom({ emoji: 'ℹ️', message, type: 'info' });
}

module.exports = {
  logSuccess,
  logError,
  logWarning,
  logInfo,
  logCustom, // permite usar diretamente, se quiser
  SESSION_LOG,
  FULL_LOG
};
