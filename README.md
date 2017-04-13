# npy
Install and run python dependencies in node.js project.

This project provides an alternative to using a python virtual environment for node.js projects. It aims to make pip work more like npm.

## Installation

First, npy's commands are wrappers for python and pip. These prerequisites must already be installed. Python must be on the PATH.

Suppose we create an empty project with a package.json file:
```
/home/al$ mkdir myproject
/home/al$ cd myproject
/home/al/myproject$ npm init -y
Wrote to /home/al/myproject/package.json:

{
  "name": "myproject",
  ...
}
```

Then, to install npy as a local dependency:
```
/home/al/myproject$ npm install npy --save
...
```

## Using npip to install python packages

To install a python package in the same project:
```
/home/al/myproject$ node_modules/.bin/npip install toposort
Collecting toposort
  Using cached toposort-1.5-py2.py3-none-any.whl
Installing collected packages: toposort
Successfully installed toposort-1.5
```

This creates a python_modules subdirectory, which contains installed python packages.

npip is a wrapper for python's pip, so you can use all the usual pip commands and command line options with npip. For example, this will list the python packages installed in the node.js project:
```
/home/al/myproject$ node_modules/.bin/npip freeze
toposort==1.5
```

## Using npy to run python

Invoke python using the npy wrapper and it will find the python packages installed in python_modules.
```
/home/al/myproject$ node_modules/.bin/npy
Python 3.6.0
Type "help", "copyright", "credits" or "license" for more information.
>>> from toposort import toposort
>>> list(toposort({2: {11},
...                9: {11, 8, 10},
...                10: {11, 3},
...                11: {7, 5},
...                8: {7, 3},
...               }))
[{3, 5, 7}, {8, 11}, {2, 10}, {9}]
```

Here, when python was invoked interactively, it looked in the python_modules subdirectory to find the locally installed toposort dependency.

To direct python to invoke a python program at a particular path:
```
/home/al/myproject$ node_modules/.bin/npy <someprogram.py>
```

To see how python thinks the per user site-directory has been configured:
```
/home/al/myproject$ node_modules/.bin/npy -m site --user-base
/home/al/myproject/python_modules
```

## API

There is an API to invoke python programs from JavaScript. It sets up the execution environment the same way as npy. The API is not documented but you could refer to the unit tests.

## Global installation

You can install npy globally so that npy and npip are on PATH. For example:
```
/home/al/myproject$ npm install npy -g
...
/home/al/myproject$ npip install <package name>
...
/home/al/myproject$ npip freeze
...
```

You might not actually need to install globally if you want to avoid typing `node_modules/.bin/` in your npm scripts. Remember that when you invoke npy or npip via an npm script, npm will add both npy and npip to its PATH, even if they are only installed locally.

## Documenting python dependencies

Python dependencies should be listed in the package.json file in the same way as for node.js dependencies, except the section is called "pythonDependencies" rather than "dependencies". Here is an example package.json file:
```
{
  "name": "myproject",
  ...
  "dependencies": {
    "npy": "^1.0.0"
  },
  "pythonDependencies": {
    "toposort": "~=1.5"
  }
}
```

A version may be specified for python dependencies, which follows the same format as used by [pip requirement specifiers](https://www.python.org/dev/peps/pep-0508/). The version may be an empty string.

This serves not only to document the python dependencies, if `npip install` is invoked with no requirements, its default action is to install all the python dependencies given in package.json.
```
/home/al/myproject$ node_modules/.bin/npip install
Requirement already satisfied: toposort
```

It might be desirable to install the python dependencies at the same time as the other dependencies. This can be accomplised with an npm install script.
```
{
  "name": "myproject",
  ...
  "scripts": {
    "install": "npy install"
  },
  "dependencies": {
    "npy": "^1.0.0"
  },
  "pythonDependencies": {
    "toposort": "~=1.5"
  }
}
```

## Gotchas

Behind the scenes, npy uses python's [per user site-packages directory](https://www.python.org/dev/peps/pep-0370/) mechanism. Specifically, when python or pip are invoked indirectly by way of the npy or npip wrappers, the `PYTHONUSERBASE` environment variable is modified to reference the python_modules directory contained in the node.js project, the one alongside `package.json`. This tells python to look there for python modules. Additionally, pip is invoked with the `--user` option, which causes it to install packages in python_modules.

This is what we want. One caveat though is, because python's per user site-packaes directory has been overwridden, any other such directory, perhaps one residing in the user's home directory, will no longer be visible to python. If the goal is to isolate the project's python dependencies within the project, in some ways this is a feature. It's definitely a potential gotcha, though!

What magic does npy use to find the `python_modules` directory? When npy is invoked with the path to a python program to run, it will first inspect the directory containing that program to see if it has a `package.json` file. If it's there, then it will try to use a `python_modules` directory alongside it. If there was no `package.json` file found, it works up the directory hierarchy until it reaches the root. If a `package.json` file is found in any of these locations, it tries to use a `python_modules` directory alongsuide it. This resembles the mechanism that node.js uses to resolve modules.

When npip is invoked or if npy is invoked interactively with no path to a program to run, the process is quite similar. Instead of starting at a directory given by the path, it starts in the current working directory.