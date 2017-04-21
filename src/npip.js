#!/usr/bin/env node

const bluebird = require("bluebird");
const fs = require("fs");
const path = require("path");
const { findPackage, spawnPython } = require("./api");

const stat = bluebird.promisify(fs.stat);

const installPip = (pkg) => {
  return stat(path.join(pkg.dir, "python_modules")).catch(error => {
    if (error.code !== "ENOENT")
      throw error;
    console.log("No python_modules directory; installing pip locally if needed.");
    return spawnPython([path.join(__dirname, "get-pip.py"), "--user", "--quiet"], {
      package: pkg,
      interop: "status",
      spawn: {
        stdio: "inherit",
      }
    }).then(code => {
      console.log("Successfully completed pip check.");
      return code;
    });
  });
}

const main = () => {
  return findPackage().then(pkg => {
    return pkg.readJSON().then(json => {
      return installPip(pkg).then(() => {
        let args = process.argv.slice(2);
        let command = args[0];

        if (command == "install" && args.length === 1) {
          let deps = json.pythonDependencies;
          let count = 0;
          if (deps && typeof deps === "object") {
            for (let name in deps) {
              if (Object.prototype.hasOwnProperty.call(deps, name)) {
                let version = deps[name];
                args.push(name + version);
                ++count;
              }
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
