// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2020 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

/*
    Interactive console logic is simple: rlPrompt() displays an entry
    >
    and waits for user command: f {query} / cl {query} / others.
    Executes a command and displays '>' again, until 'quit' or Ctrl+C.
    If many results for {query} found, interactive menu is displayed with up-down keyboard keys navigation.
 */

const readline = require('readline');

const Colors = require('./colors');
const parser = require('./cpp_parser');
const printer = require('./printer');
const env = require('./env');
const searcher = require('./file_searcher');

let rl;   // = readline.createInterface(...)

function rlPrompt() {
  if (!rl || rl.closed) {
    rl = readline.createInterface(process.stdin, process.stdout);
    rl.on('close', () => {
      console.log();
    });
    rl.on('line', (line) => {
      parseAndExecuteInputCommand(line.trim());
    });
  }
  rl.prompt();
}

function printHelp() {
  console.log(`${Colors.Bright}f {query}${Colors.RESET}   — print info of function`);
  console.log(`${Colors.Bright}src {query}${Colors.RESET} — print cpp source code of function`);
  console.log(`${Colors.Bright}cl {query}${Colors.RESET}  — print info about class instance`);
  console.log(`${Colors.Bright}q[uit]${Colors.RESET}      — close interactive console`);
  console.log('Examples of {query}: reorderTags, messages_send, ClassName method, \\Full\\FQN::method() . If many functions found, menu is displayed.');
}

function printVersion() {
  console.log(`kphp_inspector v${env.VERSION}`);
}

function onCommand_help() {
  printHelp();
}

function onCommand_exit() {
  process.exit(0);
}

/**
 * @param {string} q
 * @return {boolean}
 */
function onCommand_printFunctionInfo(q) {
  let foundFiles = searcher.performSearchForFunction(q);
  printFunctionSearchResults(q, foundFiles, (idx) => {
    printer.printFunctionInfo(parser.parseCppFunction(foundFiles[idx]));
  });
  return foundFiles.length <= 1;
}

/**
 * @param {string} q
 * @return {boolean}
 */
function onCommand_printFunctionSrc(q) {
  let foundFiles = searcher.performSearchForFunction(q);
  printFunctionSearchResults(q, foundFiles, (idx) => {
    printer.printFunctionSrc(parser.parseCppFunction(foundFiles[idx]));
  });
  return foundFiles.length <= 1;
}

/**
 * @param {string} q
 * @return {boolean}
 */
function onCommand_printClassInfo(q) {
  let foundFiles = searcher.performSearchForClass(q);
  printClassSearchResults(q, foundFiles, (idx) => {
    printer.printClassInfo(parser.parseCppClass(foundFiles[idx]));
  });
  return foundFiles.length <= 1;
}

/**
 * If many results for {query} found, interactive menu is displayed with up-down keyboard keys navigation
 * @param {string[]} menuItems
 * @param {Function} callback
 */
function showChooseInteractiveMenu(menuItems, callback) {
  let activeIdx = 0;
  let firstDraw = true;

  function redrawMenu() {
    if (!firstDraw) {
      readline.moveCursor(process.stdout, -100, -menuItems.length);
      readline.clearScreenDown(process.stdout);
    }
    firstDraw = false;

    menuItems.forEach((fn, i) => {
      if (i === activeIdx) {
        console.log(Colors.Reverse + fn + Colors.RESET);
      } else {
        console.log(fn);
      }
    });
  }

  function clearMenuAsIfNotExisted() {
    readline.moveCursor(process.stdout, -100, -menuItems.length);
    readline.clearScreenDown(process.stdout);
  }

  function moveActiveIdx(dy) {
    activeIdx = (activeIdx + dy + menuItems.length) % menuItems.length;
    redrawMenu();
  }

  function onKeyPress(ch, key) {
    switch (key.name) {
      case 'down':
      case 'right':
        moveActiveIdx(1);
        break;
      case 'up':
      case 'left':
        moveActiveIdx(-1);
        break;
      case 'return':
        clearMenuAsIfNotExisted();
        quitInteractiveMenu();
        callback(activeIdx);
        break;
      default:
        clearMenuAsIfNotExisted();
        quitInteractiveMenu();
        callback(null);
        break;
    }
  }

  function quitInteractiveMenu() {
    process.stdin.setRawMode(false);
    process.stdin.removeListener('keypress', onKeyPress);
    process.stdin.pause();
    process.stdin.write('\u001b[?25h');     // show the cursor again
  }

  function startInteractiveMenu() {
    rl.close();
    readline.moveCursor(process.stdout, -100, -1);

    process.stdin.setRawMode(true);
    process.stdin.on('keypress', onKeyPress);
    process.stdin.resume();
    process.stdin.write('\u001b[?25l');     // hide the cursor
    redrawMenu();
  }

  startInteractiveMenu();
}

/**
 * @param {string} q
 * @param {string[]} foundFiles
 * @param {Function} onChosenCallback
 */
function printFunctionSearchResults(q, foundFiles, onChosenCallback) {
  if (foundFiles.length === 0) {
    console.log(Colors.FgRed + `No function found for query '${q}'` + Colors.RESET);
  } else if (foundFiles.length === 1) {
    onChosenCallback(0);
  } else {
    showChooseInteractiveMenu(foundFiles.map(fn => parser.parseCppFunction(fn).phpFuncName || '<error>'), (idx) => {
      idx !== null && onChosenCallback(idx);
      rlPrompt();
    });
  }
}

/**
 * @param {string} q
 * @param {string[]} foundFiles
 * @param {Function} onChosenCallback
 */
function printClassSearchResults(q, foundFiles, onChosenCallback) {
  if (foundFiles.length === 0) {
    console.log(Colors.FgRed + `No class found for query '${q}' (maybe, it's not an instance class?)` + Colors.RESET);
  } else if (foundFiles.length === 1) {
    onChosenCallback(0);
  } else {
    showChooseInteractiveMenu(foundFiles.map(fn => parser.parseCppClass(fn).phpClassName || '<error>'), (idx) => {
      idx !== null && onChosenCallback(idx);
      rlPrompt();
    });
  }
}

/**
 * @param {string} cmd User input
 */
function parseAndExecuteInputCommand(cmd) {
  let shouldPrompt = true;

  if (cmd === '') {
  } else if (cmd === 'exit' || cmd === 'q' || cmd === 'quit') {
    onCommand_exit();
    shouldPrompt = false;
  } else if (cmd === '?' || cmd === 'h' || cmd === 'help' || cmd === 'about' || cmd === 'f') {
    onCommand_help();
  } else if (cmd.startsWith('f ') || cmd.startsWith('а ')) {    // russian 'а', if occasionally not changed keyboard layout
    shouldPrompt = onCommand_printFunctionInfo(cmd.substr(cmd.indexOf(' ') + 1).trim());
  } else if (cmd.startsWith('src ')) {
    shouldPrompt = onCommand_printFunctionSrc(cmd.substr(cmd.indexOf(' ') + 1).trim());
  } else if (cmd.startsWith('class ') || cmd.startsWith('cl ')) {
    shouldPrompt = onCommand_printClassInfo(cmd.substr(cmd.indexOf(' ') + 1).trim());
  } else {
    console.log('Unrecognized command: ' + cmd);
  }

  shouldPrompt && rlPrompt();
}

module.exports.start = function() {
  rlPrompt();
};

module.exports.printHelp = printHelp;
module.exports.printVersion = printVersion;
