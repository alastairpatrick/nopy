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

    return i;
  }

  return -1;
}

const findPackageDir = (packageDescendent, options = {}) => {
  if (options.packageDir)
    return Promise.resolve(options.packageDir);
  if (!packageDescendent)
    return Promise.resolve(process.cwd());

  return realpath(packageDescendent)
  .catch(error => {
    if (error.code === "ENOENT")
      return process.cwd();
    else
      throw error;
  })
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
  args = args.slice(0);
  options = Object.assign({
    interop: "status",
    packageDir: undefined,
    execPath: "python",
    spawn: {},
    throwNonZeroStatus: true,
  }, options);

  let sourcePathIdx = findSourceArg(args);
  let packageDescendent = Promise.resolve("hi");
  let runBinScript = false;
  if (sourcePathIdx < 0) {
    packageDescendent = Promise.resolve(process.cwd());
  } else {
    packageDescendent = realpath(args[sourcePathIdx])
    .catch(error => {
      if (error.code !== "ENOENT")
        throw error;
      runBinScript = !path.isAbsolute(args[sourcePathIdx]);
      return process.cwd();
    });
  }

  return packageDescendent.then(packageDescendent => {
    return findPackageDir(packageDescendent, options).then(packageDir => {
      if (runBinScript) {
        let binDirectory = path.join(packageDir, PYTHON_MODULES, ".bin");
        options.execPath = path.join(binDirectory, args[sourcePathIdx]);
        args = args.slice(sourcePathIdx + 1);
      }

      options.spawn.env = pythonEnv(packageDir, options.spawn.env);
      let child = child_process.spawn(options.execPath, args, options.spawn);
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
  });
}

module.exports = {
  findPackageDir,
  findSourceArg,
  pythonEnv,
  spawnPython,
}
