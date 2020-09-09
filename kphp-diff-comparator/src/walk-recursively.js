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
