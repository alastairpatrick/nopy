"""Test program that dumps things to stdout and stderr and exits with a particular status code."""

from __future__ import print_function
import json
import os
import sys


if __name__ == "__main__":
    print(json.dumps({
        "args": sys.argv[2:],
        "user_base": os.environ["PYTHONUSERBASE"],
        "path": os.environ["PATH"],
    }))

    print("hello from stderr", file=sys.stderr)

    if len(sys.argv) > 1:
        sys.exit(int(sys.argv[1]))
    else:
        sys.exit(0)
