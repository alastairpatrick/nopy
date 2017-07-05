# nopy

Install and run python dependencies in node.js project.

This project is an alternative to a python virtual environment for node.js projects. It aims to make pip work more like npm. It supports pythons 2 and 3.

## Installation

As a prerequisite, python and npm must be installed and on `PATH`.

Suppose we create an empty project with a `package.json` file:
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

Then, to install nopy as a local dependency:
```
$ npm install nopy --save
...
```

Optionally, add scripts to `package.json` to run the command line tools via npm:
```
{
  "name": "myproject",
  ...
  "scripts": {
    "nopenv": "nopenv",
    "nopy": "nopy",
    "npip": "npip"
  },
  "dependencies": {
    "nopy": ""
  },
  ...
}
```

In the remaining example, the scripts are assumed to have been added.

## Using npip to install python packages

To install a python package in a node.js project:
```
$ npm run npip -- install toposort
...
Downloading/unpacking toposort
  Downloading toposort-1.5-py2.py3-none-any.whl
Installing collected packages: toposort
Successfully installed toposort
Cleaning up...
```

This creates a `python_modules` subdirectory, which contains the installed python packages. Other pip commands are supported by npip:
```
$ npm run -s npip -- freeze
toposort==1.5
```

## Using nopy to run python

Invoke python using the nopy wrapper and it will find the python packages installed in `python_modules`.
```
$ npm run nopy
...
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

Here, when python was invoked interactively, it looked in the `python_modules` subdirectory to find the locally installed toposort dependency.

Suppose the program above was saved in as a script file called `script.py`. To direct python to invoke that script file:
```
$ npm run -s nopy -- script.py
[{3, 5, 7}, {8, 11}, {2, 10}, {9}]
```

Both python command line options and script arguments may be passed to nopy via the command line in the same way as they would be passed to python.

To pass python code on the command line, use python's `-c` option:
```
$ npm run -s nopy -- -c 'import sys; print(sys.argv[1]);' hello
hello
```

Similarly, pythons's `-m` option may be used to execute python modules.

To find the `python_modules` directory, when nopy is invoked with the path to a script, it first inspects the directory containing that script to see if it has a `package.json` file. If it's there, then it will try to use a `python_modules` directory alongside it. If `package.json` isn't found, it works up the directory hierarchy towards the root. If a `package.json` file is found anywhere along the way, it tries to use a sibling `python_modules` directory. This resembles the mechanism that node.js uses to resolve modules.

If nopy is invoked with no script path, e.g. if it is invoked interactively or with `-m` or `-c`, the process is quite similar. Instead of starting in the script's directory, it starts in the current working directory.

## Documenting python dependencies

Python dependencies should be listed in the `package.json` file in the same way as for node.js dependencies, except the section is called `python.dependencies` rather than `dependencies`. Here is an example package.json file:
```
{
  "name": "myproject",
  ...
  "dependencies": {
    "nopy": ""
  },
  "python": {
    "dependencies": {
      "toposort": ">=1.5"
    }
  }
}
```

A version may be specified for python dependencies, which follows the same format as used by [pip requirement specifiers](https://www.python.org/dev/peps/pep-0508/). The version may be an empty string.

This serves not only to document the python dependencies; if `npip install` is invoked with no requirements, its default action is to install all the python dependencies given in `package.json`.
```
$ npm run npip -- install
...
Requirement already satisfied: toposort
```

It might be desirable to install the python dependencies at the same time as the other dependencies. This can be accomplished with an npm install script.
```
{
  "name": "myproject",
  ...
  "scripts": {
    "install": "npip install",
    "nopy": "nopy",
    "npip": "npip"
  },
  "dependencies": {
    "nopy": ""
  },
  "python": {
    "dependencies": {
      "toposort": ">=1.5"
    }
  }
}
```

Now both the node.js and python dependencies can be installed with a single command:
```
$ npm install
```

Python dependencies may also be placed in a `python.devDependencies` section. Currently, these are treated exactly the same as `python.dependencies`. The distinction is in what is documented: a dev dependency might only required by those developing a project and need not be installed to just use it. In the future, dev dependencies might not be installed in some cases.

## Using nopenv to run programs in the local python environment

The nopenv tool is similar to nopy. Rather than invoking the python interpreter with a python script, it is used to run executable programs in the context of a python environment, including locally installed python modules. For example, it is useful for running executables installed by some python packages.

The [mako](http://www.makotemplates.org/) python package will be used as an example in this section. It is a popular template library. It is not related to nopy in any way but is a useful example because it installs an executable called mako-render that we might want to run. To install mako, add it to the `python.dependencies` section of `package.json`:
```
{
  "name": "myproject",
  ...
  "scripts": {
    "install": "npip install",
    "nopy": "nopy",
    "npip": "npip"
  },
  "dependencies": {
    "nopy": ""
  },
  "python": {
    "dependencies": {
      "mako": "==1.0.6",
      "toposort": ">=1.5"
    }
  }
}
```

Then reinstall:
```
$ npm install
```

Suppose we have a file `template.mako` containing a simple template:
```
## template.mako
Hello, ${NAME}!
```

Here is one way to run mako-render to expand the template with a variable substitution:
```
$ node_modules/.bin/nopenv mako-render template.mako --var NAME=Al
Hello, Al!
```

It's convenient to make an npm script in `package.json` to quickly invoke mako-render:
```
{
  "name": "myproject",
  ...
  "scripts": {
    "install": "npip install",
    "mako": "nopenv mako-render",
    "nopy": "nopy",
    "npip": "npip"
  },
  "dependencies": {
    "nopy": ""
  },
  "python": {
    "dependencies": {
      "mako": "==1.0.6",
      "toposort": ">=1.5"
    }
  }
}
```

Now the same can be accomplished with this shorter invocation:
```
$ npm run -s mako -- template.mako --var NAME=Al
Hello, Al!
```

## Python executable path

By default, nopy assumes there is a program called `python` in the `PATH`, which it uses to invoke the python interpreter. This is configured in the `python.execPath` section of `package.json`.

```
  "name": "myproject",
  ...
  "python": {
    "execPath": "python3",
  },
  ...
```

In the example above, nopy will execute `python3` instead of `python` to run programs.

## PYTHONPATH

By default, nopy sets the `PYTHONPATH` environment variable to the project directory, i.e. the directory containing `package.json`, replacing any previous value. 

A different path may be used by putting it in the `python.path` section of `package.json`. Relative paths are relative to the project directory. An array of paths may also be provided.

In the example below, `PYTHONPATH` will be set so that python searches first in the project directory for modules and then in the `src` sub-directory.
```
{
  "name": "myproject",
  ...
  "python": {
    "path": [".", "src"],
  },
  ...
}
```

Note that modules from python packages installed in python_modules will be on the search path regardless of `PYTHONPATH`, since they are in the user site-packages directory.

Finally, remember that python prepends the directory containing the python script to the module search path and often you don't need to mess with `PYTHONPATH` at all.

## Global installation

nopy can be installed globally so that nopy and npip are on `PATH`. For example:
```
$ npm install nopy -g
...
$ npip install <package name>
...
```

However, I prefer to make do with only a local installation, npm scripts and bash aliases. The reason is because I generally want to minimize the number of globally installed things necessary to make a project work.

## Tips

### Interactive Shells

For interactive shells, you might like some shortcuts. Here are some examples for bash:
```
# $HOME/.bashrc
function npmrun()
{
  local command=$1
  shift
  npm --silent --color false run "$command" -- $@
}
function npip()
{
  npmrun npip $@
}
function nopy()
{
  npmrun nopy $@
}

```

Or for Windows PowerShell:
```
# $PROFILE
function npmrun()
{
  $command, $rest = $args
  npm --silent --color false run "$command" -- $rest
}
function nopy()
{
  npmrun nopy $args
}
function npip()
{
  npmrun npip $args
}
```

Here is a usage example:
```
$ npip freeze
toposort==1.5
mako==1.0.6
```

### .gitignore

You probably want git to ignore the `python_modules` directory and some other things.

```
# .gitignore
...
# Python things to ignore
python_modules
__pycache__
*.pyc
...
```

## Gotchas

### PYTHONPATH

When a python script is invoked with nopy, its `PYTHONPATH` environment variable is modified to point to the node.js project directory, i.e. the one containing `package.json`, or whichever directories have been configured. This allows modules to be imported relative to the project directory itself, not just from python packages that have been installed in `python_modules`. In order to isolate the project's python dependencies, any previous value of `PYTHONPATH` is overridden.

### PYTHONUSERBASE

Behind the scene, nopy uses python's [per user site-packages directory](https://www.python.org/dev/peps/pep-0370/) mechanism. Specifically, when python or pip are invoked indirectly by way of the nopy or npip wrappers, the `PYTHONUSERBASE` environment variable is modified to reference the python_modules directory contained in the node.js project, the one alongside package.json. This tells python to look there for installed python packages. Additionally, pip is invoked with the `--user` option, which causes it to install packages in that `python_modules` directory.

A caveat though is, because python's per user site-packages directory is overridden, any other such directory, such as one residing in the user's home directory, is no longer visible to python. If the goal is to isolate the project's python dependencies within the project, this is a feature. It's definitely a potential gotcha, though!

### Python version

npip ships with a version of pip that it can install locally into the node.js project site directory. It does this automatically when the first python package is installed but only if there is not a more recent version of pip installed globally. To see which version of pip is used by npip, use the `--version` option:
```
$ npm run -s npip -- --version
pip 9.0.1 from /home/al/myproject/python_modules/lib/python2.7/site-packages (python 2.7)
```

The oldest versions of python that nopy has been tested with are 2.7.6 and 3.6.0.

### Uninstalling python packages

Unfortunately, pip has an undesirable behavior when uninstalling packages with a user site-package directory employed. When pip is invoked with the `uninstall` command, it will prefer to uninstall the package from the user site-package directory rather than globally. This is the desirable behavior for npip. However, if the package is not installed in the user site-pacakge directory, pip will attempt to uninstall the package globally! Oftentimes, this will fail on account of the user not having permission to uninstall global python packages but not necessarily.

## TODO

These are some things that might happen in the future.
* There is a node.js API to programatically spawn python programs. This could be documented and made "official".
* Integrate JSON-RPC or other protocol over channel between node.js process and python child processes.
