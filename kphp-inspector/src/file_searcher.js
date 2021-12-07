// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2020 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

/*
    Module to find files of function/classes by user search input.
    Folder of KPHP codegenerated code contains thousand of functions in subdirs, and matching is done using file names, not content parsing.
    For user input "VK\Post::analyze" — we get ['vk','post','analyze'] and search files that contain all of qParts in their name.
 */

const fs = require('fs');
const child_process = require('child_process');

const env = require('./env');

/**
 * @param {string} fullFileName
 * @param {string[]} qParts
 */
function doesFileSatisfyQ(fullFileName, qParts) {
  return qParts.every(p => {
    const pos = fullFileName.toLowerCase().indexOf(p);
    const l = fullFileName[pos - 1];
    const r = fullFileName[pos + p.length];

    return pos !== -1
      && (l === '' || !/[a-zA-Z\d]/.test(l))
      && (r === '' || !/[a-zA-Z\d]/.test(r));
  });
}

/**
 * @param {string} fullFileName
 */
function doesFileContainFunction(fullFileName) {
  const c = fs.readFileSync(fullFileName, 'UTF-8');
  return c.includes(' f$') && c.includes('(');
}

/**
 * @param {string} q Search string from console
 * @return {string[]} Full file names, to be passed to parseCppFunction()
 */
function performSearchForFunction(q) {
  let qParts = splitUserSearchStr(q);
  if (!qParts.length) {
    return [];
  }
  let longestQLen = Math.max(...qParts.map(p => p.length));
  let longestQ = qParts.find(p => p.length === longestQLen);

  /** @var {string[]} */
  let output = child_process.execSync(`find ${env.RUN_ARGV.KPHP_COMPILED_ROOT} -iname "*${longestQ}*"`).toString().split('\n');
  // strip out duplicates and strange files: leave only .cpp and .h, also filter out .h files of classes
  output = output.filter(fn =>
    fn.endsWith('.cpp') || (fn.endsWith('.h') && !output.includes(fn.substr(0, fn.length - 2) + '.cpp') && !fn.includes('cl/C@')));

  return output.filter(fn => doesFileSatisfyQ(fn, qParts) && doesFileContainFunction(fn));
}

/**
 * @param {string} q Search string from console
 * @return {string[]} Full file names, to be passed to parseCppClass()
 */
function performSearchForClass(q) {
  let qParts = splitUserSearchStr(q);
  if (!qParts.length) {
    return [];
  }
  let longestQLen = Math.max(...qParts.map(p => p.length));
  let longestQ = qParts.find(p => p.length === longestQLen);

  /** @var {string[]} */
  let output = child_process.execSync(`find ${env.RUN_ARGV.KPHP_COMPILED_ROOT}/cl -iname "*${longestQ}*"`).toString().split('\n');

  return output.filter(fn => fn.endsWith('.h') && doesFileSatisfyQ(fn, qParts));
}

/**
 * Convert search string "ClassName::method" to ['classname','method'], "VK Feed something" to ['vk','feed','something']
 * @param {string} q
 * @return {string[]}
 */
function splitUserSearchStr(q) {
  return q.toLowerCase().trim().split(/[\\,+\s:()]/).map(p => p.trim()).filter(p => p !== '');
}

module.exports.splitUserSearchStr = splitUserSearchStr;
module.exports.performSearchForFunction = performSearchForFunction;
module.exports.performSearchForClass = performSearchForClass;
