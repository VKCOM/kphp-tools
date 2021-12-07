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
const utils = require('./utils');

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
 * @param {string} query Search string from console
 * @return {string[]} Full file names, to be passed to parseCppFunction()
 */
function performSearchForFunction(query) {
  const strict = query.startsWith('\\');
  utils.debug(`Start search function by query: ${query}, strict: ${strict}`);

  if (strict) {
    // Convert the name to the form that KPHP uses for files.
    const filename = convertFqnToCppFileName(query);
    // When searching for such a string, when we find it, we will be sure
    // that this is the required file, and not a function file with the same
    // suffix, for example:
    //   filename    = "someFunc"
    //   found_files = ["src/someFunc.cpp", "src/someFuncOther.cpp"]
    const filename_with_dot = filename + '\\.';
    utils.debug(`Filename for search: ${filename_with_dot}`);

    const files = findFunctionFilesWithNameLike(filename_with_dot);
    utils.debug(`Found files: ${files.length === 0 ? 'nothing' : files.join(', ')}`);

    return files.filter(file => doesFileContainFunction(file));
  }

  let [qParts, longestQ] = queryToParts(query);
  const files = findFilesWithNameLike(longestQ);
  utils.debug(`Found files: ${files.length === 0 ? 'nothing' : files.join(', ')}`);

  return files.filter(fn => doesFileSatisfyQ(fn, qParts) && doesFileContainFunction(fn));
}

/**
 * @param {string} query Search string from console
 * @return {string[]} Full file names, to be passed to parseCppClass()
 */
function performSearchForClass(query) {
  const strict = query.startsWith('\\');
  utils.debug(`Start search class by query: ${query}, strict: ${strict}`);

  if (strict) {
    // Convert the name to the form that KPHP uses for files.
    const className = convertFqnToCppFileName(query);
    const classnameWithDot = className + '\\.';
    utils.debug(`Filename for search: ${classnameWithDot}`);

    const files = findFilesWithNameLike(classnameWithDot);
    utils.debug(`Found files: ${files.length === 0 ? 'nothing' : files.join(', ')}`);

    return files.filter(file => file.endsWith('.h'));
  }

  let { qParts, longestQ } = queryToParts(query);
  let files = findClassFilesWithNameLike(longestQ);
  utils.debug(`Found files: ${files.length === 0 ? 'nothing' : files.join(', ')}`);

  return files.filter(file => file.endsWith('.h') && doesFileSatisfyQ(file, qParts));
}

/**
 * @param {string} query
 * @returns {(string[]|string)[]}
 */
function queryToParts(query) {
  let qParts = splitUserSearchStr(query);
  if (qParts.length === 0) {
    return [[], ''];
  }

  utils.debug(`Query parts: ${qParts.join(', ')}`);

  let longestQLen = Math.max(...qParts.map(p => p.length));
  let longestQ = qParts.find(p => p.length === longestQLen);
  utils.debug(`Longest query part: ${longestQ}`);
  return [qParts, longestQ];
}

/**
 * @param {string} query
 * @return {string[]}
 */
function findClassFilesWithNameLike(query) {
  return findFilesWithNameLike(query, '/cl');
}

/**
 * @param {string} query
 * @return {string[]}
 */
function findFunctionFilesWithNameLike(query) {
  return findFilesWithNameLike(query).filter((filename, _, output) =>
    // strip out duplicates and strange files: leave only .cpp and .h, also filter out .h files of classes
    filename.endsWith('.cpp') ||
    (
      filename.endsWith('.h') &&
      !output.includes(filename.substr(0, filename.length - 2) + '.cpp') &&
      !filename.includes('cl/C@')
    ),
  );
}

/**
 * @param {string} query
 * @param {string} pathSuffix
 * @return {string[]}
 */
function findFilesWithNameLike(query, pathSuffix = '') {
  const command = `find ${env.RUN_ARGV.KPHP_COMPILED_ROOT}${pathSuffix} -iname "*${query}*"`;

  utils.debug(`Run local command: ${command}`);

  /** @var {string[]} */
  let output = child_process
    .execSync(command)
    .toString()
    .trim()
    .split('\n');

  utils.debug(`Output: ${output}`);

  return output;
}

/**
 * @param {string} fqn
 * @return {string}
 */
function convertFqnToCppFileName(fqn) {
  return fqn
    .replace('\\', '')
    .replace(/::/g, '@@')
    .replace(/\\/g, '@');
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
