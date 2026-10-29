import React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"
import { FamilyIconMap, IconFamily, IconTuple } from "./types"

// Fallback runtime dictionary cache for testing or un-transformed usage
const runtimeFamilyCache: Record<string, Record<string, IconTuple>> = {}

function getFallbackData(family: string, name: string): IconTuple | undefined {
  try {
    if (!runtimeFamilyCache[family]) {
      // Lazy load family JSON if running in an environment that supports dynamic require (e.g., Node/Jest)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      runtimeFamilyCache[family] = require(`./data/${family}.json`)
    }
    return runtimeFamilyCache[family]?.[name]
  } catch {
    return undefined
  }
}

declare const __DEV__: boolean | undefined

export interface FaProPlusProps<F extends IconFamily = IconFamily> extends Omit<SvgProps, "children" | "viewBox" | "width" | "height"> {
  /** The Font Awesome icon family/style (e.g., 'solid', 'duotone', 'jelly-duo-regular') */
  family: F
  /** The icon name, strictly typed and autocompleted based on the chosen family */
  name: FamilyIconMap[F]
  /** Size (width & height) in pixels. Defaults to 24. */
  size?: number
  /** Primary icon color. Defaults to '#000000'. */
  color?: string
  /** Secondary icon color (for duotone/jelly-duo). Defaults to `color` (or '#000000'). */
  secondaryColor?: string
  /** Opacity for the secondary layer. Defaults to 0.4 for duotone, 1 for single path. */
  secondaryOpacity?: number
  /** Internal prop injected by the Babel plugin at compile-time */
  __resolvedData?: IconTuple | null
}

export function FaProPlus<F extends IconFamily = IconFamily>(props: FaProPlusProps<F>): React.ReactElement | null {
  const { family, name, size = 24, color = "#000000", secondaryColor, secondaryOpacity, __resolvedData, ...svgProps } = props

  // Use compile-time inlined data if injected by Babel, otherwise attempt runtime fallback
  const iconData: IconTuple | undefined | null = __resolvedData !== undefined ? __resolvedData : getFallbackData(family, name as string)

  if (!iconData || !Array.isArray(iconData) || iconData.length < 2) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(`[FaProPlus] Icon "${String(name)}" was not found in family "${String(family)}".`)
    }
    return null
  }

  const [viewBox, primaryPath, secondaryPath] = iconData
  const hasSecondary = Boolean(secondaryPath)
  const effectiveSecondaryColor = secondaryColor ?? color
  const effectiveSecondaryOpacity = secondaryOpacity ?? (hasSecondary ? 0.4 : 1)

  return (
    <Svg viewBox={viewBox} width={size} height={size} accessibilityRole="image" {...svgProps}>
      {secondaryPath ? <Path d={secondaryPath} fill={effectiveSecondaryColor} opacity={effectiveSecondaryOpacity} /> : null}
      {primaryPath ? <Path d={primaryPath} fill={color} opacity={1} /> : null}
    </Svg>
  )
}

FaProPlus.displayName = "FaProPlus"
export default FaProPlus
