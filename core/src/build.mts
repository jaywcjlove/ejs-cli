import ejs, { type Data, type Options as EjsOptions } from "ejs";
import path from "path";
import { glob } from "glob";
import fs from "fs-extra";
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
  /**
   * Pre-Save HTML Callback Method
   * @param html
   * @param output
   * @param filename
   * @returns
   */
  beforeSaveHTML?: (html: string, output: string, filename: string) => string;
  /**
   * Callback method after copying files.
   * @param filepath
   * @param output
   * @returns
   */
  afterCopyFile?: (filepath: string, output: string) => void;
  /**
   * Use shell patterns to match the files that need to be copied.
   * @default "/**\/*.{css,js,png,jpg,gif,svg,webp,eot,ttf,woff,woff2}"
   */
  copyPattern?: string;
  /**
   * Skip disk write
   * @default false
   */
  skipDiskWrite?: boolean;
  /**
   * Enable sitemap generation
   * @default false
   */
  sitemap?: boolean;
  /**
   * The prefix to use for the sitemap URLs, E.q: `https://wangchujiang.com/idoc/`
   * @default ""
   */
  sitemapPrefix?: string;
}

/** Template detail mapping data */
export type TemplateDetail = {
  template: string;
  templatePath?: string;
  data: Record<string, any>;
};

export async function build(
  entry: string[] = [],
  output: string,
  options: Options = {},
  details: TemplateDetail[] = [],
) {
  const { data: ejsData, sitemap, sitemapPrefix, ...ejsOption } = options;
  details.forEach((data) => {
    toHTML(
      data.template,
      output,
      { ...data.data, ...ejsData },
      ejsOption,
      data,
    );
  });

  if (sitemap == true) {
    const sitemapData: string[] = details.map((detail) => {
      let templatePath = detail.templatePath ?? detail.template;
      const outputPath = getOutput(templatePath, output);
      const relative = outputPath.replace(output, "").split(path.sep).join("/");
      return sitemapPrefix
        ? (sitemapPrefix + relative).replace(/\/+/g, "/")
        : relative;
    });
    await fs.outputFile(
      path.join(output, "sitemap.txt"),
      sitemapData.join("\n"),
    );
  }
  // 拷贝静态资源
  const dirs = [...new Set(getRootDirsAll(entry))].map((dir) => {
    return dir + options.copyPattern;
  });
  const data = await glob(dirs, { ignore: "node_modules/**" });
  data.forEach((filePath) => {
    copyFile(filePath, output, options);
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
  detail: TemplateDetail,
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
  const ejsData = { ...(data as Data) };
  let result = toEqualPathOfData(filename, ejsData);
  return new Promise(async (resolve, reject) => {
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
    const data = {
      ...detail.data,
      ...result,
      PUBLIC_PATH,
      GLOBAL: globalData,
      NOW_DATE: new Date(),
    };
    ejs.renderFile(filename, data, ejsOption, (err, str) => {
      if (err) {
        reject(err);
      } else {
        if (beforeSaveHTML && typeof beforeSaveHTML === "function") {
          str = beforeSaveHTML(str, output, filename);
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
      }
    });
  });
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
