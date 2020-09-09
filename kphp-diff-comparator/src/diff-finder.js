/*
    Kernel logic of this project: recursively compare 2 directories.
    This is fast, because we don't compare all contents of all files — only headings, as in contains //crc64 comment.
    For every diff file, we print its name to console and invoke `diff` to --diff folder.
 */

var fs = require('fs');
var child_process = require('child_process');
var path = require('path');
var env = require('./env');
var walkRecursively = require('./walk-recursively');

/**
 * @see onDoneAll
 */
const RUN_STATE = {
  totalCount: 0,
  inessentialDiffCount: 0,
  importantDiffCount: 0,
  start: new Date,
};

/**
 * @param {string} masterFileName
 */
function onEachFile(masterFileName) {
  if (!isCppSourceFile(masterFileName)) {
    return;
  }
  RUN_STATE.totalCount++;

  var rel_fn = path.relative(env.RUN_ARGV.KPHP_MASTER_ROOT, masterFileName);
  var comparedFileName = path.join(env.RUN_ARGV.KPHP_CMP_ROOT, rel_fn);

  doKphpFilesDiffer(masterFileName, comparedFileName, (differ) => {
    differ && logWhenFilesDiffer(masterFileName, comparedFileName);
  });
}


/**
 * @param {string} fullFileName
 */
function isCppSourceFile(fullFileName) {
  return fullFileName.endsWith('.cpp') || fullFileName.endsWith('.h');
}

/**
 * Assume that 2 cpp files are different, if their heads are different: //crc64 in the beginning of file
 */
function doKphpFilesDiffer(full1name, full2name, onResult) {
  var start1 = partialFSReadSync(full1name, 0, 64);
  var start2 = partialFSReadSync(full2name, 0, 64);

  var differ = Buffer.compare(start1, start2) !== 0;
  onResult(differ);
}

function partialFSReadSync(path, start, end) {
  var buf = Buffer.alloc(end - start);
  try {
    var fd = fs.openSync(path, 'r');      // intentionally sync version, not to open a lot of fd
    fs.readSync(fd, buf, 0, end - start, start);
    fs.closeSync(fd);
  } catch (ex) {
    return Buffer.alloc(0);
  }
  return buf;
}

/**
 * @param {string} masterFileName
 * @param {string} comparedFileName
 */
function logWhenFilesDiffer(masterFileName, comparedFileName) {
  var rel_fn = path.relative(env.RUN_ARGV.KPHP_MASTER_ROOT, masterFileName);
  var
    start1 = partialFSReadSync(masterFileName, 0, 30),
    start2 = partialFSReadSync(comparedFileName, 0, 30);
  var only_comments =         // crc64 equals, crc64_with_comments not
    Buffer.compare(start1, start2) === 0;
  var is_important =
    !(/vars\d+\.cpp/.test(masterFileName)) &&
    !masterFileName.endsWith('_lib_version.h') &&
    !only_comments;
  var dest_doesnt_exist =
    start2.length === 0;

  is_important ? RUN_STATE.importantDiffCount++ : RUN_STATE.inessentialDiffCount++;

  if (is_important || (only_comments && !env.RUN_ARGV.SKIP_ONLY_COMMENTS_DIFF)) {
    var diff_fn = rel_fn.replace(/\//g, '_');
    console.log(`diff: ${diff_fn}${only_comments ? ' (comments only)' : ''}${dest_doesnt_exist ? ' (doesnt exist)' : ''}`);
    child_process.exec(`diff -u -I '// .*' -I '//.*' ${masterFileName} ${comparedFileName} &> ${path.join(env.RUN_ARGV.DETAILED_DIFF_ROOT, diff_fn)}`);
    child_process.exec(`cp ${masterFileName} ${path.join(env.RUN_ARGV.DETAILED_DIFF_ROOT, 'master_' + diff_fn)}`);
    child_process.exec(`cp ${comparedFileName} ${path.join(env.RUN_ARGV.DETAILED_DIFF_ROOT, 'cmp_' + diff_fn)}`);
  }
}


module.exports = function treeWalkAndLogAllDiff(onDoneAll) {
  RUN_STATE.start = new Date;
  walkRecursively(env.RUN_ARGV.KPHP_MASTER_ROOT, onEachFile, () => onDoneAll(RUN_STATE));
};
