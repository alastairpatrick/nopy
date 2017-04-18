#!/usr/bin/env node

const { findPackageDir, spawnPython } = require('./api.js');

if (require.main === module) {
  return findPackageDir().then(packageDir => {
    let args = process.argv.slice(3);
    let options = {
      packageDir,
      execPath: process.argv[2],
      interop: "status",
      throwNonZeroStatus: false,
      spawn: {
        stdio: "inherit",
      },
    };

    spawnPython(args, options).then(process.exit).catch(error => {
      console.error(error.stack);
      process.exit(1);
    });
  });
}
