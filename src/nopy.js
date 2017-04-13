#!/usr/bin/env node

const { spawnPython } = require('./api.js');

if (require.main === module) {
  spawnPython(process.argv.slice(2), {
    interop: "status",
    throwNonZeroStatus: false,
    spawn: {
      stdio: "inherit",
    },
  }).then(process.exit).catch(error => {
    console.error(String(error));
    console.error(error.stack);
    process.exit(1);
  });
}
