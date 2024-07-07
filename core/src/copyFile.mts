import path from "node:path";
import fs from "fs-extra";
import { getOutput, type Options as CliOptions } from "./build.mjs";

export async function copyFile(
  filepath: string,
  output: string,
  option: CliOptions = {},
) {
  const outputPath = getOutput(filepath, output);
  fs.copySync(filepath, outputPath);
  console.log(
    "📋 Copy to \x1b[32;1m%s\x1b[0m !!!",
    path.relative(process.cwd(), outputPath),
  );
  if (option.afterCopyFile && typeof option.afterCopyFile === "function") {
    option.afterCopyFile(filepath, outputPath);
  }
}
