#!/usr/bin/env node

const { spawnPython } = require('./api.js');

if (require.main === module) {
  let args = process.argv.slice(3);
  let options = {
    packageDir: process.cwd(),
    execPath: process.argv[2],
    interop: "status",
    throwNonZeroStatus: false,
    spawn: {
      stdio: "inherit",
    },
  };

  spawnPython(args, options).then(process.exit).catch(error => {
    console.error(String(error));
    console.error(error.stack);
    process.exit(1);
  });
}
