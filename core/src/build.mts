import ejs, { type Data, type Options as EjsOptions } from "ejs";
import path from "path";
import { glob } from "glob";
import fs from "fs-extra";
import os from "os";
import { copyFile } from "./copyFile.mjs";

export interface Options extends EjsOptions {
  /**
   * Injecting data into all EJS templates
   * @example
   * ```json
   * {
   *    "name": "Hello World",
   *    "age": 36
   * }
   * ```
   */
  globalData?: Data;
  /**
   * Injects specific data into individual EJS templates.
   *
   * @example
   * ```js
   * {
   *    "template/home.ejs": {
   *        "name": "Hello World",
   *        "age": 36
   *    },
   * }
   * ```
   */
  data?: EjsData;
  /**
   * A callback method invoked before saving the generated HTML.
   * This method can be asynchronous.
   *
   * @param html - The generated HTML content.
   * @param output - The output directory path.
   * @param filename - The name of the file being processed.
   * @returns The modified HTML content or a promise resolving to it.
   */
  beforeSaveHTML?: (
    html: string,
    output: string,
    filename: string,
    isWatch: boolean,
  ) => string | Promise<string>;
  /**
   * A callback method invoked after copying files.
   * This method can be asynchronous.
   *
   * @param filepath - The path of the file being copied.
   * @param output - The output directory path.
   * @returns A void result or a promise resolving to void.
   */
  afterCopyFile?: (filepath: string, output: string) => void | Promise<void>;

  /**
   * Specifies the shell pattern to match files that need to be copied.
   *
   * @default "/**\/*.{css,js,png,jpg,gif,svg,webp,eot,ttf,woff,woff2}"
   */
  copyPattern?: string;
  /**
   * Determines whether to skip writing files to disk.
   *
   * @default false
   */
  skipDiskWrite?: boolean;
  /**
   * Enables sitemap generation.
   *
   * @default false
   */
  sitemap?: boolean;
  /**
   * Specifies the prefix to use for sitemap URLs.
   * For example: `https://wangchujiang.com/idoc/`
   *
   * @default ""
   */
  sitemapPrefix?: string;
  /**
   * A callback method invoked after the build process is completed.
   *
   * @param sitemap - The generated sitemap content.
   * @param options - The options used during the build process.
   * @param details - An array of template details processed during the build.
   */
  done?: (sitemap: string, options: Options, details: TemplateDetail[]) => void;
}

/** Template detail mapping data */
export type TemplateDetail = {
  template: string;
  templatePath?: string;
  data: Record<string, any>;
};

/**
 * Process template rendering with concurrency control to prevent memory overflow
 * @param tasks Array of rendering tasks
 * @param concurrency Maximum number of concurrent tasks
 */
async function processConcurrentRender(
  tasks: Array<() => Promise<unknown>>,
  concurrency: number = 5,
) {
  const executing: Promise<void>[] = [];
  for (const task of tasks) {
    const promise: Promise<void> = task()
      .then(() => undefined)
      .catch((error) => {
        console.error("Render error:", error);
      });
    executing.push(promise);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }
  await Promise.all(executing);
}

export async function build(
  entry: string[] = [],
  output: string,
  options: Options = {},
  details: TemplateDetail[] = [],
) {
  const { data: ejsData, sitemap, sitemapPrefix, ...ejsOption } = options;
  const sitemapData: string[] = [];
  if (sitemap == true) {
    details.forEach((detail) => {
      let templatePath = detail.templatePath ?? detail.template;
      const outputPath = getOutput(templatePath, output);
      const relative = outputPath.replace(output, "").split(path.sep).join("/");
      sitemapData.push(
        sitemapPrefix ? buildUrl(sitemapPrefix, relative) : relative,
      );
    });
    await fs.outputFile(
      path.join(output, "sitemap.txt"),
      sitemapData.join("\n"),
    );
  }

  // Create rendering tasks with controlled concurrency to prevent memory overflow
  const renderTasks = details.map(
    (data) => () =>
      toHTML(data.template, output, ejsData, ejsOption, data, false),
  );

  // Process with concurrency limit (default 5 concurrent renders)
  const concurrency = Math.max(2, Math.floor(os.cpus().length / 2));
  await processConcurrentRender(renderTasks, concurrency);

  // Copy static resources
  const dirs = [...new Set(getRootDirsAll(entry))].map((dir) => {
    return dir + options.copyPattern;
  });
  const data = await glob(dirs, { ignore: "node_modules/**" });

  // Process copy operations in parallel
  await Promise.all(
    data.map((filePath) => copyFile(filePath, output, options)),
  );
  ejsOption.done && ejsOption.done(sitemapData.join("\n"), options, details);
}

interface EjsData extends Data {
  PUBLIC_PATH?: string;
}

export function toHTML(
  filename: string,
  output: string,
  data: EjsData = {},
  options: Options = {},
  detail: TemplateDetail = { template: "", data: {} },
  isWatch: boolean = false,
) {
  const {
    globalData,
    beforeSaveHTML,
    skipDiskWrite = false,
    ...ejsOption
  } = options;
  const outputPath = getOutput(detail.templatePath ?? detail.template, output);
  const relative = path.relative(path.dirname(outputPath), output);
  /** Relative path string concatenation. E.g: `../`, `../../` */
  const PUBLIC_PATH = relative ? relative.split(path.sep).join("/") + "/" : "";
  return new Promise(async (resolve, reject) => {
    const ejsData = { ...(data as Data) };
    let result = toEqualPathOfData(filename, ejsData);
    const basename = path.basename(filename, path.extname(filename));
    const tempFileName = basename.replace(/^_+/, "").toLocaleUpperCase();
    const keyName =
      typeof result == "string"
        ? path.basename(result, path.extname(result)).toUpperCase()
        : tempFileName.toUpperCase();
    if (typeof result === "string") {
      try {
        result = getInjectData(result);
      } catch (error) {
        throw new Error(
          `no such file, \nopen \x1b[33;1m${result}\x1b[0m => \x1b[31;1m'${path.resolve(
            result,
          )}'\x1b[0m\n`,
        );
      }
    }

    let templateData = {
      ...detail.data,
      PUBLIC_PATH,
      GLOBAL: globalData,
      NOW_DATE: new Date(),
    };

    // Handle array data for batch page generation
    if (
      basename.startsWith("_") &&
      Array.isArray(result) &&
      tempFileName &&
      typeof result === "object"
    ) {
      // Process array data items one by one to prevent memory overflow
      try {
        await processArrayDataBatch(
          result as Array<Record<string, any>>,
          filename,
          output,
          detail,
          keyName,
          ejsOption,
          { ...templateData, [keyName]: [] },
          beforeSaveHTML,
          skipDiskWrite,
          globalData,
          PUBLIC_PATH,
        );
        resolve(undefined);
      } catch (error) {
        reject(error);
      }
    } else {
      templateData = {
        ...result,
        ...detail.data,
        PUBLIC_PATH,
        GLOBAL: globalData,
        NOW_DATE: new Date(),
      };
      ejs.renderFile(filename, templateData, ejsOption, async (err, str) => {
        if (err) {
          reject(err);
        } else {
          try {
            if (beforeSaveHTML && typeof beforeSaveHTML === "function") {
              const result = beforeSaveHTML(str, output, filename, isWatch);
              str = await Promise.resolve(result);
            }
            if (skipDiskWrite == false) {
              fs.ensureDirSync(path.dirname(outputPath));
              fs.outputFileSync(outputPath, str);
              console.log(
                "🎉 Create \x1b[32;1m%s\x1b[0m successfully !!!",
                path.relative(process.cwd(), outputPath),
              );
            }
            resolve(str);
          } catch (error) {
            reject(error);
          }
        }
      });
    }
  });
}

/**
 * Process array data in batches to prevent memory overflow
 * Each item in the array generates a separate page
 */
async function processArrayDataBatch(
  arrayData: Array<Record<string, any>>,
  filename: string,
  output: string,
  detail: TemplateDetail,
  keyName: string,
  ejsOption: Options,
  baseTemplateData: Record<string, any>,
  beforeSaveHTML?: (
    html: string,
    output: string,
    filename: string,
    isWatch: boolean,
  ) => string | Promise<string>,
  skipDiskWrite: boolean = false,
  globalData?: Data,
  PUBLIC_PATH: string = "",
) {
  // Process items in batches to manage memory
  const batchSize = 20; // Process 20 items at a time
  for (let i = 0; i < arrayData.length; i += batchSize) {
    const batch = arrayData.slice(i, i + batchSize);

    // Process items in current batch sequentially
    for (const item of batch) {
      if (!item.name) {
        console.warn("Warning: Data item missing 'name' field, skipping");
        continue;
      }

      const templateData = {
        ...item,
        ...detail.data,
        [keyName]: item,
        PUBLIC_PATH,
        GLOBAL: globalData,
        NOW_DATE: new Date(),
      };

      await new Promise<void>((resolve, reject) => {
        ejs.renderFile(filename, templateData, ejsOption, async (err, str) => {
          if (err) {
            reject(err);
          } else {
            try {
              if (beforeSaveHTML && typeof beforeSaveHTML === "function") {
                const result = beforeSaveHTML(str, output, filename, false);
                str = await Promise.resolve(result);
              }
              if (skipDiskWrite == false) {
                const itemOutputPath = getOutput(
                  detail.templatePath ??
                    detail.template.replace(/_/, item.name),
                  output,
                );
                fs.ensureDirSync(path.dirname(itemOutputPath));
                fs.outputFileSync(itemOutputPath, str);
                console.log(
                  "🎉 Create \x1b[32;1m%s\x1b[0m successfully !!!",
                  path.relative(process.cwd(), itemOutputPath),
                );
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        });
      });

      // Force garbage collection if available (only works with --expose-gc flag)
      if (global.gc && i % 100 === 0) {
        global.gc();
      }
    }

    // Allow event loop to process other tasks
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export function buildUrl(sitemapPrefix: string = "", relative: string = "") {
  // Split relative into path and query
  let [path, query] = relative.split("?");

  // Encode each segment of the relative path, but skip non-ASCII characters (e.g., Chinese characters)
  path = path
    .split("/")
    .map((segment) => {
      return segment
        .split("")
        .map((char) => {
          // Check if the character is non-ASCII (e.g., Chinese characters)
          if (/[\u4e00-\u9fa5]/.test(char)) {
            return char; // Leave Chinese characters unchanged
          }
          return encodeURIComponent(char); // Encode other characters
        })
        .join("");
    })
    .join("/");

  // If there is a query, encode only the values (keep keys as they are)
  if (query) {
    query = query
      .split("&")
      .map((pair) => {
        const [key, value] = pair.split("=");
        return `${key}=${encodeURIComponent(value || "")}`;
      })
      .join("&");
    relative = path + "?" + query;
  } else {
    relative = path;
  }

  // Combine with sitemapPrefix without modifying it
  return (sitemapPrefix + relative).replace(/(?<!:)\/{2,}/g, "/");
}

export const getInjectData = (fileName: string, rawData: boolean = false) => {
  const redata = fs.readJSONSync(path.resolve(fileName));
  if (rawData == true) {
    return redata;
  }
  const keyName = path.basename(fileName, ".json").replace(/(-|\.)/g, "_");
  return Array.isArray(redata)
    ? { [keyName.toLocaleUpperCase()]: redata }
    : redata;
};

export const getRootDirsAll = (entry: string[] = []) => {
  return entry.map((filename) => getRootDirName(filename));
};

export const getRootDirName = (filename: string) => filename.split(path.sep)[0];
export function getOutput(filename: string, output: string) {
  const basefilename = filename.split(path.sep);
  basefilename.shift();
  return path
    .resolve(output, basefilename.join(path.sep))
    .replace(/.ejs$/i, ".html");
}

export const toEqualPathOfData = (
  filename: string,
  data: Record<string, any>,
) => {
  const filePath = path.resolve(process.cwd(), filename);
  let result = undefined;
  for (const [key, value] of Object.entries(data)) {
    if (path.resolve(process.cwd(), key) === filePath) {
      result = value;
      break;
    }
  }
  return result;
};
