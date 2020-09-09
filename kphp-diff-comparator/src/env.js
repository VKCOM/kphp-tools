const VERSION = '1.0.0';

// console arguments (argv) override these defaults
const RUN_ARGV = {
  // required arguments: paths to compare and diff output folder
  KPHP_MASTER_ROOT: '',
  KPHP_CMP_ROOT: '',
  DETAILED_DIFF_ROOT: '',
  // other optional console arguments
  JUST_SHOW_HELP: false,
  JUST_SHOW_VERSION: false,
  SKIP_ONLY_COMMENTS_DIFF: false,
};

module.exports.VERSION = VERSION;
module.exports.RUN_ARGV = RUN_ARGV;
