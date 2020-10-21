// Compiler for PHP (aka KPHP) tools
// Copyright (c) 2020 LLC «V Kontakte»
// Distributed under the GPL v3 License, see LICENSE.notice.txt

var fs = require('fs');
var path = require('path');

module.exports = function walkRecursively(dir, eachFileCallback, doneCallback) {
  fs.readdir(dir, function(err, list) {
    var pending = err ? 0 : list.length;
    if (!pending) {
      return doneCallback();
    }

    list.forEach((file) => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {

        if (stat && stat.isDirectory()) {
          walkRecursively(file, eachFileCallback, () => !--pending && doneCallback());
        } else {
          eachFileCallback(file);
          !--pending && doneCallback();
        }

      });
    });
  });
};
