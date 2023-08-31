# ejs-cli

[![CI](https://github.com/jaywcjlove/ejs-cli/actions/workflows/main.yml/badge.svg)](https://github.com/jaywcjlove/ejs-cli/actions/workflows/main.yml)
[![NPM version](https://img.shields.io/npm/v/@wcj/ejs-cli.svg?style=flat&label=@wcj/ejs-cli)](https://npmjs.org/package/@wcj/ejs-cli)

Enhanced version of [EJS](https://github.com/mde/ejs) cli. A command-line tool based on the ejs wrapper, but with many useful features added.

## Features

- Support config files to configure **ejs** options.
- Multiple **.ejs** files matching to generate html.
- Multiple ways of data injection into templates.
- Global data injection template
- Monitoring **.ejs** to output **.html** files in real time.

## Install

```bash
$ npm install @wcj/ejs-cli
# Or
$ npm install --global @wcj/ejs-cli
```

## Quick start

```bash
$ ejsc "template/**/*"
$ ejsc "template/*.ejs" "template/about/*.ejs" --watch
```

## Command Help

Below is a help of commands you might find useful. You can use the `ejsc` and `ejs-cli` commands:

```shell
Usage: ejs-cli <source...> [options]

Options:

  -v, --version             Show version number
  -h, --help                Show help
  -w, --watch               Listen to ejs changes and output HTML (default: "false")
  -o, --out                 Specify the input directory (default: "dist")
  -m, --delimiter           Use CHARACTER with angle brackets for open/close (defaults to %)
  -p, --open-delimiter      Use CHARACTER instead of left angle bracket to open.
  -c, --close-delimiter     Use CHARACTER instead of right angle bracket to close.
  -f, --data-file FILE      Must be JSON-formatted. Use parsed input from FILE as data for rendering
  --rm-whitespace           Remove all safe-to-remove whitespace, including leading and trailing

Examples:

  $ ejsc "template/*.ejs" "template/about/*.ejs"
  $ ejsc "template/*.ejs" "template/about/*.ejs" --watch
  # The above command: matches all `.ejs` files in the template folder
  $ ejsc "template/**/*" --watch
  $ ejs-cli "template/*.ejs" --watch --out build

Copyright 2023
```

## Match files

Folders and `.ejs` files starting with an _underscore_ (`_`) will be ignored.

```shell
$ ejs-cli "template/**/*"
$ ejsc "template/**/*"
$ ejsc "template/*.ejs" "template/about/*.ejs"
$ ejsc "template/home.ejs" "template/about.ejs"
```

The above command: matches all `.ejs` files in the template folder, excluding files starting with **`_`** and `.ejs` files in folders starting with **`_`**.

## Inject data

Inject data by default

**`PUBLIC_PATH`**

`PUBLIC_PATH` Relative path string concatenation. E.g: `../`, `../../`.

```ejs
<link rel="stylesheet" href="<%= PUBLIC_PATH %>static/css/main.css">

<img src="<%= PUBLIC_PATH %>static/img/logo.png" />

<a href="<%= PUBLIC_PATH %>about/index.html"><a>
```

**`GLOBEL`**

You need to specify the data file `--data-file ./data.json` on the command line, or configure the `globelData` field in the configuration

```ejs
<h2><%= GLOBEL.helloworld %></h2>
```

If the specified `./temp.json` injection data content is an **array**, the value will be assigned to the template variable of `TEMP`. The variable naming rule is uppercase for file names:

- `./a/data-name.json` => `DATA_NAME`
- `./temp/data.json` => `DATA`
- `./temp/temp.json` => `TEMP`

```js
//=> ./a/data-name.json
[
  { name: "ejs", version: "v1.2" },
  { name: "auto-config-loader", version: "^1.7.4" },
];
```

The value will be assigned to the template variable of `DATA_NAME`

```ejs
<% DATA_NAME.forEach((item) => { %>
  <div><%= item.name %>@<%= item.version %></div>
<% }); %>
```

The rules are the same in configuration.

**Specific Template**

Inject data into a specific template, which needs to be configured in `.ejscrc.mjs`:

```js
{
  "globelData": {
    "helloworld": "Hello Wrold!"
  },
  "data": {
    "template/about/index.ejs": "./data.json",
    "template/home.ejs": {
      "name": "Hello World",
      "age": 36
    }
  }
}
```

Used in `template/home.ejs` template

```ejs
<h2><%= name %></h2>
```

## Config

The default configuration is the parameter of [EJS](https://github.com/mde/ejs), you can add `data` to inject data into the EJS template, and add `watchOption` parameter to configure [Chokidar](https://github.com/paulmillr/chokidar) settings.

Store `.ejscrc.json` in the root directory of the project:

```json
{
  "watchOption": {},
  "data": {
    "template/home.ejs": {
      "name": "Hello World",
      "age": 36
    }
  }
}
```

Support [JSON](https://www.json.org), [JSONC](https://github.com/microsoft/node-jsonc-parser), [JSON5](https://json5.org/), [YAML](https://yaml.org/), [TOML](https://toml.io), [INI](https://en.wikipedia.org/wiki/INI_file), [CJS](http://www.commonjs.org), [Typescript](https://www.typescriptlang.org/), and ESM config load.

`.ejscrc.mjs` config example:

```js
/**
 * @type {import('@wcj/ejs-cli/lib/watch.mjs').Options}
 */
export default {
  /** Chokidar's watch parameter settings */
  watchOption: {},
  /** Injecting data into EJS templates */
  data: {
    "template/home.ejs": {
      name: "Hello World",
      age: 36,
    },
  },
};
```

You can configure in `package.json`:

```js
{
  "name": "@wcj/examples",
  "version": "0.0.1",
  "ejsc": {
    "data": {
      "template/home.ejs": {
        "name": "Hello World",
        "age": 36
      }
    }
  }
}
```

For more configuration methods, please see [default `searchPlaces`](https://github.com/jaywcjlove/auto-config-loader/blob/c5fba91a92c782b3d6c47a1664d53842e1109db6/core/README.md?plain=1#L104-L138).

## Development

```bash
$ npm i
$ npm run build
```

## Contributors

As always, thanks to our amazing contributors!

<a href="https://github.com/jaywcjlove/ejs-cli/graphs/contributors">
  <img src="http://jaywcjlove.github.io/ejs-cli/CONTRIBUTORS.svg" />
</a>

Made with [contributors](https://github.com/jaywcjlove/github-action-contributors).

## License

MIT © [Kenny Wong](https://wangchujiang.com)
