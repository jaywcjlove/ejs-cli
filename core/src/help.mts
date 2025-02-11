export const helpStr = () => `
Usage:\x1b[34;1m ejs-cli\x1b[0m <source...> [options]

Options:

  \x1b[35;1m-v, --version\x1b[0m             Show version number
  \x1b[35;1m-h, --help\x1b[0m                Show help
  \x1b[35;1m-w, --watch\x1b[0m               Listen to ejs changes and output HTML (default: \x1b[37;1m"false"\x1b[0m)
  \x1b[35;1m-o, --out\x1b[0m                 Specify the output directory (default: \x1b[37;1m"dist"\x1b[0m)
  \x1b[35;1m-m, --delimiter\x1b[0m           Use CHARACTER with angle brackets for open/close (defaults to \x1b[37;1m%\x1b[0m)
  \x1b[35;1m-p, --open-delimiter\x1b[0m      Use CHARACTER instead of left angle bracket to open.
  \x1b[35;1m-c, --close-delimiter\x1b[0m     Use CHARACTER instead of right angle bracket to close.
  \x1b[35;1m-f, --data-file FILE\x1b[0m      Must be JSON-formatted. Use parsed input from FILE as data for rendering
  \x1b[35;1m--global-data\x1b[0m             Must use JSON format to pass and update data in "globalData".
  \x1b[35;1m--rm-whitespace\x1b[0m           Remove all safe-to-remove whitespace, including leading and trailing
  \x1b[35;1m--copy-pattern\x1b[0m            Use shell patterns to match the files that need to be copied.

Examples:

  $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" "template/about/*.ejs"
  $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" "template/about/*.ejs" --watch
  \x1b[30;1m# The above command: matches all \`.ejs\` files in the template folder\x1b[0m
  $\x1b[35;1m ejsc\x1b[0m "template/**/*" --watch
  $\x1b[35;1m ejsc\x1b[0m "template/**/*" --data-file "./data.json"
  $\x1b[35;1m ejsc\x1b[0m "template/**/*" --global-data "{\\"name\\": \\"ejs-cli\\"}"
  $\x1b[35;1m ejs-cli\x1b[0m "template/*.ejs" --watch --out build

Copyright 2025
`;
