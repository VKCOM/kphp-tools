/*
    Module that outputs formatted results: print info/src of a function, print info of a class.
    A simple file with many colors, alignments and console.log().
 */

var COLORS = require('./colors');

function cppType(/**string*/ cppTypeStr) {
  // pretty print: not array< class_instance<C$VK$API$Builders$Station> > but array< \VK\API\Builders\Station >
  var s = cppTypeStr
    .replace(/class_instance<C(\$.+?)>/g, (m, cn) => cn.replace(/\$/g, '\\'))
    .replace(/int64_t/g, 'int')
    .replace(/std::tuple/g, 'tuple')

  return (s === 'var' ? COLORS.FgRed : COLORS.FgMagenta) + s + COLORS.RESET;
}

/**
 *
 * @param {ParsedCppFunction} f
 */
module.exports.printFunctionInfo = function(f) {
  var s = '';

  s += "\n";
  s += "======================== " + COLORS.Underscore + f.phpFuncName + "()" + COLORS.RESET + "\n";
  s += "Source file: " + f.cppFileName + "\n";
  s += "Complexity:  " + COLORS.FgCyan + f.cppSrc.split("\n").length + " lines" + COLORS.RESET + "\n";
  s += COLORS.Bright + "@return      " + COLORS.RESET + cppType(f.getReturnType()) + "\n";
  if (f.wasInlined) {
    s += COLORS.FgCyan + 'Was inlined' + COLORS.RESET + "\n";
  }
  if (f.isResumable) {
    s += COLORS.FgCyan + 'Is resumable' + COLORS.RESET + "\n";
  }

  let args = f.getParameters();
  s += "\n";
  s += "======================== " + COLORS.Underscore + args.length + " argument" + (args.length === 1 ? "" : "s") + COLORS.RESET + "\n";
  s += args.map(arg => {
    return COLORS.Bright + arg.varName.padStart(24) + " " + COLORS.RESET + cppType(arg.cppType);
  }).join("\n") + "\n";

  let locals = f.getLocalVars();
  s += "\n";
  s += "======================== " + COLORS.Underscore + locals.length + " local var" + (locals.length === 1 ? "" : "s") + COLORS.RESET + "\n";
  s += locals.map(arg => {
    return COLORS.Bright + arg.varName.padStart(24) + " " + COLORS.RESET + cppType(arg.cppType);
  }).join("\n") + "\n";

  console.log(s);
};

/**
 *
 * @param {ParsedCppFunction} f
 */
module.exports.printFunctionSrc = function(f) {
  var s = '';

  s += "\n";
  s += "======================== " + COLORS.Underscore + f.phpFuncName + "()" + COLORS.RESET + "\n";

  s += "\n";
  s += f.cppSrc.trim().replace(/^\/\/(crc|source|\d+:).+?$/mg, (line) => COLORS.Dim + line + COLORS.RESET);

  console.log(s);
};

/**
 *
 * @param {ParsedCppClass} c
 */
module.exports.printClassInfo = function(c) {
  var s = '';

  s += "\n";
  s += "======================== " + COLORS.Underscore + c.phpClassName + COLORS.RESET + "\n";
  s += "Source file: " + c.hFileName + "\n";

  let vars = c.getInstanceVars();
  s += "\n";
  s += "======================== " + COLORS.Underscore + vars.length + " instance var" + (vars.length === 1 ? "" : "s") + COLORS.RESET + "\n";
  s += vars.map(v => {
    return COLORS.Bright + v.varName.padStart(24) + " " + COLORS.RESET + cppType(v.cppType);
  }).join("\n") + "\n";

  console.log(s);
};
