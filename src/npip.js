#!/usr/bin/env node

const bluebird = require("bluebird");
const fs = require("fs");
const path = require("path");
const { findPackageDir, spawnPython } = require("./api");

const readFile = bluebird.promisify(fs.readFile);

const installPip = (packageDir) => {
  return spawnPython([path.join(__dirname, "get-pip.py"), "--user"], {
    packageDir,
    interop: "status",
    spawn: {
      stdio: [process.stdin, "ignore", process.stderr],
    }
  });
}

const main = () => {
  return findPackageDir().then(packageDir => {
    return readFile(path.join(packageDir, "package.json")).then(data => {
      let pkg = JSON.parse(data);

      return installPip(packageDir).then(() => {
        let args = process.argv.slice(2);
        let command = args[0];

        if (command == "install" && args.length === 1) {
          let deps = pkg.pythonDependencies;
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
          packageDir,
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
    console.error(String(error));
    console.error(error.stack);
    process.exit(1);
  });
}
