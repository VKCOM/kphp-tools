// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2020 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

/*
    Module that parses .h and .cpp files of classes/functions generated by KPHP
    and finds arguments, local variables, their C++ types, etc.
    Everything is done ad-hoc, by regexps and string analysis — no lexer, AST and others.
    This is extremely primitive, but pretty enough for 99% of our cases and usage purposes.
 */

/**
 * @param {string} src
 * @return {string}
 */
function stripCppInlineComments(src) {
  return src.replace(/^\/\/.+?\n/mg, '');
}

/**
 * @param {string} paramDecl e.g. "array< class_instance<C$VK$Feed$Post> > const &v$posts", "uint64_t v$number"
 * @return {string} "$posts", "$number"
 */
function extractArgNameFromCppArgumentDecl(paramDecl) {
  let pos = paramDecl.lastIndexOf(' ');
  while (paramDecl[pos] === ' ' || paramDecl[pos] === '&' || paramDecl[pos] === 'v') {
    pos++;
  }
  return paramDecl.substr(pos).trimEnd();
}

/**
 * @param {string} paramDecl as above
 * @return {string} "array< class_instance<C$VK$Feed$Post> > const", "uint64_t"
 */
function extractArgTypeFromCppArgumentDecl(paramDecl) {
  const pos = paramDecl.lastIndexOf(' ');
  return paramDecl.substr(0, pos).trimStart().replace(' const', '');
}

class ParsedCppFunction {
  constructor(fullFileName) {
    /**
     * @type string
     * @private
     */
    this.fileName = fullFileName;
    /**
     * @type string
     * @private
     */
    this.src = require('fs').readFileSync(fullFileName, 'UTF-8');
  }

  /** @return string */
  get cppFileName() {
    return this.fileName;
  }

  /** @return string */
  get phpFuncName() {
    const m = this._matchNameAndArguments();     // m[1]: f$someFn, f$VK$Feed$Rank$$someFn()
    return !m ? '' : m[1]
      .replace(/^f\$fork\$/, '')
      .replace(/^f\$/, '')
      .replace('$$', '::')    // ClassName::method
      .replace('$$', '__')    // BaseClassName::method__ChildClassName
      .replace(/\$/g, '\\');
  }

  /** @return string */
  get cppSrc() {
    return this.src;
  }

  /** @return string */
  get cppSrcStripped() {
    return stripCppInlineComments(this.src);
  }

  /** @return boolean */
  get wasInlined() {
    return this.cppFileName.endsWith('.h');
  }

  /** @return boolean */
  get isResumable() {
    return this.src.includes('public Resumable');
  }

  /**
   * @private
   * @return {array} [1] name [2] params string
   */
  _matchNameAndArguments() {
    return this.isResumable
      ? this.src.match(/\s(f\$fork\$[\w$]+)\((.*?)\)\s(noexcept\s+)?{/)
      : this.src.match(/\s(f\$[\w$]+)\((.*?)\)\s(noexcept\s+)?{/);
  }

  /**
   * @return {{varName:string, cppType:string}[]}
   */
  getParameters() {
    const paramsStr = this._matchNameAndArguments()[2];

    // split paramsStr by ',' handling nesting
    /** @type {string[]} */
    let declarations = [];
    let nest_level = 0;
    let next_arg_start = 0;
    for (let i = 0; i < paramsStr.length; ++i) {
      const c = paramsStr[i];
      if (c === '(' || c === '<')
        nest_level++;
      else if (c === ')' || c === '>')
        nest_level--;
      else if (c === ',' && nest_level <= 0) {
        declarations.push(paramsStr.substring(next_arg_start, i));
        next_arg_start = i + 1;
      }
    }
    if (next_arg_start < paramsStr.length - 2)
      declarations.push(paramsStr.substr(next_arg_start));

    return declarations
      .map((paramDecl) => ({
        varName: extractArgNameFromCppArgumentDecl(paramDecl),
        cppType: extractArgTypeFromCppArgumentDecl(paramDecl),
      }))
      .filter((param) => param.varName !== '$this');
  }

  /**
   * @return {{varName:string, cppType:string}[]}
   */
  getLocalVars() {
    const lines = this.cppSrcStripped.split("\n");
    let local_vars = [];
    const line_start = this.isResumable ? '    ' : '  ';

    for (let line of lines) {
      const pos_v$ = line.indexOf(' v$');
      if (pos_v$ < 0)
        continue;
      const before_v$ = line.substr(0, pos_v$);

      const is_local_var_decl = line.startsWith(line_start) && line[line_start.length] !== ' '
        && !line.startsWith("  v$")
        && !line.startsWith("  return")
        // drop out some implicit kphp-generated cpp vars, which come not from original php source
        && !line.includes("v$tmp_expr")
        && !line.includes("v$shorthand_ternary_cond$")
        && !line.includes("v$resumable_temp_var$")
        && !line.includes("v$condition_on_switch$")
        && !line.includes("v$matched_with_one_case$")
        && !before_v$.includes('(')
        && !before_v$.includes('}')
        && !before_v$.includes('=')
      ;

      if (is_local_var_decl) {
        let varName = line.match(/\s(v\$[\w$]+)/)[1];
        local_vars.push({
          varName: varName.substr(1),     // v$name => $name
          cppType: line.substr(0, line.indexOf(varName)).trim(),
        });
      }
    }

    return local_vars;
  }

  /**
   * @return {string}
   */
  getReturnType() {
    return this.src.match(/^(\w.+?)\sf\$[\w$]+\(/m)[1]
      .replace('inline ', '');
  }
}

class ParsedCppClass {
  constructor(fullFileName) {
    /**
     * @type string
     * @private
     */
    this.fileName = fullFileName;
    /**
     * @type string
     * @private
     */
    this.src = require('fs').readFileSync(fullFileName, 'UTF-8');
  }

  /** @return string */
  get hFileName() {
    return this.fileName;
  }

  /** @return string */
  get cppSrc() {
    return this.src;
  }

  /** @return string */
  get cppSrcStripped() {
    return stripCppInlineComments(this.src);
  }

  /** @return string */
  get phpClassName() {
    const m = this.src.match(/^struct\sC\$([\w$]+)/m);
    return !m ? '' : m[1]
      .replace(/\$/g, '\\');
  }

  /**
   * @return {{varName:string, cppType:string}[]}
   */
  getInstanceVars() {
    let vars = [], m, re = /^\s\s(.+?)\s\$(\w+){/mg;
    while (m = re.exec(this.src)) {
      vars.push({
        varName: m[2],
        cppType: m[1],
      });
    }
    return vars;
  }
}

module.exports.parseCppFunction = function parseCppFunction(fullFileName) {
  return new ParsedCppFunction(fullFileName);
};

module.exports.parseCppClass = function parseCppClass(fullFileName) {
  return new ParsedCppClass(fullFileName);
};
