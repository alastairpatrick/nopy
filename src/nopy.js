#!/usr/bin/env node

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

  if (args[0] == "-Xbinrel") {
    args = args.slice(1);
    options.binRelative = true;
  }

  spawnPython(args, options).then(process.exit).catch(error => {
    console.error(String(error));
    console.error(error.stack);
    process.exit(1);
  });
}
