#!/usr/bin/env node

"use strict";

const { spawnPython } = require('./api.js');

if (require.main === module) {
  let args = process.argv.slice(2);
  let options = {
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
}
