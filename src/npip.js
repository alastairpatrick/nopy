#!/usr/bin/env node

"use strict";

const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const { findPackage, spawnPython } = require("./api");
const { downloadFile } = require("./utils");

const installPip = async (pkg) => {
  try {
    await fs.stat(path.join(pkg.dir, "python_modules"));
    return;
  } catch (error) {
    if (error.code !== "ENOENT")
      throw error;
  }

  console.log("No python_modules directory; installing pip locally if needed.");
  const opt = {
    package: pkg,
    interop: "status",
    spawn: {
      stdio: "inherit"
    }
  };

  // Check if pip is already installed.
  try {
    await spawnPython(["-m", "pip", "-V"], opt);
    return;
  } catch { }

  // Try to install via ensurepip.
  try {
    await spawnPython(["-m", "ensurepip", "--user"], opt);
    console.log("Successfully completed pip check.");
    return;
  } catch { }

  // run get-pip.py.
  try {
    await spawnPython([path.join(__dirname, "get-pip.py"), "--user", "--quiet"], opt);
    console.log("Successfully completed pip check.");
    return;
  } catch { }

  // Last resort: download pip and run it.
  const tmpFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'npip-'));
  const tmpFile = path.join(tmpFolder, "get-pip.py");

  try {
    await downloadFile("https://bootstrap.pypa.io/get-pip.py", tmpFile);
    // run get-pip.py
    await spawnPython([tmpFile, "--user", "--quiet"], opt);
    console.log("Successfully completed pip check.");
    return;
  } finally {
    await fs.rm(tmpFolder, { recursive: true, force: true });
  }
};

const main = () => {
  let args = process.argv.slice(2);
  let command = args[0];

  return findPackage().then(pkg => {
    return pkg.readJSON().then(json => {
      let installed = Promise.resolve();
      if (command === "install")
        installed = installPip(pkg);

      return installed.then(() => {
        if (command == "install" && args.length === 1) {
          let deps = Object.assign({}, json.python.dependencies, json.python.devDependencies);
          let count = 0;
          for (let name in deps) {
            if (Object.prototype.hasOwnProperty.call(deps, name)) {
              let version = deps[name];
              args.push(name + version);
              ++count;
            }
          }

          if (count === 0) {
            console.log("npip has no dependencies listed in package.json to install.");
            return 0;
          }
        }

        if (command === "install" || command === "freeze" || command === "list")
          args.splice(1, 0, "--user");

        // Run pip as a python module so that pip itself does not need to be on PATH, only python.
        args.unshift("-m", "pip");

        return spawnPython(args, {
          package: pkg,
          interop: "status",
          throwNonZeroStatus: false,
          spawn: {
            stdio: "inherit",
          },
        });
      });
    });
  });
}

if (require.main === module) {
  main().then(process.exit).catch(error => {
    console.error(error.stack);
    process.exit(1);
  });
}
