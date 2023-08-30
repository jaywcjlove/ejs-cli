import path from "node:path";
import chokidar from "chokidar";
import fs from "fs-extra";
import {
  toHTML,
  getOutput,
  getRootDirsAll,
  type Options as EjsOptions,
} from "./build.mjs";

export interface Options extends EjsOptions {
  /** Chokidar's watch parameter settings */
  watchOption?: chokidar.WatchOptions;
}

export async function watch(
  entry: string[] = [],
  output: string,
  options: Options = {},
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
      const isPartial = !!filepath
        .split(path.sep)
        .find((m) => m.startsWith("_"));

      if (!/(add|change)$/i.test(eventName) || isPartial) return;

      if (/(.ejs)$/.test(filepath)) {
        try {
          await toHTML(filepath, output, ejsData, ejsOption);
        } catch (error) {
          console.log(
            "🚨 Template compilation error, please check \x1b[33;1m%s\x1b[0m file, error message: \n",
            filepath,
            error,
          );
        }
      } else {
        const outputPath = getOutput(filepath, output);
        fs.copySync(filepath, outputPath);
        console.log(
          "📋 Copy to \x1b[32;1m%s\x1b[0m !!!",
          path.relative(process.cwd(), outputPath),
        );
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
