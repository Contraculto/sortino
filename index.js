#!/usr/bin/env node
// Sortino - Sort images in directories
// Rodrigo Lanas <rodrigo@contraculto.com>

import { createInterface } from 'readline/promises';
import open from 'open';
import { startServer } from './server.js';

// Banner
console.log();
console.log('  ██████  ▒█████   ██▀███  ▄▄▄█████▓ ██▓ ███▄    █  ▒█████  ');
console.log('▒██    ▒ ▒██▒  ██▒▓██ ▒ ██▒▓  ██▒ ▓▒▓██▒ ██ ▀█   █ ▒██▒  ██▒');
console.log('░ ▓██▄   ▒██░  ██▒▓██ ░▄█ ▒▒ ▓██░ ▒░▒██▒▓██  ▀█ ██▒▒██░  ██▒');
console.log('  ▒   ██▒▒██   ██░▒██▀▀█▄  ░ ▓██▓ ░ ░██░▓██▒  ▐▌██▒▒██   ██░');
console.log('▒██████▒▒░ ████▓▒░░██▓ ▒██▒  ▒██▒ ░ ░██░▒██░   ▓██░░ ████▓▒░');
console.log('▒ ▒▓▒ ▒ ░░ ▒░▒░▒░ ░ ▒▓ ░▒▓░  ▒ ░░   ░▓  ░ ▒░   ▒ ▒ ░ ▒░▒░▒░ ');
console.log('░ ░▒  ░ ░  ░ ▒ ▒░   ░▒ ░ ▒░    ░     ▒ ░░ ░░   ░ ▒░  ░ ▒ ▒░ ');
console.log('░  ░  ░  ░ ░ ░ ▒    ░░   ░   ░       ▒ ░   ░   ░ ░ ░ ░ ░ ▒  ');
console.log('      ░      ░ ░     ░               ░           ░     ░ ░  ');
console.log();
console.log();

// Console menu
async function menu(rl, port) {
  const answer = await rl.question('\n  [1] SORT  [2] Settings  [3] Help  [4] Exit\n      : ');
  switch (answer) {
    case '1':
      await open(`http://localhost:${port}`);
      break;
    case '2':
      await open(`http://localhost:${port}/settings`);
      break;
    case '3':
      await open('https://github.com/Contraculto/sortino/blob/master/README.md');
      break;
    case '4':
      console.log('\n  Good bye!');
      rl.close();
      process.exit(0);
      return;
    default:
      console.log('\n  Invalid option');
  }
  await menu(rl, port);
}

const { port, isFirstRun } = await startServer();
const rl = createInterface({ input: process.stdin, output: process.stdout });

if (isFirstRun) {
  console.log('  Settings file created, opening settings page');
  await open(`http://localhost:${port}/settings`);
}

console.log();
await menu(rl, port);

