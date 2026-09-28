import sharp from "sharp";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";

async function splitImage(inputPath: string, outputDir: string, parts: number = 3) {
  try {
    const image = sharp(inputPath);
    const meta = await image.metadata();

    if (!meta.width || !meta.height) {
      throw new Error("Could not retrieve image metadata");
    }

    const width = meta.width;
    const height = meta.height;

    const partWidth = Math.floor(width / parts);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Processing image: ${width}x${height}`);
    console.log(`Splitting into ${parts} parts...`);

    for (let i = 0; i < parts; i++) {
      const left = i * partWidth;
      // Adjust the last part to include any remainder pixels to avoid gaps or errors
      const currentPartWidth = (i === parts - 1) ? (width - left) : partWidth;

      const { name, ext } = path.parse(inputPath);
      const outputPath = path.join(outputDir, `${name}-${i + 1}${ext}`);

      await image.clone()
        .extract({ left, top: 0, width: currentPartWidth, height })
        .toFile(outputPath);

      console.log(`Saved part ${i + 1}: ${outputPath} (${currentPartWidth}x${height})`);
    }
    console.log("Done!");
  } catch (error) {
    console.error("Error processing image:", error);
    process.exitCode = 1;
  }
}

const USAGE = `Usage: bun run cli <image> [options]

Options:
  -p, --parts <n>     Number of vertical parts (default: 3)
  -o, --output <dir>  Output directory (default: ./output)
  -h, --help          Show this help`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    parts: { type: "string", short: "p", default: "3" },
    output: { type: "string", short: "o", default: "./output" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const inputImage = positionals[0];
if (!inputImage) {
  console.error(USAGE);
  process.exit(1);
}

const parts = Number(values.parts);
if (!Number.isInteger(parts) || parts < 1) {
  console.error(`Invalid --parts value: ${values.parts}`);
  process.exit(1);
}

if (!fs.existsSync(inputImage)) {
  console.error(`Input file not found: ${inputImage}`);
  process.exit(1);
}

await splitImage(inputImage, values.output ?? '', parts);