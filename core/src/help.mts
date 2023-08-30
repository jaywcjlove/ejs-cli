export const helpStr = (version: string = "") => `
  Usage:\x1b[34;1m ejs-cli\x1b[0m <source...> [options]
  
  Options:

    \x1b[35;1m--out, -o\x1b[0m           Specify the input directory (default: "dist").
    \x1b[35;1m--version, -v\x1b[0m       Show version number
    \x1b[35;1m--help, -h\x1b[0m          Show help

  Examples:

    $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" "template/about/*.ejs"
    $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" "template/about/*.ejs" --watch
    $\x1b[35;1m ejsc\x1b[0m "template/*.ejs" --watch
    $\x1b[35;1m ejs-cli\x1b[0m "template/*.ejs" --watch

 Copyright 2023
`;
