import json
import os
import sys

print(json.dumps({
  "args": sys.argv[2:],
  "user_base": os.environ["PYTHONUSERBASE"],
}))

print("hello from stderr", file=sys.stderr)

if len(sys.argv) > 1:
  sys.exit(int(sys.argv[1]))
else:
  sys.exit(0)
