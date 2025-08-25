import fs from "fs-extra";
import chokidar, { type FSWInstanceOptions } from "chokidar";
import {
  toHTML,
  getOutput,
  getRootDirsAll,
  type Options as EjsOptions,
  type TemplateDetail,
} from "./build.mjs";

import { copyFile } from "./copyFile.mjs";

export interface Options extends EjsOptions {
  /** Chokidar's watch parameter settings */
  watchOption?: FSWInstanceOptions;
}

export async function watch(
  entry: string[] = [],
  output: string,
  options: Options = {},
  details: TemplateDetail[] = [],
) {
  const { data: ejsData, watchOption = {}, ...ejsOption } = options;
  /** Get root directory folder name */
  const dirs = [...new Set(getRootDirsAll(entry))];
  return new Promise(async (resolve, reject) => {
    const watcher = chokidar.watch(dirs, {
      persistent: true,
      ...watchOption,
    });
    watcher.on("all", async (eventName, filepath, stats) => {
      if (/(unlink)$/i.test(eventName)) {
        const outputPath = getOutput(filepath, output);
        fs.removeSync(outputPath);
        console.log("🗑️ Delete file \x1b[32;1m%s\x1b[0m !!!", filepath);
      }
      if (/(unlinkDir)$/i.test(eventName)) {
        const outputPath = getOutput(filepath, output);
        fs.removeSync(outputPath);
        console.log("🗑️ Delete folder \x1b[32;1m%s\x1b[0m !!!", filepath);
      }

      if (!/(add|change)$/i.test(eventName)) return;
      if (/(.ejs)$/.test(filepath) && entry.includes(filepath)) {
        try {
          const temps = details.filter((m) => m.template === filepath);
          temps.forEach((data) => {
            toHTML(
              data.template,
              output,
              { ...data.data, ...ejsData },
              ejsOption,
              data,
            );
          });
        } catch (error) {
          console.log(
            "🚨 Template compilation error, please check \x1b[33;1m%s\x1b[0m file, error message: \n",
            filepath,
            error,
          );
        }
      } else if (!/(.ejs)$/.test(filepath)) {
        copyFile(filepath, output, options);
      }
    });
    watcher.on("error", (error) => {
      reject(error);
    });
    watcher.on("ready", () => {
      resolve(undefined);
    });
  });
}
