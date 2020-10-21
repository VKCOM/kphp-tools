// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2020 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

/*
    `kphp-inspector` - a console tool to query and examine KPHP output — C++ sources generated from PHP.
    Written in Node.JS without any dependencies, it is basically invoked as
    > node kphp-inspector/ --root /path/to/generated/cpp/code
    It displays an interactive console, where user can query info about functions and classes. Main commands are:
    > f {query}       show brief info about a function; examples of query: "reorderTags", "\Full\FQN::method", "post calculateWeight"
    > src {query}     output codegenerated source of function; query is the same
    > cl {query}      show brief info about a class; examples of query: "NamespaceName ClassName", "\Wall\Post", "wall post"
    If many functions/classes found for {query}, menu is displayed.
    For more specific command-line arguments see docs.
 */

var fs = require('fs');
var interactive = require('./src/interactive-console');
var env = require('./src/env');
var searcher = require('./src/file_searcher');
var printer = require('./src/printer');
var parser = require('./src/cpp_parser');


function parseConsoleArgv(argv) {
  for (var i = 0; i < argv.length; ++i) {
    switch (argv[i]) {

      case '--root':
        env.RUN_ARGV.KPHP_COMPILED_ROOT = argv[i + 1];
        break;
      case '-f':
      case '--f':
        env.RUN_ARGV.JUST_INFO_ABOUT_F = argv[i + 1];
        break;
      case '-src':
      case '--src':
        env.RUN_ARGV.JUST_SRC_OF_F = argv[i + 1];
        break;
      case '-cl':
      case '--cl':
      case '--class':
        env.RUN_ARGV.JUST_INFO_ABOUT_CLASS = argv[i + 1];
        break;
      case '--help':
      case '-help':
      case '--h':
      case '-h':
      case '-?':
        env.RUN_ARGV.JUST_SHOW_HELP = true;
        break;
      case '-v':
      case '--v':
      case '--version':
        env.RUN_ARGV.JUST_SHOW_VERSION = true;
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

  checkDir(env.RUN_ARGV.KPHP_COMPILED_ROOT, "invalid --root cmd argument");
}


// ——————————————————————

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
    interactive.printHelp();
    return;
  }
  // just show version and exit
  if (env.RUN_ARGV.JUST_SHOW_VERSION) {
    interactive.printVersion();
    return;
  }
  // specified exact function — do not start interactive console, but just output info/src of it
  if (env.RUN_ARGV.JUST_INFO_ABOUT_F || env.RUN_ARGV.JUST_SRC_OF_F) {
    let q = env.RUN_ARGV.JUST_INFO_ABOUT_F || env.RUN_ARGV.JUST_SRC_OF_F;
    let foundFiles = searcher.performSearchForFunction(q);
    if (foundFiles.length === 0) {
      console.log(`No function found for query '${q}'`);
    } else if (foundFiles.length > 1) {
      console.log(`Multiple files found for query '${q}'`);
    } else {
      env.RUN_ARGV.JUST_INFO_ABOUT_F
        ? printer.printFunctionInfo(parser.parseCppFunction(foundFiles[0]))
        : printer.printFunctionSrc(parser.parseCppFunction(foundFiles[0]));
    }
    return;
  }
  // specified exact class name — do not start interactive console, but just output info about it
  if (env.RUN_ARGV.JUST_INFO_ABOUT_CLASS) {
    let q = env.RUN_ARGV.JUST_INFO_ABOUT_CLASS;
    let foundFiles = searcher.performSearchForClass(q);
    if (foundFiles.length === 0) {
      console.log(`No class found for query '${q}'`);
    } else if (foundFiles.length > 1) {
      console.log(`Multiple files found for query '${q}'`);
    } else {
      printer.printClassInfo(parser.parseCppClass(foundFiles[0]));
    }
    return;
  }

  // if no initial command-line search — start working in interactive mode
  interactive.start();
}

main();
