const VERSION = '1.0.0';

// console arguments (argv) override these defaults
const RUN_ARGV = {
  // main console argument: --root  — full path to codegenerated C++ sources
  KPHP_COMPILED_ROOT: '',
  // other optional console arguments
  JUST_INFO_ABOUT_F: '',
  JUST_SRC_OF_F: '',
  JUST_INFO_ABOUT_CLASS: '',
  JUST_SHOW_HELP: false,
  JUST_SHOW_VERSION: false,
};

module.exports.VERSION = VERSION;
module.exports.RUN_ARGV = RUN_ARGV;
