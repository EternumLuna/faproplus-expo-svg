# FontAwesome Pro Expo SVG

Zero-overhead, production-grade Font Awesome Pro+ SVG icon library for React Native and Expo apps.

[![npm version](https://img.shields.io/npm/v/fontawesome-pro-expo-svg.svg)](https://www.npmjs.com/package/fontawesome-pro-expo-svg)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![React Native](https://img.shields.io/badge/React%20Native-0.70+-61DAFB.svg?logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2048+-000020.svg?logo=expo)](https://expo.dev)

---

## Why fontawesome-pro-expo-svg?

In React Native, Metro bundler cannot effectively tree-shake large barrel exports or dictionary files. Using traditional Font Awesome icon packages usually forces **megabytes of unused icon data** into your mobile app bundle, degrading app startup time and memory usage.

`fontawesome-pro-expo-svg` solves this with a **zero-cost compile-time Babel plugin**:

- **Zero Unused Icons Bundled:** Inlines exact SVG path tuples directly into your JSX at build-time. If you use 10 icons, your bundle contains *only* those 10 icons.
- **Strict TypeScript Autocomplete:** Choosing a `family` immediately autocompletes `name` with only icons available in that family.
- **Duotone & Multi-Layer Support:** Native support for classic duotone, jelly-duo, and sharp duotone styles with independent primary and secondary colors.
- **Pure Vector Performance:** Powered by native `react-native-svg` vectors—crisp on any screen density with zero font-file rendering lag.

---

## Installation

Install the package alongside `react-native-svg` in your project:

```bash
# Using Expo
npx expo install fontawesome-pro-expo-svg react-native-svg

# Using npm
npm install fontawesome-pro-expo-svg react-native-svg

# Using yarn
yarn add fontawesome-pro-expo-svg react-native-svg

# Using pnpm
pnpm add fontawesome-pro-expo-svg react-native-svg
```

> **Bare React Native Users:** If you are not using Expo, don't forget to run `npx pod-install` or `cd ios && pod install` after installing `react-native-svg`.

---

## Quick Setup (1 Step)

Add `'fontawesome-pro-expo-svg/babel'` to the `plugins` array in your `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // or 'module:@react-native/babel-preset'
    plugins: [
      'fontawesome-pro-expo-svg/babel',
    ],
  };
};
```

> **Tip:** Whenever you edit `babel.config.js`, start Expo / Metro with clear cache:
> ```bash
> npx expo start -c
> # or for bare React Native:
> npm start -- --reset-cache
> ```

---

## Usage

### 1. Classic Single-Layer Icons (Solid, Regular, Light, Thin, Brands)

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FaProPlus } from 'fontawesome-pro-expo-svg';

export function NavigationBar() {
  return (
    <View style={styles.container}>
      {/* Solid style icon */}
      <FaProPlus
        family="solid"
        name="house"
        size={24}
        color="#1E293B"
      />

      {/* Regular style icon */}
      <FaProPlus
        family="regular"
        name="heart"
        size={24}
        color="#EF4444"
      />

      {/* Brands style icon */}
      <FaProPlus
        family="brands"
        name="github"
        size={28}
        color="#000000"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 16,
  },
});
```

---

### 2. Duotone & Multi-Layer Icons (Custom Colors & Opacity)

Duotone icons have two layers: **primary** and **secondary**. You can customize the colors and opacity of each layer independently:

```tsx
import React from 'react';
import { FaProPlus } from 'fontawesome-pro-expo-svg';

export function NotificationBadge() {
  return (
    <FaProPlus
      family="jelly-duo-regular"
      name="bell"
      size={32}
      color="#2563EB"              /* Primary layer color */
      secondaryColor="#93C5FD"     /* Secondary layer color (defaults to color) */
      secondaryOpacity={0.4}       /* Opacity of secondary layer (defaults to 0.4) */
    />
  );
}
```

---

### 3. Dynamic Icons (Runtime Props or State)

When the icon `name` is dynamic (e.g. from props or state), the Babel plugin automatically ensures **only that specific family's data dictionary is loaded**:

```tsx
import React from 'react';
import { FaProPlus } from 'fontawesome-pro-expo-svg';

type ValidSolidIcon = 'house' | 'bell' | 'user' | 'gear';

interface DynamicIconButtonProps {
  iconName: ValidSolidIcon;
  isActive?: boolean;
}

export function DynamicIconButton({ iconName, isActive }: DynamicIconButtonProps) {
  return (
    <FaProPlus
      family="solid"
      name={iconName}
      size={24}
      color={isActive ? '#3B82F6' : '#64748B'}
    />
  );
}
```

*Even when dynamic, other families (`duotone`, `sharp`, `brands`, etc.) remain completely excluded from your final bundle!*

---

## Supported Icon Families

All 37 Font Awesome Pro+ families are fully supported and typed:

| Category | Available Families (`family` prop) |
| :--- | :--- |
| **Classic** | `solid`, `regular`, `light`, `thin`, `brands` |
| **Duotone** | `duotone`, `duotone-regular`, `duotone-light`, `duotone-thin` |
| **Sharp** | `sharp-solid`, `sharp-regular`, `sharp-light`, `sharp-thin` |
| **Sharp Duotone** | `sharp-duotone-solid`, `sharp-duotone-regular`, `sharp-duotone-light`, `sharp-duotone-thin` |
| **Jelly** | `jelly-regular`, `jelly-duo-regular`, `jelly-fill-regular` |
| **Slab** | `slab-regular`, `slab-duo-regular`, `slab-press-regular`, `slab-press-duo-regular` |
| **Utility** | `utility-semibold`, `utility-duo-semibold`, `utility-fill-semibold` |
| **Specialist** | `chisel-regular`, `etch-solid`, `graphite-thin`, `mosaic-solid`, `notdog-solid`, `notdog-duo-solid`, `pixel-regular`, `thumbprint-light`, `vellum-solid`, `whiteboard-semibold` |

---

## Props Reference

`<FaProPlus />` accepts all standard `react-native-svg` props (`style`, `testID`, `hitSlop`, `accessibilityLabel`, etc.) in addition to the icon-specific props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `family` | `IconFamily` | *Required* | Family/style of the icon (e.g., `'solid'`, `'jelly-duo-regular'`, `'brands'`). |
| `name` | `FamilyIconMap[F]` | *Required* | Strictly typed icon name. Autocompletes based on the selected `family`. |
| `size` | `number` | `24` | Width and height in density-independent pixels. |
| `color` | `string` | `'#000000'` | Primary layer fill color. |
| `secondaryColor` | `string` | `color` | Secondary layer fill color (for duotone / multi-layer icons). Defaults to `color`. |
| `secondaryOpacity`| `number` | `0.4` (duotone) / `1.0` (single) | Opacity of the secondary layer (0.0 to 1.0). |

---

## How It Works

```mermaid
flowchart TD
    A["Developer writes JSX<br/>&lt;FaProPlus family='solid' name='house' /&gt;"] --> B["Babel Plugin (Compile Time)"]
    B -->|Case A: Static family & name| C["Inlines SVG Path Tuple into JSX<br/>__resolvedData={['0 0 512 512', 'M277.8...']}"]
    B -->|Case B: Dynamic name| D["Requires ONLY target family dictionary<br/>require('.../solid.json')[dynamicName]"]
    C --> E["Metro Bundler"]
    D --> E
    E --> F["Zero Unused Icons in Final Mobile Bundle"]
```

---

## Troubleshooting & FAQ

### 1. `Unable to resolve "./generated/types"` or `Invalid call: require('./data/${family}.json')`

In React Native, Metro bundler strictly prohibits dynamic `require()` calls with template strings (e.g. `require('./data/' + family + '.json')`). Older pre-releases or stale caches may trigger this error.

**Solution:**
1. Upgrade to the latest version of `fontawesome-pro-expo-svg`:
   ```bash
   npx expo install fontawesome-pro-expo-svg@latest
   # or
   npm install fontawesome-pro-expo-svg@latest
   ```
2. Clear the Metro bundler cache completely:
   ```bash
   npx expo start -c
   # or for bare React Native:
   npm start -- --reset-cache
   ```
3. If using Watchman (macOS/Linux), clear watchman watches:
   ```bash
   watchman watch-del-all && npx expo start -c
   ```

---

### 2. Icons not updating or Babel plugin seems inactive

Metro caches transformed files aggressively. Whenever you add or edit `babel.config.js`:
1. Stop your development server (`Ctrl + C`).
2. Restart Metro with clean cache:
   ```bash
   npx expo start -c
   ```

---

### 3. Duotone icon appears as a single solid color

Duotone icons (`duotone`, `jelly-duo-regular`, `sharp-duotone-solid`, etc.) default `secondaryColor` to `color` with `secondaryOpacity={0.4}`. To display distinct layers:
```tsx
<FaProPlus
  family="jelly-duo-regular"
  name="bell"
  size={28}
  color="#2563EB"          /* Primary layer (e.g. blue) */
  secondaryColor="#93C5FD" /* Secondary layer (e.g. light blue) */
  secondaryOpacity={0.5}
/>
```

---

### 4. Does it work without the Babel plugin?

Yes! `<FaProPlus />` contains a runtime fallback dictionary for tests (like Jest) and quick prototypes. However, adding `'fontawesome-pro-expo-svg/babel'` to `babel.config.js` is **strongly recommended** for production to guarantee that unused icons and families are 100% excluded from your bundle.

---

## License

Font Awesome icons are subject to the [Font Awesome Pro License](https://fontawesome.com/license).
