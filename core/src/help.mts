export const helpStr = (version: string = "") => `
  Usage:\x1b[34;1m ejs-cli\x1b[0m <source...> [options]
  
  Options:

    \x1b[35;1m-v, --version\x1b[0m             Show version number
    \x1b[35;1m-h, --help\x1b[0m                Show help
    \x1b[35;1m-o, --out\x1b[0m                 Specify the input directory (default: "dist")
    \x1b[35;1m-m, --delimiter\x1b[0m           Use CHARACTER with angle brackets for open/close (defaults to %)
    \x1b[35;1m-p, --open-delimiter\x1b[0m      Use CHARACTER instead of left angle bracket to open.
    \x1b[35;1m-c, --close-delimiter\x1b[0m     Use CHARACTER instead of right angle bracket to close.
    \x1b[35;1m-f, --data-file FILE\x1b[0m      Must be JSON-formatted. Use parsed input from FILE as data for rendering

  Examples:

    $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" "template/about/*.ejs"
    $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" "template/about/*.ejs" --watch
    $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" --watch
    $\x1b[35;1m ejs-cli\x1b[0m "template/*.ejs" --watch

 Copyright 2023
`;
