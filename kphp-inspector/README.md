# kphp-inspector

A console tool to query and examine KPHP output — C++ sources generated from PHP.

<img width="474" alt="screen" src="https://user-images.githubusercontent.com/67757852/92613543-c1ab6080-f2c3-11ea-96d6-ee2d4a6c09c8.png">

## Purpose of this tool

When you have a big PHP project that compiles with KPHP, lots of *.cpp/.h* files are generated as a part of PHP→C++ translation. 
Sometimes you want to look at generated C++ code for a specific function — how large it is, how types of local vars were inferred, etc.
But it offers some difficulties to manually locate output for a particular function in a pile of codegenerated folders.

`kphp-inspector` helps you quickly locate a function/class in codegenerated folder and extract a brief summary — 
normally just what you are searching for if you do it manually.

## Installation

This is a Node.JS script without any dependencies, so you even don't need npm/yarn — just copy/clone the sources, and installation is done.

## Basic usage: interactive console

First, you must have a KPHP-compiled site — a folder with lots of *.cpp/.h* files. This folder is `--root`.

Then you run
```bash
node kphp-inspector/ --root /path/to/generated/cpp/code
```

It displays an interactive console, where user can query info about functions and classes. Main commands are:
```bash
# show brief info about a function
# examples of query: "reorderTags", "\Full\FQN::method", "post calculateWeight"
> f {query}              

# output codegenerated source of function
> src {query}
    
#  show brief info about a class; query e.g.: "\Wall\Post", "wall post" 
> cl {query}     
```
If many functions/classes found for *query*, menu is displayed with up-down keyboard navigation.

**In short, basic usage is**: you copy function name from IDE and enter `f functionName`.

*Note for classes*. KPHP generates instance classes as separate *.h* files, but is does not generate static fields / static classes. 
That's why `cl {query}` can find only classes with non-static fields. 

## Advanced arguments

Besides `--root`, you can provide **one of these** arguments:
* `-f {query}` — print brief info about function and exit
* `-src {query}` - print generated source code of function and exit
* `-cl {query}` - print info about a class and exit

So, these arguments don't switch on an interactive console: instead, they immediately execute the query.

  
