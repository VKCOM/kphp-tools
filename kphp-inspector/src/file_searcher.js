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
 * @return {string[]}    Full file names, to be passed to parseCppFunction()
 */
function performSearchForFunction(query) {
  const isFQN = query.startsWith('\\');
  utils.debug(`Start search function by query: ${query}`);

  if (isFQN) {
    const filename = convertFqnToKphpStyleCppFileName(query);
    const filenameWithDot = filename + '\\.';
    utils.debug(`Filename for search: ${filenameWithDot}`);

    const searchPrefix = true;
    const files = findFunctionFilesWithNameLike(filenameWithDot, searchPrefix);
    utils.debug(`Found files: ${files.length === 0 ? 'empty' : files.join(', ')}`);

    return files.filter(filename => doesFileContainFunction(filename));
  }

  let [queryParts, longestPart] = queryToParts(query);
  const files = findFunctionFilesWithNameLike(longestPart);
  utils.debug(`Found files: ${files.length === 0 ? 'empty' : files.join(', ')}`);

  return files.filter(filename => doesFileSatisfyQ(filename, queryParts) && doesFileContainFunction(filename));
}

/**
 * @param {string} query Search string from console
 * @return {string[]}    Full file names, to be passed to parseCppClass()
 */
function performSearchForClass(query) {
  const isFQN = query.startsWith('\\');
  utils.debug(`Start search class by query: ${query}`);

  if (isFQN) {
    const filename = convertFqnToKphpStyleCppFileName(query);
    const filenameWithDot = filename + '\\.';
    utils.debug(`Filename for search: ${filenameWithDot}`);

    const files = findClassFilesWithNameLike(filenameWithDot);
    utils.debug(`Found files: ${files.length === 0 ? 'empty' : files.join(', ')}`);

    return files.filter(filename => filename.endsWith('.h'));
  }

  let [queryParts, longestPart] = queryToParts(query);
  let files = findClassFilesWithNameLike(longestPart);
  utils.debug(`Found files: ${files.length === 0 ? 'empty' : files.join(', ')}`);

  return files.filter(filename => filename.endsWith('.h') && doesFileSatisfyQ(filename, queryParts));
}

/**
 * Convert search query into parts and looking for the longest.
 * For example
 *   "ClassName::method" -> parts: ['classname','method'], longest: 'classname'
 *   "VK Feed something" -> parts: ['vk','feed','something'], longest: 'something'
 *
 * Returns the parts in first element and the longest part in second.
 *
 * @param {string} query
 * @returns {[string[], string]}
 */
function queryToParts(query) {
  let queryParts = query
    .toLowerCase()
    .trim()
    .split(/[\\,+\s:()]/)
    .map(p => p.trim())
    .filter(p => p !== '');
  if (queryParts.length === 0) {
    return [[], ''];
  }

  utils.debug(`Query parts: ${queryParts.join(', ')}`);

  let longestPartLen = Math.max(...queryParts.map(p => p.length));
  let longestPart = queryParts.find(p => p.length === longestPartLen);

  return [queryParts, longestPart];
}

/**
 * Searches for files for classes.
 * @see findFilesWithNameLike
 *
 * @param {string} name Filename to search
 * @return {string[]}   An array of found files
 */
function findClassFilesWithNameLike(name) {
  return findFilesWithNameLike(name, `${env.RUN_ARGV.KPHP_COMPILED_ROOT}/cl`, false);
}

/**
 * Searches for files for functions with additional filtering.
 * @see findFilesWithNameLike
 *
 * @param {string} name          Filename to search
 * @param {boolean} searchPrefix Specifies whether to search for a prefix or a substring
 * @return {string[]}            An array of found files
 */
function findFunctionFilesWithNameLike(name, searchPrefix = false) {
  return findFilesWithNameLike(name, env.RUN_ARGV.KPHP_COMPILED_ROOT, searchPrefix)
    .filter((filename, _, output) =>
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
 * Function searches for files in `searchFolder` that have the `name` substring in the name.
 *
 * If `searchPrefix` is true, then the search will search for files with the `name` prefix.
 *
 * @param {string} name          Filename to search
 * @param {string} searchFolder  Folder among the files to be searched
 * @param {boolean} searchPrefix Specifies whether to search for a prefix or a substring
 * @return {string[]}            An array of found files
 */
function findFilesWithNameLike(name, searchFolder, searchPrefix = false) {
  const findQuery = searchPrefix ? `${name}*` : `*${name}*`;

  const command = `find ${searchFolder} -iname "${findQuery}"`;

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
 * Converts the passed fqn to a filename that KPHP uses to store the class with this fqn.
 *
 * For example:
 *   fqn: \VK\Namespace\SomeClass::__construct
 *   path: VK@Namespace@SomeClass@@__construct
 *
 * @param {string} fqn
 * @return {string}
 */
function convertFqnToKphpStyleCppFileName(fqn) {
  return fqn
    .replace('\\', '')
    .replace(/::/g, '@@')
    .replace(/\\/g, '@');
}

module.exports.performSearchForFunction = performSearchForFunction;
module.exports.performSearchForClass = performSearchForClass;
