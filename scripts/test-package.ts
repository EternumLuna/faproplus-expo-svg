import assert from "assert"
import * as babel from "@babel/core"
import fs from "fs"
import path from "path"
import faProPlusBabelPlugin from "../src/babel-plugin"

async function runTests() {
  console.log("--- Running Font Awesome Pro+ Package Tests ---")

  // 1. Verify JSON Data Dictionaries
  console.log("Test 1: Validating dist/data JSON files...")
  const dataDir = path.resolve(__dirname, "..", "dist", "data")
  assert.ok(fs.existsSync(dataDir), "dist/data directory must exist")

  const jsonFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"))
  assert.strictEqual(jsonFiles.length, 37, "Must have 37 family json files")

  // Validate solid.json (single-layer)
  const solidData = JSON.parse(fs.readFileSync(path.join(dataDir, "solid.json"), "utf8"))
  assert.ok(solidData["house"], "solid.json must contain house")
  assert.strictEqual(solidData["house"].length, 2, "Single-layer icon tuple must have [viewBox, primaryD]")
  assert.strictEqual(typeof solidData["house"][0], "string")
  assert.strictEqual(typeof solidData["house"][1], "string")
  console.log("✓ Single-layer icon tuple verified (solid.house)")

  // Validate duotone icon (jelly-duo-regular.json)
  const jellyData = JSON.parse(fs.readFileSync(path.join(dataDir, "jelly-duo-regular.json"), "utf8"))
  assert.ok(jellyData["house"], "jelly-duo-regular.json must contain house")
  assert.strictEqual(jellyData["house"].length, 3, "Duotone icon tuple must have [viewBox, primaryD, secondaryD]")
  assert.strictEqual(typeof jellyData["house"][0], "string")
  assert.strictEqual(typeof jellyData["house"][1], "string")
  assert.strictEqual(typeof jellyData["house"][2], "string")
  console.log("✓ Duotone icon tuple verified (jelly-duo-regular.house)")

  // 2. Test Babel Plugin Case A: Static family & Static name
  console.log("\nTest 2: Babel Plugin - Case A (Static family & Static name)...")
  const inputCaseA = `
    import React from 'react';
    import { FaProPlus } from 'fontawesome-pro-expo-svg';

    export function MyComponent() {
      return <FaProPlus family="jelly-duo-regular" name="house" size={24} color="#FF0000" />;
    }
  `

  const resultCaseA = babel.transformSync(inputCaseA, {
    filename: "MyComponent.tsx",
    parserOpts: { plugins: ["jsx", "typescript"] },
    plugins: [[faProPlusBabelPlugin, { dataDir }]]
  })

  assert.ok(resultCaseA && resultCaseA.code, "Babel transformation must produce code")
  assert.ok(resultCaseA.code.includes("__resolvedData="), "Case A must inject __resolvedData attribute")
  // Check that the exact viewBox and path data are inlined
  assert.ok(resultCaseA.code.includes(jellyData["house"][0]), "Case A must inline viewBox")
  assert.ok(resultCaseA.code.includes(jellyData["house"][1]), "Case A must inline primaryPath")
  assert.ok(resultCaseA.code.includes(jellyData["house"][2]), "Case A must inline secondaryPath")
  console.log("✓ Case A inlines static icon data directly with zero dictionary bundling")

  // 3. Test Babel Plugin Case B: Static family & Dynamic name expression
  console.log("\nTest 3: Babel Plugin - Case B (Static family & Dynamic name)...")
  const inputCaseB = `
    import React from 'react';
    import { FaProPlus } from '@my-org/fa-pro-plus';

    export function DynamicIcon({ iconName }) {
      return <FaProPlus family="solid" name={iconName} size={32} />;
    }
  `

  const resultCaseB = babel.transformSync(inputCaseB, {
    filename: "DynamicIcon.tsx",
    parserOpts: { plugins: ["jsx", "typescript"] },
    plugins: [[faProPlusBabelPlugin, { dataDir }]]
  })

  assert.ok(resultCaseB && resultCaseB.code, "Babel transformation must produce code")
  console.log("Generated Code for Case B:\n", resultCaseB.code)
  assert.ok(resultCaseB.code.includes("__resolvedData="), "Case B must inject __resolvedData attribute")
  assert.ok(resultCaseB.code.includes('require("@my-org/fa-pro-plus/dist/data/solid.json")[iconName]') || resultCaseB.code.includes("require('@my-org/fa-pro-plus/dist/data/solid.json')[iconName]"), "Case B must inject require with detected package name and static family")
  console.log("✓ Case B correctly injects scoped require for dynamic name")

  // 4. Test Babel Plugin with Custom packageName option
  console.log("\nTest 4: Babel Plugin with custom packageName option...")
  const inputCustomPkg = `
    import React from 'react';
    import { FaProPlus } from 'custom-fa-pkg';

    export function TestCustom({ current }) {
      return <FaProPlus family="solid" name={current} />;
    }
  `

  const resultCustomPkg = babel.transformSync(inputCustomPkg, {
    filename: "Custom.tsx",
    parserOpts: { plugins: ["jsx", "typescript"] },
    plugins: [[faProPlusBabelPlugin, { dataDir, packageName: "custom-fa-pkg" }]]
  })

  assert.ok(resultCustomPkg && resultCustomPkg.code)
  assert.ok(resultCustomPkg.code.includes('require("custom-fa-pkg/dist/data/solid.json")[current]') || resultCustomPkg.code.includes("require('custom-fa-pkg/dist/data/solid.json')[current]"), "Must use configured packageName option")
  console.log("✓ Custom packageName option respected")

  // 5. Test Non-existent icon warning / graceful handling
  console.log("\nTest 5: Graceful handling of non-existent icon...")
  const inputInvalidIcon = `
    import React from 'react';
    import { FaProPlus } from 'fontawesome-pro-expo-svg';

    export function InvalidIcon() {
      return <FaProPlus family="solid" name="definitely-does-not-exist" />;
    }
  `

  let warned = false
  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    warned = true
    originalWarn(...args)
  }

  const resultInvalidIcon = babel.transformSync(inputInvalidIcon, {
    filename: "InvalidIcon.tsx",
    parserOpts: { plugins: ["jsx", "typescript"] },
    plugins: [[faProPlusBabelPlugin, { dataDir }]]
  })

  console.warn = originalWarn
  assert.ok(warned, "Plugin must emit a warning for missing icon")
  assert.ok(!resultInvalidIcon?.code?.includes("__resolvedData"), "Should not inject invalid resolved data")
  console.log("✓ Warning logged and invalid icon handled cleanly without crash")

  // 6. Test babel/index.js entry point
  console.log("\nTest 6: Validating babel/index.js entry point...")
  const babelEntry = require("../babel")
  assert.strictEqual(typeof babelEntry, "function", "babel/index.js must export the plugin function")
  assert.strictEqual(typeof babelEntry.default, "function", "babel/index.js must export default function")
  console.log("✓ babel/index.js CommonJS entry point verified")

  console.log("\n========================================")
  console.log("ALL TESTS PASSED SUCCESSFULLY! (6/6)")
  console.log("========================================")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
