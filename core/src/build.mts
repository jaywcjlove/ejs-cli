import ejs, { type Data, type Options as EjsOptions } from "ejs";
import path from "path";
import { glob } from "glob";
import fs from "fs-extra";

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
  globelData?: Data;
  /**
   * Injecting data into EJS templates
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
}

export async function build(
  entry: string[] = [],
  output: string,
  options: Options = {},
) {
  const { data: ejsData, ...ejsOption } = options;
  entry.forEach((filePath) => {
    toHTML(filePath, output, ejsData, ejsOption);
  });

  // 拷贝静态资源
  const dirs = [...new Set(getRootDirsAll(entry))].map((dir) => {
    return dir + `/**/*.{css,js,png,jpg,gif,svg,eot,ttf,woff,woff2}`;
  });
  const data = await glob(dirs, { ignore: "node_modules/**" });
  data.forEach((filePath) => {
    const outputPath = getOutput(filePath, output);
    fs.copySync(filePath, outputPath);
    console.log(
      "📋 Copy to \x1b[32;1m%s\x1b[0m !!!",
      path.relative(process.cwd(), outputPath),
    );
  });
}

interface EjsData extends Data {
  PUBLIC_PATH?: string;
}

export function toHTML(
  filename: string,
  output: string,
  data: EjsData = {},
  options: Options = {},
) {
  const { globelData, ...ejsOption } = options;
  const outputPath = getOutput(filename, output);
  const relative = path.relative(path.dirname(outputPath), output);
  /** Relative path string concatenation. E.g: `../`, `../../` */
  const PUBLIC_PATH = relative ? relative.split(path.sep).join("/") + "/" : "";
  const ejsData = { ...(data as Data) };
  let result = toEqualPathOfData(filename, ejsData);
  return new Promise(async (resolve, reject) => {
    if (typeof result === "string") {
      try {
        const redata = fs.readJSONSync(path.resolve(result));
        result = redata;
      } catch (error) {
        throw new Error(
          `no such file, \nopen \x1b[33;1m${result}\x1b[0m => \x1b[31;1m'${path.resolve(
            result,
          )}'\x1b[0m\n`,
        );
      }
    }
    ejs.renderFile(
      filename,
      { ...result, PUBLIC_PATH, GLOBEL: globelData },
      ejsOption,
      (err, str) => {
        if (err) {
          reject(err);
        } else {
          fs.ensureDirSync(path.dirname(outputPath));
          fs.outputFileSync(outputPath, str);
          console.log(
            "🎉 Create \x1b[32;1m%s\x1b[0m successfully !!!",
            path.relative(process.cwd(), outputPath),
          );
          resolve(str);
        }
      },
    );
  });
}

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

const toEqualPathOfData = (filename: string, data: Record<string, any>) => {
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
