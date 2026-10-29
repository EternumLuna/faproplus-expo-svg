import fs from "fs"
import path from "path"

export type IconTuple = [viewBox: string, primaryPath: string, secondaryPath?: string]

export interface FamilyData {
  [iconName: string]: IconTuple
}

const ROOT_DIR = path.resolve(__dirname, "..")
const SPRITES_DIR = path.join(ROOT_DIR, "sprites")
const DIST_DATA_DIR = path.join(ROOT_DIR, "dist", "data")
const SRC_TYPES_PATH = path.join(ROOT_DIR, "src", "generated", "types.d.ts")
const DIST_TYPES_PATH = path.join(ROOT_DIR, "dist", "generated", "types.d.ts")

/**
 * Extracts attributes from an XML/SVG tag string.
 */
function extractAttributes(tagString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /([a-zA-Z0-9_:-]+)=(?:'([^']*)'|"([^"]*)")/g
  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(tagString)) !== null) {
    const key = match[1]
    const value = match[2] !== undefined ? match[2] : match[3]
    attrs[key] = value
  }
  return attrs
}

/**
 * Parses a single SVG sprite file and extracts icons into a FamilyData map.
 */
function parseSpriteFile(filePath: string): { family: string; data: FamilyData; count: number } {
  const family = path.basename(filePath, ".svg")
  const content = fs.readFileSync(filePath, "utf8")
  const familyData: FamilyData = {}
  let count = 0

  // Match all <symbol ...>...</symbol> elements
  const symbolRegex = /<symbol\s+([^>]*?)>([\s\S]*?)<\/symbol>/g
  let symbolMatch: RegExpExecArray | null

  while ((symbolMatch = symbolRegex.exec(content)) !== null) {
    const symbolTagAttrs = symbolMatch[1]
    const symbolBody = symbolMatch[2]

    const symbolAttrs = extractAttributes(symbolTagAttrs)
    const id = symbolAttrs["id"]
    const viewBox = symbolAttrs["viewBox"] || "0 0 512 512"

    if (!id) {
      continue
    }

    // Extract all <path ... /> elements inside the symbol
    const pathRegex = /<path\s+([^>]*?)\/?>/g
    const paths: Array<{ attrs: Record<string, string>; raw: string }> = []
    let pathMatch: RegExpExecArray | null

    while ((pathMatch = pathRegex.exec(symbolBody)) !== null) {
      const pAttrs = extractAttributes(pathMatch[1])
      paths.push({ attrs: pAttrs, raw: pathMatch[1] })
    }

    if (paths.length === 0) {
      // Icon with no paths (e.g. empty symbol)
      familyData[id] = [viewBox, ""]
    } else if (paths.length === 1) {
      // Single-layer icon (solid, regular, light, brands, etc.)
      const d = paths[0].attrs["d"] || ""
      familyData[id] = [viewBox, d]
    } else {
      // Duotone / multi-layer icon (usually 2 paths)
      let primaryD = ""
      let secondaryD = ""

      const p0 = paths[0]
      const p1 = paths[1]

      const p0IsSecondary = /secondary|var\(--fa-secondary/i.test(p0.raw) || p0.attrs["class"]?.includes("fa-secondary") || p0.attrs["opacity"] === "0.4" || p0.attrs["opacity"] === ".4"

      const p1IsPrimary = /primary|var\(--fa-primary/i.test(p1.raw) || p1.attrs["class"]?.includes("fa-primary") || p1.attrs["opacity"] === "1"

      const p0IsPrimary = /primary|var\(--fa-primary/i.test(p0.raw) || p0.attrs["class"]?.includes("fa-primary")

      const p1IsSecondary = /secondary|var\(--fa-secondary/i.test(p1.raw) || p1.attrs["class"]?.includes("fa-secondary")

      if (p0IsSecondary || p1IsPrimary) {
        secondaryD = p0.attrs["d"] || ""
        primaryD = p1.attrs["d"] || ""
      } else if (p0IsPrimary || p1IsSecondary) {
        primaryD = p0.attrs["d"] || ""
        secondaryD = p1.attrs["d"] || ""
      } else {
        // Font Awesome duotone default convention:
        // First path is secondary layer, second path is primary layer.
        secondaryD = p0.attrs["d"] || ""
        primaryD = p1.attrs["d"] || ""
      }

      // If there are more than 2 paths, combine any additional paths into primary
      if (paths.length > 2) {
        for (let i = 2; i < paths.length; i++) {
          const extraD = paths[i].attrs["d"] || ""
          if (extraD) {
            primaryD = primaryD ? `${primaryD} ${extraD}` : extraD
          }
        }
      }

      familyData[id] = [viewBox, primaryD, secondaryD]
    }

    count++
  }

  return { family, data: familyData, count }
}

/**
 * Main build script execution.
 */
export async function buildSprites(): Promise<void> {
  const startTime = Date.now()
  console.log("[build-sprites] Starting sprite parsing...")

  if (!fs.existsSync(SPRITES_DIR)) {
    throw new Error(`Sprites directory not found at: ${SPRITES_DIR}`)
  }

  // Ensure output directories exist
  fs.mkdirSync(DIST_DATA_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(SRC_TYPES_PATH), { recursive: true })
  fs.mkdirSync(path.dirname(DIST_TYPES_PATH), { recursive: true })

  const spriteFiles = fs
    .readdirSync(SPRITES_DIR)
    .filter((file) => file.endsWith(".svg"))
    .sort()

  if (spriteFiles.length === 0) {
    console.warn(`[build-sprites] No .svg files found in ${SPRITES_DIR}`)
    return
  }

  console.log(`[build-sprites] Found ${spriteFiles.length} sprite families to parse.`)

  const familyIconMap: Record<string, string[]> = {}
  let totalIcons = 0

  for (const file of spriteFiles) {
    const filePath = path.join(SPRITES_DIR, file)
    const { family, data, count } = parseSpriteFile(filePath)

    // Save compact JSON dictionary per family
    const outJsonPath = path.join(DIST_DATA_DIR, `${family}.json`)
    fs.writeFileSync(outJsonPath, JSON.stringify(data), "utf8")

    familyIconMap[family] = Object.keys(data).sort()
    totalIcons += count
  }

  console.log(`[build-sprites] Generated ${spriteFiles.length} family JSON dictionaries in dist/data/ (Total icons: ${totalIcons}).`)

  // Generate strict TypeScript declaration file
  console.log("[build-sprites] Generating TypeScript definitions...")
  let typesContent = `/**\n * Auto-generated by scripts/build-sprites.ts - DO NOT EDIT MANUALLY.\n */\n\n`
  typesContent += `export type IconTuple = [viewBox: string, primaryPath: string, secondaryPath?: string];\n\n`
  typesContent += `export interface FamilyIconMap {\n`

  for (const [family, icons] of Object.entries(familyIconMap)) {
    if (icons.length === 0) {
      typesContent += `  "${family}": string;\n`
    } else {
      const union = icons.map((icon) => `\n    | ${JSON.stringify(icon)}`).join("")
      typesContent += `  "${family}":${union};\n`
    }
  }

  typesContent += `}\n\n`
  typesContent += `export type IconFamily = keyof FamilyIconMap;\n\n`
  typesContent += `export type IconName<F extends IconFamily = IconFamily> = FamilyIconMap[F];\n`

  fs.writeFileSync(SRC_TYPES_PATH, typesContent, "utf8")
  fs.writeFileSync(DIST_TYPES_PATH, typesContent, "utf8")
  console.log(`[build-sprites] Generated types at: ${SRC_TYPES_PATH} and ${DIST_TYPES_PATH}`)

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`[build-sprites] Build completed successfully in ${duration}s!`)
}

// Run when executed directly
if (require.main === module) {
  buildSprites().catch((err) => {
    console.error("[build-sprites] Error during build:", err)
    process.exit(1)
  })
}
