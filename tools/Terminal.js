const { spawn } = require('child_process');
const path = require('path');

function OpenTerminal() {
  const loggerPath = path.resolve(__dirname, 'UI', 'LoggerUi.js');

  spawn('cmd.exe', ['/c', 'start', 'wt.exe', 'node', loggerPath], {
    detached: true,
    stdio: 'ignore'
  }).unref();
}

module.exports = { OpenTerminal };
