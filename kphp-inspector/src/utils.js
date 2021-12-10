// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2021 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

const env = require('./env');

function debug(value) {
  if (!env.RUN_ARGV.DEBUG) return;

  console.log(value);
}

module.exports.debug = debug;
