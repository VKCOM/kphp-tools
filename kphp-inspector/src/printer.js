// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2020 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

/*
    Module that outputs formatted results: print info/src of a function, print info of a class.
    A simple file with many colors, alignments and console.log().
 */

const Colors = require('./colors');

function cppType(/**string*/ cppTypeStr) {
  // pretty print: not array< class_instance<C$VK$API$Builders$Station> > but array< \VK\API\Builders\Station >
  const s = cppTypeStr
    .replace(/class_instance<C(\$.+?)>/g, (m, cn) => cn.replace(/\$/g, '\\'))
    .replace(/int64_t/g, 'int')
    .replace(/std::tuple/g, 'tuple')

  return (s === 'var' ? Colors.FgRed : Colors.FgMagenta) + s + Colors.RESET;
}

/**
 * @param {ParsedCppFunction} f
 */
module.exports.printFunctionInfo = function(f) {
  var s = '';

  s += "\n";
  s += "======================== " + Colors.Underscore + f.phpFuncName + "()" + Colors.RESET + "\n";
  s += "Source file: " + f.cppFileName + "\n";
  s += "Complexity:  " + Colors.FgCyan + f.cppSrc.split("\n").length + " lines" + Colors.RESET + "\n";
  s += Colors.Bright + "@return      " + Colors.RESET + cppType(f.getReturnType()) + "\n";
  if (f.wasInlined) {
    s += Colors.FgCyan + 'Was inlined' + Colors.RESET + "\n";
  }
  if (f.isResumable) {
    s += Colors.FgCyan + 'Is resumable' + Colors.RESET + "\n";
  }

  let args = f.getParameters();
  s += "\n";
  s += "======================== " + Colors.Underscore + args.length + " argument" + (args.length === 1 ? "" : "s") + Colors.RESET + "\n";
  s += args.map(arg => {
    return Colors.Bright + arg.varName.padStart(24) + " " + Colors.RESET + cppType(arg.cppType);
  }).join("\n") + "\n";

  let locals = f.getLocalVars();
  s += "\n";
  s += "======================== " + Colors.Underscore + locals.length + " local var" + (locals.length === 1 ? "" : "s") + Colors.RESET + "\n";
  s += locals.map(arg => {
    return Colors.Bright + arg.varName.padStart(24) + " " + Colors.RESET + cppType(arg.cppType);
  }).join("\n") + "\n";

  console.log(s);
};

/**
 * @param {ParsedCppFunction} f
 */
module.exports.printFunctionSrc = function(f) {
  let s = '';

  s += "\n";
  s += "======================== " + Colors.Underscore + f.phpFuncName + "()" + Colors.RESET + "\n";

  s += "\n";
  s += f.cppSrc.trim().replace(/^\/\/(crc|source|\d+:).+?$/mg, (line) => Colors.Dim + line + Colors.RESET);

  console.log(s);
};

/**
 * @param {ParsedCppClass} c
 */
module.exports.printClassInfo = function(c) {
  let s = '';

  s += "\n";
  s += "======================== " + Colors.Underscore + c.phpClassName + Colors.RESET + "\n";
  s += "Source file: " + c.hFileName + "\n";

  let vars = c.getInstanceVars();
  s += "\n";
  s += "======================== " + Colors.Underscore + vars.length + " instance var" + (vars.length === 1 ? "" : "s") + Colors.RESET + "\n";
  s += vars.map(v => {
    return Colors.Bright + v.varName.padStart(24) + " " + Colors.RESET + cppType(v.cppType);
  }).join("\n") + "\n";

  console.log(s);
};
