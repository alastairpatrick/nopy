const bluebird = require("bluebird");
const child_process = require('child_process');
const fs = require("fs");
const path = require("path");

const Promise = bluebird.Promise;
const realpath = bluebird.promisify(fs.realpath);
const stat = bluebird.promisify(fs.stat);

const PACKAGE_JSON = "package.json";
const PYTHON_MODULES = "python_modules";

const OPTION_RE = /^-/;
const ARGUMENT_OPTION_RE = /^-[QWX]$/;
const TERMINATE_RE = /^-[cm]?$/;


const findSourceArg = (args) => {
  for (let i = 0; i < args.length; ++i) {
    let arg = args[i];

    // Check for an option that signals there will be no python source path.
    if (TERMINATE_RE.test(arg))
      break;

    // Skip option and its argument.
    if (ARGUMENT_OPTION_RE.test(arg)) {
      ++i;
      continue;
    }

    // Skip other options.
    if (OPTION_RE.test(arg))
      continue;

    return arg;
  }

  return undefined;
}

const findPackageDir = (options = {}) => {
  if (options.packageDir)
    return Promise.resolve(options.packageDir);

  let searchPath = options.searchPath || process.cwd();

  return realpath(searchPath)
  .then(ancestor => {
    let ancestors = [];
    for (;;) {
      ancestors.push(ancestor);
      let p = path.dirname(ancestor);
      if (!p || p == ancestor)
        break;
      ancestor = p;
    }

    return Promise.map(ancestors, (ancestor) => {
      return stat(path.join(ancestor, PACKAGE_JSON))
        .then(obj => obj.isFile() && ancestor)
        .catch(() => false)
    })
    .then(packages => {
      packages = packages.filter(package => package);
      if (packages.length === 0)
        throw new Error("Could not find directory containing package.json");
      return packages[0];
    });
  });
}

const pythonEnv = (packageDir, env) => {
  env = Object.assign({}, env || process.env);
  delete env["PYTHONNOUSERSITE"];
  env["PYTHONUSERBASE"] = path.join(packageDir, PYTHON_MODULES);
  return env;
};

const spawnPython = (args, options = {}) => {
  options = Object.assign({
    interop: "status",
    packageDir: undefined,
    pythonPath: "python",
    searchPath: undefined,
    spawn: {},
    throwNonZeroStatus: true,
  }, options);

  if (!options.searchPath)
    options.searchPath = findSourceArg(args);

  return findPackageDir(options).then(packageDir => {
    options.spawn.env = pythonEnv(packageDir, options.spawn.env);
    let child = child_process.spawn(options.pythonPath, args, options.spawn);
    switch (options.interop) {
    case "child":
      return child;
    case "buffer":
      return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", data => {
          stdout += data;
        });
        child.stderr.on("data", data => {
          stderr += data;
        });
        child.on("error", reject);
        child.on("close", code => {
          if (options.throwNonZeroStatus && code !== 0)
            reject(new Error(`Exited with code ${code}.\n${stderr}`));
          resolve({ code, stdout, stderr });
        });
      });
    case "status":
      return new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", code => {
          if (options.throwNonZeroStatus && code !== 0)
            reject(new Error(`Exited with code ${code}.`));
          resolve(code);
        });
      });
    default:
      throw new Error(`Unexpected interop mode ${options.interop}`);
    }
  });
}

module.exports = {
  findSourceArg,
  pythonEnv,
  findPackageDir,
  spawnPython,
}
