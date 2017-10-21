"use strict";

const path = require('path');
const { expect } = require('chai');
const { Package, findSourceArg, findPackage, spawnPython } = require('../..');

describe("findSourceArg", function() {
  it("finds lone source arg", function() {
    expect(findSourceArg(["src/test/test.py"])).to.equal(0);
  });

  it("finds source arg followed by arguments", function() {
    expect(findSourceArg(["src/test/test.py", "-a", "file.xml"])).to.equal(0);
  });

  it("finds source arg preceded by python options", function() {
    expect(findSourceArg(["-O", "-d", "src/test/test.py"])).to.equal(2);
  });

  it("finds source arg preceded by python option with argument", function() {
    expect(findSourceArg(["-X", "zippymode", "src/test/test.py"])).to.equal(2);
  });

  it("finds no source arg when running module", function() {
    expect(findSourceArg(["-m", "runme", "src/test/test.py"])).to.equal(-1);
  });

  it("finds no source arg when running command", function() {
    expect(findSourceArg(["-c", "print(1)", "src/test/test.py"])).to.equal(-1);
  });

  it("finds no source arg when running from stdin", function() {
    expect(findSourceArg(["-", "src/test/test.py"])).to.equal(-1);
  });
})

describe("findPackage", function() {
  it("returns dir for undefined descendent.", function() {
    return findPackage().then(pkg => {
      expect(pkg.dir).to.equal(path.resolve("."));
    });
  })

  it("returns dir for non-existent descendent.", function() {
    return findPackage("src/test/does-not-exist.py").then(pkg => {
      expect(pkg.dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for src/test/test.py", function() {
    return findPackage("src/test/test.py").then(pkg => {
      expect(pkg.dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for src/test/", function() {
    return findPackage("src/test/").then(pkg => {
      expect(pkg.dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for src", function() {
    return findPackage("src").then(pkg => {
      expect(pkg.dir).to.equal(path.resolve("."));
    });
  })

  it("finds dir for .", function() {
    return findPackage(".").then(pkg => {
      expect(pkg.dir).to.equal(path.resolve("."));
    });
  })

  it("does not find dir for /", function() {
    return findPackage("/").then(() => {
      throw "Expected exception";
    }).catch(error => {
      expect(error.message).to.equal("Could not find directory containing package.json");
    });
  })

  it("can read package JSON", function() {
    return findPackage().then(pkg => pkg.readJSON()).then(json => {
      expect(json.python).to.deep.equal({
        "path": ["src"],
        "dependencies": {},
        "devDependencies": {},
        "execPath": "python",
      });
      expect(json.name).to.equal("nopy");
    });
  });

  it("can read cached package JSON", function() {
    return findPackage().then(pkg => {
      return pkg.readJSON().then(json => {
        expect(json.name).to.equal("nopy");
        return pkg.readJSON();
      }).then(json => {
        expect(json.name).to.equal("nopy");
      });
    });
  });
})

describe("Package", function() {
  let pkg;
  let packageDir = path.join(__dirname, "../..");
  beforeEach(function() {
    pkg = new Package(packageDir);
  });

  it("builds environment with user base directory in package directory", function() {
    return pkg.pythonEnv({})
    .then(env => {
      expect(env["PYTHONUSERBASE"]).to.equal(path.join(packageDir, "python_modules"));
    });
  })

  it("augments environment with user base directory", function() {
    return pkg.pythonEnv({
      "HOME": "/home/al",
    }).then(env => {
      expect(env["PYTHONUSERBASE"]).to.equal(path.join(packageDir, "python_modules"));
      expect(env["HOME"]).to.equal("/home/al");
    });
  })

  it("removes env variable to disable user base directory", function() {
    return pkg.pythonEnv({
      "PYTHONNOUSERSITE": "1",
    }).then(env => {
      expect(env["PYTHONUSERBASE"]).to.equal(path.join(packageDir, "python_modules"));
    });
  })

  it("augments environment with package directory as PYTHONPATH", function() {
    return pkg.pythonEnv({}).then(env => {
      expect(env["PYTHONPATH"]).to.equal(path.join(packageDir, "src"));
    });
  })
})

describe("spawnPython", function() {
  it("spawns src/test/test.py and retrieves status code", function() {
    return spawnPython(["src/test/test.py", "7"], { throwNonZeroStatus: false }).then(code => {
      expect(code).to.equal(7);
    });
  })

  it("spawns src/test/test.py and throws on non-zero status code", function() {
    return spawnPython(["src/test/test.py", "7"]).then(() => {
      throw "Fails";
    }).catch(error => {
      expect(error).to.match(/Exited with code 7/);
    });
  })

  it("spawns src/test/test.py and retrieves stdout when exit status code is zero", function() {
    return spawnPython(["src/test/test.py", "0", "a", "b"], { interop: "buffer" }).then(({ code, stdout, stderr }) => {
      expect(code).to.equal(0);
      expect(stderr).to.match(/^hello from stderr$/m);

      let parsed = JSON.parse(stdout);
      expect(parsed.args).to.deep.equal(["a", "b"]);
    });
  })

  it("spawns src/test/test.py and throws stderr when exit status code is non-zero", function() {
    return spawnPython(["src/test/test.py", "7", "a", "b"], { interop: "buffer" }).then(() => {
      throw "Fails";
    }).catch(error => {
      expect(error).to.match(/Exited with code 7/);
      expect(error).to.match(/hello from stderr/);
    });
  })

  it("error on unexpected interop mode", function() {
    return spawnPython(["src/test/test.py", "0", "a", "b"], { interop: "bad" }).then(() => {
      throw "Fails";
    }).catch(error => {
      expect(error).to.match(/bad/);
    });
  })

  it("can pass code to python as string", function() {
    return spawnPython(["-c", "print(1+1)"], { interop: "buffer" }).then(({ code, stdout }) => {
      expect(code).to.equal(0);
      expect(JSON.parse(stdout)).to.equal(2);
    });
  })
})
