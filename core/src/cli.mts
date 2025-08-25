#!/usr/bin/env node

import path from "node:path";
import meow from "meow";
import fs from "fs-extra";
import { glob } from "glob";
import { autoConf } from "auto-config-loader";
import { watch } from "./watch.mjs";
import {
  build,
  toEqualPathOfData,
  getInjectData,
  type Options,
  type TemplateDetail,
} from "./build.mjs";
import { helpStr } from "./help.mjs";

/**
 * Configure CLI options
 */
function createCLIConfig() {
  return meow(helpStr(), {
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
      /** Must use JSON format to pass and update data in "globalData". */
      globalData: {
        type: "string",
      },
      /** Use this option to enable sitemap generation */
      sitemap: {
        type: "boolean",
        default: false,
      },
      sitemapPrefix: {
        type: "string",
      },
      copyPattern: {
        type: "string",
        default: "/**/*.{css,js,png,jpg,gif,svg,webp,eot,ttf,woff,woff2}",
      },
    },
  });
}

/**
 * Check and handle help and version options
 */
function handleHelpAndVersion(cli: any): boolean {
  if (cli.flags.h || cli.flags.help) {
    cli.showHelp();
    process.exitCode = 0;
    return true;
  }
  if (cli.flags.v || cli.flags.version) {
    cli.showVersion();
    process.exitCode = 0;
    return true;
  }
  return false;
}

/**
 * Validate input parameters
 */
function validateInput(cli: any): void {
  if (cli.input.length === 0) {
    throw new Error(
      "Please enter command parameters, such as: (./temp/**/*.ejs)",
    );
  }
}

/**
 * Create default options configuration
 */
function createDefaultOptions(flags: any): Options {
  const defaultOption: Options = {
    delimiter: flags.delimiter,
    openDelimiter: flags.openDelimiter,
    closeDelimiter: flags.closeDelimiter,
    rmWhitespace: flags.rmWhitespace,
    sitemap: flags.sitemap,
    sitemapPrefix: flags.sitemapPrefix,
    copyPattern: flags.copyPattern,
    globalData: {},
    data: {},
  };

  // Automatically load package.json information
  if (fs.existsSync("./package.json")) {
    const pkg = fs.readJsonSync("./package.json");
    defaultOption.globalData!["PACKAGE"] = pkg;
  }

  return defaultOption;
}

/**
 * Load configuration file
 */
async function loadConfiguration(defaultOption: Options): Promise<Options> {
  const conf = await autoConf<Options>("ejsc", {
    mustExist: true,
    default: defaultOption,
  });
  return conf || defaultOption;
}

/**
 * Filter and get template file entries
 */
async function getTemplateEntries(input: string[]): Promise<string[]> {
  return await glob(input, {
    ignore: {
      ignored: (p) => !/\.ejs$/i.test(p.name),
    },
  });
}

/**
 * Filter entry files - remove files starting with _ (unless they have data mapping in config)
 */
function filterEntries(entries: string[], config: Options): string[] {
  if (config.data) {
    return entries.filter((file) =>
      Object.keys(config.data || {}).includes(file),
    );
  } else {
    return entries.filter((file) => {
      return !file.split(path.sep).some((segment) => segment.startsWith("_"));
    });
  }
}

/**
 * Process templates starting with _ (used for generating multiple files from one template)
 */
function processUnderscoreTemplate(
  templatePath: string,
  config: Options,
): TemplateDetail[] {
  const details: TemplateDetail[] = [];
  const result = toEqualPathOfData(templatePath, config.data ?? {});
  const data = getInjectData(result, true);

  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (item.name) {
        const extname = path.extname(templatePath);
        const basename = path.basename(item.name, path.extname(item.name));
        const tempFileName = path
          .basename(path.basename(templatePath), ".ejs")
          .replace(/^_+/, "");
        const outputPath = path
          .join(path.dirname(templatePath), tempFileName, basename + extname)
          .split(path.sep)
          .join("/");

        details.push({
          template: templatePath,
          templatePath: outputPath,
          data: item,
        });
      }
    });
  }

  return details;
}

/**
 * Process normal template files
 */
function processNormalTemplate(
  templatePath: string,
  config: Options,
): TemplateDetail {
  const result = toEqualPathOfData(templatePath, config.data ?? {});
  const data = getInjectData(result);

  return {
    template: templatePath,
    data: data,
  };
}

/**
 * Build template details list
 */
function buildTemplateDetails(
  entries: string[],
  config: Options,
): TemplateDetail[] {
  const details: TemplateDetail[] = [];

  entries.forEach((templatePath: string) => {
    const templateData = config.data![templatePath];

    if (typeof templateData === "string") {
      if (path.basename(templatePath).startsWith("_")) {
        // Process templates starting with _
        const underscoreDetails = processUnderscoreTemplate(
          templatePath,
          config,
        );
        details.push(...underscoreDetails);
      } else {
        // Process normal template files
        const normalDetail = processNormalTemplate(templatePath, config);
        details.push(normalDetail);
      }
    } else {
      // Use configured data directly
      details.push({
        template: templatePath,
        data: templateData,
      });
    }
  });

  return details;
}

/**
 * Process data file option
 */
function processDataFileOption(flags: any, config: Options): void {
  if (flags.dataFile) {
    try {
      const dataFile = path.resolve(process.cwd(), flags.dataFile);
      const fileData = getInjectData(dataFile);
      config.globalData = Object.assign(config.globalData || {}, fileData);
    } catch (error) {
      const cmdStr = process.argv.slice(2).join(" ");
      throw new Error(
        `The file specified by "--data-file" does not exist!! \n\n   $ ejsc \x1b[33;1m${cmdStr}\x1b[0m`,
      );
    }
  }
}

/**
 * Process global data option
 */
function processGlobalDataOption(flags: any, config: Options): void {
  if (flags.globalData) {
    try {
      const jsonData = JSON.parse(flags.globalData);
      config.globalData = Object.assign(config.globalData || {}, jsonData);
    } catch (error) {
      const cmdStr = process.argv.slice(2).join(" ");
      throw new Error(
        `The value specified by "--global-data" is not in JSON format!!\n\n  ❌ $ ejsc \x1b[33;1m${cmdStr}\x1b[0m\n  ✅ Example: $ \x1b[32;1mejsc "template/**/*" --global-data "{\\"name\\": \\"ejs-cli\\"}"\x1b[0m`,
      );
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // 1. Create CLI configuration
    const cli = createCLIConfig();

    // 2. Handle help and version options
    if (handleHelpAndVersion(cli)) {
      return;
    }

    // 3. Validate input parameters
    validateInput(cli);

    // 4. Set up basic variables
    const output = path.resolve(process.cwd(), cli.flags.out);
    const isWatch = cli.flags.watch;

    // 5. Create default configuration
    const defaultOption = createDefaultOptions(cli.flags);

    // 6. Load configuration file
    const resultConf = await loadConfiguration(defaultOption);

    // 7. Get template file entries
    let entries = await getTemplateEntries(cli.input);

    // 8. Filter entry files
    entries = filterEntries(entries, resultConf);

    // 9. Build template details list
    const details = buildTemplateDetails(entries, resultConf);

    // 10. Process data file option
    processDataFileOption(cli.flags, resultConf);

    // 11. Process global data option
    processGlobalDataOption(cli.flags, resultConf);

    // 12. Execute build or watch command
    if (isWatch) {
      await watch(entries, output, resultConf, details);
    } else {
      await build(entries, output, resultConf, details);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("🚨 \x1b[31;1m%s\x1b[0m\n", error.message);
    } else {
      console.log("🚨 \x1b[31;1m%s\x1b[0m\n", error);
    }
  }
}

// Execute main function
main();
