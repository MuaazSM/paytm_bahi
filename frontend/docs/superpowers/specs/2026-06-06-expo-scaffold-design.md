# Dukaan IQ Frontend — Expo Scaffold Design

**Date:** 2026-06-06
**Status:** Approved
**Scope:** Initial scaffold of the Expo SDK 52+ React Native app. Produces a compilable, Expo Go–runnable shell with all dependencies installed, theme tokens wired, navigation skeleton, and empty stubs for every screen, store, and API module. No feature logic is implemented here.

---

## 1. Approach

Use `create-expo-app@latest` with the `blank-typescript` template, run from inside `frontend/` so the existing `CLAUDE.md` is preserved. This gives the correct Expo SDK 52 `app.json`, `babel.config.js`, and `tsconfig.json` baseline with no Expo Router baggage to strip out.

Runtime target: **Expo Go** (Expo SDK 52, iOS/Android). No custom dev build required for this scaffold.

---

## 2. Package manifest

### Navigation
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `react-native-screens`
- `react-native-safe-area-context`

### Styling
- `nativewind` (v4)
- `tailwindcss`

### State + data
- `zustand`
- `axios`

### Expo modules (Expo Go compatible)
- `expo-audio` — mic recording (SDK 52 replacement for expo-av, which requires a dev build)
- `expo-image-picker` — OCR photo upload (P2)

### Icons
- `lucide-react-native`
- `react-native-svg` — peer dependency of lucide-react-native

---

## 3. Folder structure

```
frontend/
├── App.tsx                        # root: SafeAreaProvider + NavigationContainer + RootNavigator
├── app.json
├── babel.config.js                # Expo preset + babel-plugin-nativewind
├── tailwind.config.js             # NativeWind v4 config, extends theme with design tokens
├── metro.config.js                # withNativeWind(getDefaultConfig(...))
├── tsconfig.json
├── .env.example                   # EXPO_PUBLIC_API_URL=http://localhost:8000
├── .env                           # gitignored; actual tunnel URL during demo
└── src/
    ├── api/
    │   ├── client.ts              # axios instance: baseURL=EXPO_PUBLIC_API_URL, Bearer token
    │   └── types.ts               # TS types mirroring API_CONTRACTS.md field-for-field
    ├── store/
    │   ├── merchantStore.ts       # merchant object + auth token
    │   ├── draftSaleStore.ts      # voice/OCR draft + line_items array
    │   ├── inventoryStore.ts      # products cache + loading state
    │   └── alertStore.ts          # alerts list + dismissed state
    ├── navigation/
    │   ├── RootNavigator.tsx      # native-stack: Onboarding → MainTabs (+ modal stack)
    │   └── MainTabs.tsx           # bottom-tabs: Home | Inventory | (FAB gap) | Insights | Assistant
    ├── screens/
    │   ├── OnboardingScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── VoiceCaptureScreen.tsx  # modal
    │   ├── ConfirmScreen.tsx       # modal
    │   ├── InventoryScreen.tsx
    │   ├── InsightsScreen.tsx
    │   └── AssistantScreen.tsx
    ├── components/
    │   ├── MicFAB.tsx
    │   ├── LineItemRow.tsx
    │   ├── InsightCard.tsx
    │   ├── AlertPill.tsx
    │   ├── StockBadge.tsx
    │   └── LangNumber.tsx
    └── theme/
        ├── colors.ts              # hex tokens from DESIGN.md §2
        ├── typography.ts          # type scale + weights from DESIGN.md §3
        ├── spacing.ts             # spacing scale + radii from DESIGN.md §3
        └── index.ts               # re-exports colors, typography, spacing
```

All `screens/` and `components/` files are empty stubs (valid React Native components that render `null` or a placeholder `<View>`). All `store/` files export an empty Zustand slice. `api/types.ts` exports the full TypeScript type set; `api/client.ts` exports the axios instance and typed stub functions.

---

## 4. NativeWind v4 + token wiring

### `tailwind.config.js`
Extends `theme.extend.colors` with every color token from `DESIGN.md §2`:

| Tailwind key | Hex | Use |
|---|---|---|
| `paytm-blue` | `#00BAF2` | Primary actions, mic FAB |
| `paytm-blue-dark` | `#002970` | Headers, primary text |
| `paytm-navy` | `#20336B` | Deep accents, selected tab |
| `paytm-sky-tint` | `#E6F7FE` | Active card backgrounds |
| `sarvam-accent` | `#FF6B35` | AI surfaces only (mic active, waveform) |
| `sarvam-accent-tint` | `#FFF0EA` | AI surface tints |
| `bg` | `#F4F6F9` | App background |
| `surface` | `#FFFFFF` | Cards |
| `text-primary` | `#0A0F2C` | Body text |
| `text-secondary` | `#5B6478` | Captions |
| `border` | `#E4E8EF` | Dividers |
| `success` | `#1FA463` | Healthy stock |
| `warning` | `#F5A623` | Running low |
| `danger` | `#E5484D` | Stockout, dead stock |

### `metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

### `babel.config.js`
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

### `src/theme/` TS objects
Plain TS constants that mirror the Tailwind config values — used anywhere className strings can't be used (animated styles, `StyleSheet.create`, imperative code).

---

## 5. API client

`src/api/client.ts` creates an axios instance:
- `baseURL`: `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'`
- Default header: `Authorization: Bearer demo-static-token`
- Default `Content-Type: application/json`

`src/api/types.ts` exports TypeScript interfaces for every request/response shape in `API_CONTRACTS.md`. Money fields typed as `number` (integer paise — never `string`, never `float`). Stub async functions (`getProducts`, `postVoiceSale`, `confirmSale`, `getInsightsSummary`, etc.) are exported but return `Promise<never>` until implemented.

`.env` is gitignored. `.env.example` is committed with `EXPO_PUBLIC_API_URL=http://localhost:8000`.

---

## 6. Root component

`App.tsx`:
```tsx
<SafeAreaProvider>
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
</SafeAreaProvider>
```

`RootNavigator` is a native-stack navigator. Initial route is `Onboarding`; after mock login it pushes `MainTabs`. `VoiceCapture` and `Confirm` are presented as modals (`presentation: 'modal'`) on top of `MainTabs`.

`MainTabs` is a bottom-tab navigator with 4 visible tabs (Home, Inventory, Insights, Assistant) and a custom `tabBar` prop that renders the `MicFAB` as a center-docked button — no 5th tab entry, just the FAB overlaid on the tab bar.

---

## 7. Success criteria for this scaffold

- `npx expo start` runs without errors.
- Expo Go on a phone can scan the QR and load the app.
- The bottom tab bar renders with 4 tabs + the MicFAB in the center.
- Navigating between tabs works; tapping the FAB opens the VoiceCapture modal.
- No TypeScript errors (`npx tsc --noEmit` passes).
- NativeWind className strings resolve (a test `className="bg-paytm-blue"` renders the correct blue).
- `.env.example` committed, `.env` gitignored.
