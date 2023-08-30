#!/usr/bin/env node

import path from "node:path";
import meow from "meow";
import { glob } from "glob";
import { autoConf } from "auto-config-loader";
import { watch } from "./watch.mjs";
import { build, type Options } from "./build.mjs";
import { helpStr } from "./help.mjs";

(async () => {
  const cli = meow(helpStr(), {
    importMeta: import.meta,
    flags: {
      out: {
        shortFlag: "o",
        type: "string",
        default: "dist",
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

    entry = await glob(entry, { ignore: "node_modules/**" });
    const isWatch = cli.flags.watch;

    const defaultOption: Options = {
      data: {},
    };

    const conf = autoConf<Options>("ejsc", {
      mustExist: true,
      default: defaultOption,
    });
    if (isWatch) {
      await watch(entry, output, conf || defaultOption);
    } else {
      await build(entry, output, conf || defaultOption);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("🚨 \x1b[31;1m%s\x1b[0m\n", error.message);
    } else {
      console.log("🚨 \x1b[31;1m%s\x1b[0m\n", error);
    }
  }
})();
