/*
    `kphp-diff-comparator` - a console tool to compare 2 KPHP outputs (folders with .cpp/.h files generated from PHP code).
    Useful for KPHP development: you generate your site with stable (master) KPHP, change KPHP sources re-generate —
    and compare previous vs current: to ensure there is no diff or there is diff exactly as expected.
    For every diff file, we print its name to console and invoke `diff` to --diff folder.
 */

var fs = require('fs');
var env = require('./src/env');
var treeWalkAndLogAllDiff = require('./src/diff-finder');


function parseConsoleArgv(argv) {
  for (var i = 0; i < argv.length; ++i) {
    switch (argv[i]) {

      case '--master':
      case '—master':
        env.RUN_ARGV.KPHP_MASTER_ROOT = argv[i + 1];
        break;
      case '--cmp':
      case '—cmp':
        env.RUN_ARGV.KPHP_CMP_ROOT = argv[i + 1];
        break;
      case '--diff':
      case '—diff':
        env.RUN_ARGV.DETAILED_DIFF_ROOT = argv[i + 1];
        break;
      case '--skip-comments':
        env.RUN_ARGV.SKIP_ONLY_COMMENTS_DIFF = true;
        break;
      case '-v':
      case '--version':
        env.RUN_ARGV.JUST_SHOW_VERSION = true;
        break;
      case '-h':
      case '--h':
      case '--help':
        env.RUN_ARGV.JUST_SHOW_HELP = true;
        break;

    }
  }
}

function checkRunArgv() {
  let checkDir = (dir, errIfIncorrect) => {
    if (!dir || !fs.statSync(dir).isDirectory()) {
      throw errIfIncorrect;
    }
  };

  checkDir(env.RUN_ARGV.KPHP_MASTER_ROOT, "invalid --master cmd argument");
  checkDir(env.RUN_ARGV.KPHP_CMP_ROOT, "invalid --cmp cmd argument");
  checkDir(env.RUN_ARGV.DETAILED_DIFF_ROOT, "invalid --diff cmd argument");
}


// ——————————————————————

function onDoneAll({ start, totalCount, inessentialDiffCount, importantDiffCount }) {
  var duration = ((new Date) - start).valueOf();
  console.log(`\nfinished ${totalCount} cpp/h files in ${duration} msec`);
  console.log(`${inessentialDiffCount} known differences (vars.cpp, etc)`);
  console.log(`${importantDiffCount} important differences`);
}

function main() {
  try {
    parseConsoleArgv(process.argv);
    checkRunArgv();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  // just help and exit
  if (env.RUN_ARGV.JUST_SHOW_HELP) {
    console.log("Specify --master and --cmp as input C++ generated folders, --diff as output folder.\nSee README.md for details.");
    return;
  }
  // just show version and exit
  if (env.RUN_ARGV.JUST_SHOW_VERSION) {
    console.log("kphp-diff-comparator v" + env.VERSION);
    return;
  }

  console.log('\nStart comparing kphp outputs:');
  console.log(env.RUN_ARGV.KPHP_MASTER_ROOT, ' -vs- ', env.RUN_ARGV.KPHP_CMP_ROOT, "\n");

  treeWalkAndLogAllDiff(onDoneAll);
}

main();

