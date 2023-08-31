#!/usr/bin/env node

import path from "node:path";
import meow from "meow";
import fs from "fs-extra";
import { glob } from "glob";
import { autoConf } from "auto-config-loader";
import { watch } from "./watch.mjs";
import { build, getInjectData, type Options } from "./build.mjs";
import { helpStr } from "./help.mjs";

(async () => {
  const cli = meow(helpStr(), {
    importMeta: import.meta,
    flags: {
      watch: {
        shortFlag: "w",
        type: "boolean",
        default: false,
      },
      out: {
        shortFlag: "o",
        type: "string",
        default: "dist",
      },
      /** Use CHARACTER with angle brackets for open/close (defaults to %). */
      delimiter: {
        shortFlag: "m",
        type: "string",
        default: "%",
      },
      /** Use CHARACTER instead of left angle bracket to open. */
      openDelimiter: {
        shortFlag: "p",
        type: "string",
        default: "<",
      },
      /** Use CHARACTER instead of right angle bracket to close */
      closeDelimiter: {
        shortFlag: "c",
        type: "string",
        default: ">",
      },
      /** Use CHARACTER instead of right angle bracket to close */
      rmWhitespace: {
        type: "boolean",
        default: false,
      },
      /** Must be JSON-formatted. Use parsed input from FILE as data for rendering. */
      dataFile: {
        shortFlag: "f",
        type: "string",
      },
    },
  });

  try {
    if (cli.flags.h || cli.flags.help) {
      cli.showHelp();
      process.exitCode = 0;
      return;
    }
    if (cli.flags.v || cli.flags.version) {
      cli.showVersion();
      process.exitCode = 0;
    }

    if (cli.input.length === 0) {
      throw new Error(
        "Please enter command parameters, such as: (./temp/**/*.ejs)",
      );
    }
    const output = path.resolve(process.cwd(), cli.flags.out);
    let entry = [...cli.input];

    entry = await glob(entry, {
      ignore: {
        ignored: (p) => !/\.ejs$/i.test(p.name) || p.name.startsWith("_"),
        childrenIgnored: (p) => p.name.startsWith("_"),
      },
    });
    console.log("entry:2", entry);
    const isWatch = cli.flags.watch;

    const defaultOption: Options = {
      delimiter: cli.flags.delimiter,
      openDelimiter: cli.flags.openDelimiter,
      closeDelimiter: cli.flags.closeDelimiter,
      rmWhitespace: cli.flags.rmWhitespace,
      globelData: {},
      data: {},
    };

    const conf = autoConf<Options>("ejsc", {
      mustExist: true,
      default: defaultOption,
    });

    const resultConf = conf || defaultOption;

    if (cli.flags.dataFile) {
      try {
        const dataFile = path.resolve(process.cwd(), cli.flags.dataFile);
        const reData = getInjectData(dataFile);
        resultConf.globelData = Object.assign(
          resultConf.globelData || {},
          reData,
        );
      } catch (error) {
        const cmdStr = process.argv.slice(2).join(" ");
        throw new Error(
          `The file specified by "--data-file" does not exist!! \n\n   $ ejsc \x1b[33;1m${cmdStr}\x1b[0m`,
        );
      }
    }

    if (isWatch) {
      await watch(entry, output, resultConf);
    } else {
      await build(entry, output, resultConf);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("🚨 \x1b[31;1m%s\x1b[0m\n", error.message);
    } else {
      console.log("🚨 \x1b[31;1m%s\x1b[0m\n", error);
    }
  }
})();
