import type { ConfigAPI, PluginObj, types as BabelTypes } from "@babel/core"
import fs from "fs"
import path from "path"
import { IconTuple } from "./types"

export interface BabelPluginOptions {
  /**
   * The package name used in generated `require(...)` calls for Case B.
   * Defaults to the imported package name, or 'fontawesome-pro-expo-svg' / '@my-org/fa-pro-plus'.
   */
  packageName?: string
  /**
   * Path to the directory containing `<family>.json` files.
   * Defaults to auto-resolving `dist/data/`.
   */
  dataDir?: string
  /**
   * Whether to match `<FaProPlus>` even if not explicitly imported from the package.
   * Defaults to true.
   */
  matchGlobal?: boolean
}

// In-memory cache for family JSON data to avoid repeated file I/O during compilation
const familyDataCache = new Map<string, Record<string, IconTuple> | null>()

/**
 * Resolves the path to the dist/data directory.
 */
function resolveDataDir(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return customDir
  }
  // Try relative to compiled dist/ location
  const distCandidate = path.resolve(__dirname, "data")
  if (fs.existsSync(distCandidate)) {
    return distCandidate
  }
  // Try relative to src/ location
  const srcCandidate = path.resolve(__dirname, "..", "dist", "data")
  if (fs.existsSync(srcCandidate)) {
    return srcCandidate
  }
  return distCandidate
}

/**
 * Loads and caches family JSON dictionary.
 */
function getFamilyData(family: string, dataDir: string): Record<string, IconTuple> | null {
  if (familyDataCache.has(family)) {
    return familyDataCache.get(family)!
  }

  const filePath = path.join(dataDir, `${family}.json`)
  if (!fs.existsSync(filePath)) {
    familyDataCache.set(family, null)
    return null
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw) as Record<string, IconTuple>
    familyDataCache.set(family, parsed)
    return parsed
  } catch (err) {
    console.error(`[fa-pro-plus/babel] Failed to parse data file for family "${family}":`, err)
    familyDataCache.set(family, null)
    return null
  }
}

/**
 * Extracts a static string from a JSX attribute value (e.g., attr="val" or attr={"val"}).
 */
function getStaticStringValue(t: typeof BabelTypes, value: BabelTypes.JSXAttribute["value"]): string | null {
  if (!value) return null
  if (t.isStringLiteral(value)) {
    return value.value
  }
  if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression)) {
    return value.expression.value
  }
  return null
}

/**
 * Babel plugin for compile-time Font Awesome Pro+ icon resolution.
 */
export function faProPlusBabelPlugin(api: ConfigAPI, options: BabelPluginOptions = {}): PluginObj {
  api.assertVersion(7)
  const t = (api as unknown as { types: typeof BabelTypes }).types

  const dataDir = resolveDataDir(options.dataDir)
  const matchGlobal = options.matchGlobal !== false

  return {
    name: "fa-pro-plus-babel-plugin",
    visitor: {
      Program(programPath, state) {
        // Track local identifiers imported from the package
        const importedComponentNames = new Set<string>()
        let detectedPackageName: string | null = null

        programPath.traverse({
          ImportDeclaration(importPath) {
            const source = importPath.node.source.value
            const isTargetPackage = (options.packageName && source === options.packageName) || source === "fontawesome-pro-expo-svg" || source === "@my-org/fa-pro-plus" || source.endsWith("/fa-pro-plus") || source.endsWith("/faproplus-react-native")

            if (isTargetPackage) {
              if (!detectedPackageName) {
                detectedPackageName = source
              }
              for (const specifier of importPath.node.specifiers) {
                if (t.isImportSpecifier(specifier)) {
                  const importedName = t.isIdentifier(specifier.imported) ? specifier.imported.name : (specifier.imported as BabelTypes.StringLiteral).value
                  if (importedName === "FaProPlus") {
                    importedComponentNames.add(specifier.local.name)
                  }
                } else if (t.isImportDefaultSpecifier(specifier)) {
                  importedComponentNames.add(specifier.local.name)
                }
              }
            }
          }
        })

        // Determine effective package name for require() in Case B
        const effectivePackageName = options.packageName || detectedPackageName || "fontawesome-pro-expo-svg"

        // Traverse JSX elements in the file
        programPath.traverse({
          JSXOpeningElement(jsxPath) {
            const openingElement = jsxPath.node
            const nameNode = openingElement.name

            // Check if element is <FaProPlus> or an imported alias
            let isTargetElement = false
            if (t.isJSXIdentifier(nameNode)) {
              const tag = nameNode.name
              if (importedComponentNames.has(tag)) {
                isTargetElement = true
              } else if (matchGlobal && tag === "FaProPlus") {
                isTargetElement = true
              }
            }

            if (!isTargetElement) {
              return
            }

            // Check if __resolvedData is already provided
            const existingResolved = openingElement.attributes.find((attr): attr is BabelTypes.JSXAttribute => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === "__resolvedData")
            if (existingResolved) {
              return
            }

            // Find 'family' attribute
            const familyAttr = openingElement.attributes.find((attr): attr is BabelTypes.JSXAttribute => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === "family")
            if (!familyAttr || !t.isJSXAttribute(familyAttr)) {
              return
            }

            const staticFamily = getStaticStringValue(t, familyAttr.value)
            if (!staticFamily) {
              // Dynamic family cannot be statically optimized; leave for runtime fallback
              return
            }

            // Find 'name' attribute
            const nameAttr = openingElement.attributes.find((attr): attr is BabelTypes.JSXAttribute => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === "name")
            if (!nameAttr || !t.isJSXAttribute(nameAttr)) {
              return
            }

            const staticName = getStaticStringValue(t, nameAttr.value)

            // =========================================================================
            // Case A: Static `family` AND Static `name`
            // =========================================================================
            if (staticName) {
              const familyData = getFamilyData(staticFamily, dataDir)
              if (!familyData) {
                console.warn(`[fa-pro-plus/babel] Warning: Unknown family "${staticFamily}" at ${state.filename || "unknown file"}`)
                return
              }

              const iconTuple = familyData[staticName]
              if (!iconTuple) {
                const loc = jsxPath.node.loc?.start
                const lineInfo = loc ? `:${loc.line}:${loc.column}` : ""
                console.warn(`[fa-pro-plus/babel] Warning: Icon "${staticName}" not found in family "${staticFamily}" at ${state.filename || "unknown"}${lineInfo}`)
                return
              }

              // Build AST: __resolvedData={["viewBox", "primaryPath", "secondaryPath"]}
              const elements = iconTuple.map((part) => (part ? t.stringLiteral(part) : t.stringLiteral("")))
              const arrayLiteral = t.arrayExpression(elements)
              const resolvedAttr = t.jsxAttribute(t.jsxIdentifier("__resolvedData"), t.jsxExpressionContainer(arrayLiteral))

              openingElement.attributes.push(resolvedAttr)
              return
            }

            // =========================================================================
            // Case B: Static `family`, Dynamic `name` expression
            // =========================================================================
            if (nameAttr.value && t.isJSXExpressionContainer(nameAttr.value) && !t.isJSXEmptyExpression(nameAttr.value.expression)) {
              const dynamicNameExpr = nameAttr.value.expression

              // Generate AST: require('<packageName>/dist/data/<family>.json')[dynamicVar]
              const requireCall = t.callExpression(t.identifier("require"), [t.stringLiteral(`${effectivePackageName}/dist/data/${staticFamily}.json`)])

              const memberExpr = t.memberExpression(requireCall, dynamicNameExpr, true /* computed */)

              const resolvedAttr = t.jsxAttribute(t.jsxIdentifier("__resolvedData"), t.jsxExpressionContainer(memberExpr))

              openingElement.attributes.push(resolvedAttr)
            }
          }
        })
      }
    }
  }
}

export default faProPlusBabelPlugin

// CommonJS compatibility export
if (typeof module !== "undefined" && module.exports) {
  module.exports = faProPlusBabelPlugin
  module.exports.default = faProPlusBabelPlugin
  module.exports.faProPlusBabelPlugin = faProPlusBabelPlugin
}
