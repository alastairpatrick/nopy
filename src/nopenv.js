#!/usr/bin/env node

"use strict";

const { findPackage, spawnPython } = require('./api.js');

if (require.main === module) {
  return findPackage().then(pkg => {
    let args = process.argv.slice(3);
    let options = {
      package: pkg,
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
