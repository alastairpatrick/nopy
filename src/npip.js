#!/usr/bin/env node

const bluebird = require("bluebird");
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const { findPackageDir, pythonEnv } = require("./api");

const Promise = bluebird.Promise;
const readFile = bluebird.promisify(fs.readFile);

const main = () => {
  return findPackageDir().then(packageDir => {
    return readFile(path.join(packageDir, "package.json")).then(data => {
      let pkg = JSON.parse(data);

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
          console.log("npip has no dependencies to install listed in package.json.");
          return Promise.resolve(0);
        }
      }

      if (command === "install" || command === "freeze" || command === "list")
        args.splice(1, 0, "--user");

      // Run pip as a python module so that pip itself does not need to be on PATH, only python.
      args.unshift("-m", "pip");

      let env = pythonEnv(packageDir);
      let child = child_process.spawn("python", args, { env, stdio: "inherit" });
      return new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", resolve);
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
