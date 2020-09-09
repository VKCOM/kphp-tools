# kphp-diff-comparator

A console tool to compare two KPHP outputs (folders with *.cpp/.h* files generated from PHP code).

## Purpose of this tool

It is useful for KPHP development — to make sure your refactoring doesn't affect codegeneration. 

Imagine that you have your KPHP compiled site and at the same time you are KPHP developer. 
You have a compiled stable version of your site and start refactoring KPHP or implementing new features.
Afterwards, you want to ensure that your changes haven't affected codegeneration — or if had, they are expected.

The easiest way to do it is just to compare previous (stable) codegenerated folder against a new one.  

This tool performs fast comparing (fast even for 100k files), outputs brief diff info and detailed diff log files.

This is much faster than just `diff -r`. 
Also, this tool knows about KPHP codegeneration specifics and deals with situations when there is no logical diff even if file contents actually differ.  

## Installation

This is a Node.JS script without any dependencies, so you even don't need npm/yarn — just copy/clone the sources, and installation is done.

## Usage

1. Compile your site with stable KPHP version, backup output like `cp -r /path/to/compiled kphp_master`
2. Change KPHP sources or switch branches
3. Compile your site with new KPHP version
4. Create empty `mkdir diff` folder; or `rm -r diff/*` if it existed
5. Run this tool:
    ```bash
    node kphp-diff-comparator/ --master kphp_master --cmp /path/to/compiled --diff diff 
    ```
6. Examine the output. Also, for every diff file system `diff` is invoked, and its result is placed to `--diff` folder.

## More options

* `--skip-comments` — do not pay attention to files which differ only in PHP comments
