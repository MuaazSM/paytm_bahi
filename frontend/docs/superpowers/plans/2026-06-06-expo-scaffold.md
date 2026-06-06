# Expo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a compilable, Expo Go–runnable Dukaan IQ app shell with all dependencies installed, NativeWind v4 tokens wired, navigation skeleton, and empty stubs for every screen, store, and API module.

**Architecture:** `create-expo-app` blank-typescript template as the base; NativeWind v4 configured via `tailwind.config.js` + `metro.config.js`; React Navigation native-stack (root) + bottom-tabs (main); Zustand slices for merchant/draft/inventory/alerts; typed axios client reading `EXPO_PUBLIC_API_URL` from env.

**Tech Stack:** Expo SDK 52, TypeScript, NativeWind v4, React Navigation 6, Zustand 4, Axios, expo-audio, expo-image-picker, lucide-react-native.

---

## File Map

| File | Responsibility |
|------|----------------|
| `App.tsx` | Root: SafeAreaProvider + NavigationContainer + RootNavigator + global.css import |
| `global.css` | NativeWind Tailwind directives |
| `tailwind.config.js` | NativeWind v4 content paths + all DESIGN.md color tokens |
| `metro.config.js` | `withNativeWind` wrapper |
| `babel.config.js` | `babel-preset-expo` with `jsxImportSource: 'nativewind'` + `nativewind/babel` plugin |
| `nativewind-env.d.ts` | NativeWind className type augmentation |
| `.env.example` | `EXPO_PUBLIC_API_URL` placeholder |
| `.gitignore` | Adds `.env` |
| `src/theme/colors.ts` | All hex tokens from DESIGN.md §2 as typed const |
| `src/theme/typography.ts` | Type scale + weights from DESIGN.md §3 |
| `src/theme/spacing.ts` | Spacing scale + radii from DESIGN.md §3 |
| `src/theme/index.ts` | Re-exports colors, typography, spacing |
| `src/api/types.ts` | Full TypeScript interfaces for every API_CONTRACTS.md shape |
| `src/api/client.ts` | Axios instance + typed stub functions per endpoint |
| `src/store/merchantStore.ts` | Zustand: merchant object + auth token |
| `src/store/draftSaleStore.ts` | Zustand: voice/OCR draft + line_items |
| `src/store/inventoryStore.ts` | Zustand: products cache + loading state |
| `src/store/alertStore.ts` | Zustand: alerts list |
| `src/navigation/types.ts` | RootStackParamList + TabParamList |
| `src/navigation/RootNavigator.tsx` | native-stack: Onboarding → MainTabs → modals |
| `src/navigation/MainTabs.tsx` | bottom-tabs + custom tabBar with MicFAB gap |
| `src/screens/OnboardingScreen.tsx` | Stub |
| `src/screens/HomeScreen.tsx` | Stub |
| `src/screens/VoiceCaptureScreen.tsx` | Stub (modal) |
| `src/screens/ConfirmScreen.tsx` | Stub (modal) |
| `src/screens/InventoryScreen.tsx` | Stub |
| `src/screens/InsightsScreen.tsx` | Stub |
| `src/screens/AssistantScreen.tsx` | Stub |
| `src/components/MicFAB.tsx` | Stub (used in MainTabs custom tabBar) |
| `src/components/LineItemRow.tsx` | Stub |
| `src/components/InsightCard.tsx` | Stub |
| `src/components/AlertPill.tsx` | Stub |
| `src/components/StockBadge.tsx` | Stub |
| `src/components/LangNumber.tsx` | Stub |

---

## Task 1: Init Expo project

**Files:**
- Creates: `App.tsx`, `package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `assets/`

- [ ] **Step 1: Run create-expo-app in the frontend directory**

```bash
cd /path/to/paytm_bahi/frontend
npx create-expo-app@latest . --template blank-typescript
```

When prompted "A package.json already exists…", choose to proceed. It will not overwrite `CLAUDE.md`.

Expected output ends with: `✅ Your project is ready!`

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: no errors (or only "cannot find module" for packages not yet installed — that's fine).

- [ ] **Step 3: Commit baseline**

```bash
git add .
git commit -m "chore: init expo blank-typescript scaffold"
```

---

## Task 2: Install all dependencies

**Files:** `package.json` (updated by npm/expo install)

- [ ] **Step 1: Install navigation packages**

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

- [ ] **Step 2: Install NativeWind and Tailwind**

```bash
npx expo install nativewind tailwindcss
```

- [ ] **Step 3: Install state + data packages**

```bash
npx expo install zustand axios
```

- [ ] **Step 4: Install Expo modules**

```bash
npx expo install expo-audio expo-image-picker
```

- [ ] **Step 5: Install icon packages**

```bash
npx expo install lucide-react-native react-native-svg
```

- [ ] **Step 6: Verify no peer dependency errors**

```bash
npx expo-doctor
```

Expected: all checks pass (or only warnings about unrelated SDK mismatches — not errors).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install all scaffold dependencies"
```

---

## Task 3: Configure NativeWind v4

**Files:**
- Create: `global.css`, `tailwind.config.js`, `nativewind-env.d.ts`
- Modify: `metro.config.js`, `babel.config.js`

- [ ] **Step 1: Create `global.css`**

Create `frontend/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Create `tailwind.config.js`**

Create `frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'paytm-blue':       '#00BAF2',
        'paytm-blue-dark':  '#002970',
        'paytm-navy':       '#20336B',
        'paytm-sky-tint':   '#E6F7FE',
        'sarvam-accent':    '#FF6B35',
        'sarvam-accent-tint':'#FFF0EA',
        'bg':               '#F4F6F9',
        'surface':          '#FFFFFF',
        'text-primary':     '#0A0F2C',
        'text-secondary':   '#5B6478',
        'border':           '#E4E8EF',
        'success':          '#1FA463',
        'warning':          '#F5A623',
        'danger':           '#E5484D',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Create `metro.config.js`**

Create (or overwrite) `frontend/metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 4: Update `babel.config.js`**

Overwrite `frontend/babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: ['nativewind/babel'],
  };
};
```

- [ ] **Step 5: Create `nativewind-env.d.ts`**

Create `frontend/nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Add NativeWind types reference to `tsconfig.json`**

Open `frontend/tsconfig.json`. It will look like:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

Add `"include"` so NativeWind env types are picked up:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "nativewind-env.d.ts"
  ]
}
```

- [ ] **Step 7: Update `App.tsx` to import global CSS**

Open `frontend/App.tsx`. Add the import as the very first line:
```tsx
import './global.css';
```

The rest of App.tsx stays as-is for now — we'll replace the body in Task 10.

- [ ] **Step 8: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors from NativeWind types.

- [ ] **Step 9: Commit**

```bash
git add global.css tailwind.config.js metro.config.js babel.config.js nativewind-env.d.ts tsconfig.json App.tsx
git commit -m "chore: configure NativeWind v4 with design tokens"
```

---

## Task 4: Create theme module

**Files:**
- Create: `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/spacing.ts`, `src/theme/index.ts`

These are plain TS constants — no logic, no imports. Used anywhere className strings can't be used (StyleSheet, animated values, imperative code).

- [ ] **Step 1: Create `src/theme/colors.ts`**

```bash
mkdir -p src/theme
```

Create `frontend/src/theme/colors.ts`:
```ts
export const colors = {
  paytmBlue:         '#00BAF2',
  paytmBlueDark:     '#002970',
  paytmNavy:         '#20336B',
  paytmSkyTint:      '#E6F7FE',
  sarvamAccent:      '#FF6B35',
  sarvamAccentTint:  '#FFF0EA',
  bg:                '#F4F6F9',
  surface:           '#FFFFFF',
  textPrimary:       '#0A0F2C',
  textSecondary:     '#5B6478',
  border:            '#E4E8EF',
  success:           '#1FA463',
  warning:           '#F5A623',
  danger:            '#E5484D',
} as const;

export type ColorKey = keyof typeof colors;
```

- [ ] **Step 2: Create `src/theme/typography.ts`**

Create `frontend/src/theme/typography.ts`:
```ts
export const typography = {
  display:  { fontSize: 28, fontWeight: '700' as const },
  h1:       { fontSize: 22, fontWeight: '700' as const },
  h2:       { fontSize: 18, fontWeight: '600' as const },
  body:     { fontSize: 15, fontWeight: '400' as const },
  label:    { fontSize: 13, fontWeight: '500' as const },
  monoNum:  { fontSize: 17, fontWeight: '600' as const },
} as const;
```

- [ ] **Step 3: Create `src/theme/spacing.ts`**

Create `frontend/src/theme/spacing.ts`:
```ts
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;

export const radii = {
  card:   16,
  button: 12,
  fab:    9999,
  pill:   9999,
} as const;
```

- [ ] **Step 4: Create `src/theme/index.ts`**

Create `frontend/src/theme/index.ts`:
```ts
export * from './colors';
export * from './typography';
export * from './spacing';
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/theme/
git commit -m "feat: add theme module with DESIGN.md tokens"
```

---

## Task 5: API types and client

**Files:**
- Create: `src/api/types.ts`, `src/api/client.ts`, `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Add `.env` to `.gitignore`**

Open `.gitignore`. Append:
```
.env
```

- [ ] **Step 2: Create `.env.example`**

Create `frontend/.env.example`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 3: Create `src/api/types.ts`**

```bash
mkdir -p src/api
```

Create `frontend/src/api/types.ts`:
```ts
// All money fields are integer paise. Never floats.

export interface Merchant {
  id: number;
  name: string;
  language: string;
  business_type: string;
}

export interface LoginRequest {
  phone: string;
}

export interface LoginResponse {
  token: string;
  merchant: Merchant;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  reorder_point: number;
  is_perishable: boolean;
  last_sold_at: string | null;
}

export interface ProductsResponse {
  products: Product[];
}

export interface CreateProductRequest {
  name: string;
  aliases: string[];
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  reorder_point: number;
  is_perishable: boolean;
}

export interface DraftLineItem {
  product_id: number;
  matched_name: string;
  qty: number;
  unit: string;
  unit_price: number;
  line_total: number;
  match_confidence: number;
}

export interface VoiceDraftResponse {
  draft_id: string;
  source: 'voice' | 'ocr';
  transcript: string;
  language_detected: string;
  needs_clarification: boolean;
  clarification: string | null;
  line_items: DraftLineItem[];
  total_amount: number;
}

export interface ConfirmLineItem {
  product_id: number;
  qty: number;
  unit: string;
  unit_price: number;
}

export interface ConfirmSaleRequest {
  source: 'voice' | 'ocr' | 'manual';
  raw_input: string;
  line_items: ConfirmLineItem[];
}

export interface Alert {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  product_id: number | null;
  message: string;
  spoken_message: string;
  created_at: string;
  dismissed: boolean;
}

export interface ConfirmedSale {
  id: number;
  total_amount: number;
  confirmed: boolean;
  created_at: string;
}

export interface StockUpdate {
  product_id: number;
  new_stock: number;
}

export interface ConfirmSaleResponse {
  sale: ConfirmedSale;
  stock_updates: StockUpdate[];
  alerts: Alert[];
}

export interface AlertsResponse {
  alerts: Alert[];
}

export interface TopMover {
  product_id: number;
  name: string;
  units: number;
  revenue_paise: number;
}

export interface DeadStock {
  product_id: number;
  name: string;
  days_since_sale: number;
  stock: number;
}

export interface RunningLow {
  product_id: number;
  name: string;
  stock: number;
  reorder_point: number;
}

export interface WastageRisk {
  product_id: number;
  name: string;
  stock: number;
  trend: string;
}

export interface MarginLeader {
  product_id: number;
  name: string;
  margin_paise: number;
  units: number;
}

export interface Pairing {
  a: string;
  b: string;
  count: number;
}

export interface InsightsSummary {
  revenue_today_paise: number;
  revenue_week_paise: number;
  top_movers: TopMover[];
  dead_stock: DeadStock[];
  running_low: RunningLow[];
  wastage_risk: WastageRisk[];
  margin_leaders: MarginLeader[];
  pairings: Pairing[];
}

export interface AssistantQueryResponse {
  question_text: string;
  answer_text: string;
  answer_audio_url: string;
  data: Record<string, unknown>;
}

export interface SpeakResponse {
  audio_url: string;
}

export interface ResetResponse {
  status: string;
  products: number;
}
```

- [ ] **Step 4: Create `src/api/client.ts`**

Create `frontend/src/api/client.ts`:
```ts
import axios from 'axios';
import type {
  LoginRequest, LoginResponse,
  Merchant,
  Product, ProductsResponse, CreateProductRequest,
  VoiceDraftResponse,
  ConfirmSaleRequest, ConfirmSaleResponse,
  AlertsResponse, Alert,
  InsightsSummary,
  AssistantQueryResponse, SpeakResponse,
  ResetResponse,
} from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const DEMO_TOKEN = 'demo-static-token';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${DEMO_TOKEN}`,
  },
});

// Auth
export const login = (req: LoginRequest): Promise<LoginResponse> =>
  apiClient.post<LoginResponse>('/auth/login', req).then(r => r.data);

export const getMe = (): Promise<Merchant> =>
  apiClient.get<Merchant>('/merchant/me').then(r => r.data);

// Inventory
export const getProducts = (params?: { q?: string; low_only?: boolean }): Promise<ProductsResponse> =>
  apiClient.get<ProductsResponse>('/products', { params }).then(r => r.data);

export const createProduct = (req: CreateProductRequest): Promise<Product> =>
  apiClient.post<Product>('/products', req).then(r => r.data);

export const patchProduct = (id: number, patch: Partial<CreateProductRequest>): Promise<Product> =>
  apiClient.patch<Product>(`/products/${id}`, patch).then(r => r.data);

// Sales
export const postVoiceSale = (audioUri: string, language?: string): Promise<VoiceDraftResponse> => {
  const form = new FormData();
  form.append('audio', { uri: audioUri, name: 'recording.m4a', type: 'audio/m4a' } as unknown as Blob);
  if (language) form.append('language', language);
  return apiClient.post<VoiceDraftResponse>('/sales/voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const confirmSale = (req: ConfirmSaleRequest): Promise<ConfirmSaleResponse> =>
  apiClient.post<ConfirmSaleResponse>('/sales/confirm', req).then(r => r.data);

// Insights
export const getInsightsSummary = (): Promise<InsightsSummary> =>
  apiClient.get<InsightsSummary>('/insights/summary').then(r => r.data);

export const getAlerts = (includeDismissed = false): Promise<AlertsResponse> =>
  apiClient.get<AlertsResponse>('/insights/alerts', {
    params: { include_dismissed: includeDismissed },
  }).then(r => r.data);

export const dismissAlert = (id: number): Promise<Alert> =>
  apiClient.post<Alert>(`/insights/alerts/${id}/dismiss`).then(r => r.data);

// Assistant
export const speakText = (text: string, language = 'hi-IN'): Promise<SpeakResponse> =>
  apiClient.post<SpeakResponse>('/assistant/speak', { text, language }).then(r => r.data);

export const queryAssistant = (text: string, language?: string): Promise<AssistantQueryResponse> =>
  apiClient.post<AssistantQueryResponse>('/assistant/query', { text, language }).then(r => r.data);

// Admin
export const resetDemo = (): Promise<ResetResponse> =>
  apiClient.post<ResetResponse>('/admin/reset').then(r => r.data);
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/api/ .env.example .gitignore
git commit -m "feat: add API types and axios client"
```

---

## Task 6: Zustand stores

**Files:**
- Create: `src/store/merchantStore.ts`, `src/store/draftSaleStore.ts`, `src/store/inventoryStore.ts`, `src/store/alertStore.ts`

- [ ] **Step 1: Create `src/store/merchantStore.ts`**

```bash
mkdir -p src/store
```

Create `frontend/src/store/merchantStore.ts`:
```ts
import { create } from 'zustand';
import type { Merchant } from '../api/types';

interface MerchantState {
  merchant: Merchant | null;
  token: string | null;
  setMerchant: (merchant: Merchant, token: string) => void;
  clear: () => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  merchant: null,
  token: null,
  setMerchant: (merchant, token) => set({ merchant, token }),
  clear: () => set({ merchant: null, token: null }),
}));
```

- [ ] **Step 2: Create `src/store/draftSaleStore.ts`**

Create `frontend/src/store/draftSaleStore.ts`:
```ts
import { create } from 'zustand';
import type { VoiceDraftResponse, DraftLineItem } from '../api/types';

interface DraftSaleState {
  draft: VoiceDraftResponse | null;
  setDraft: (draft: VoiceDraftResponse) => void;
  updateLineItem: (index: number, item: Partial<DraftLineItem>) => void;
  clearDraft: () => void;
}

export const useDraftSaleStore = create<DraftSaleState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateLineItem: (index, item) =>
    set((state) => {
      if (!state.draft) return state;
      const line_items = [...state.draft.line_items];
      line_items[index] = { ...line_items[index], ...item };
      const total_amount = line_items.reduce((sum, li) => sum + li.line_total, 0);
      return { draft: { ...state.draft, line_items, total_amount } };
    }),
  clearDraft: () => set({ draft: null }),
}));
```

- [ ] **Step 3: Create `src/store/inventoryStore.ts`**

Create `frontend/src/store/inventoryStore.ts`:
```ts
import { create } from 'zustand';
import type { Product } from '../api/types';

interface InventoryState {
  products: Product[];
  loading: boolean;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  updateProduct: (id: number, patch: Partial<Product>) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  loading: false,
  setProducts: (products) => set({ products }),
  setLoading: (loading) => set({ loading }),
  updateProduct: (id, patch) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
}));
```

- [ ] **Step 4: Create `src/store/alertStore.ts`**

Create `frontend/src/store/alertStore.ts`:
```ts
import { create } from 'zustand';
import type { Alert } from '../api/types';

interface AlertState {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlerts: (alerts: Alert[]) => void;
  dismissAlert: (id: number) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlerts: (incoming) =>
    set((state) => {
      const existingIds = new Set(state.alerts.map((a) => a.id));
      const newOnes = incoming.filter((a) => !existingIds.has(a.id));
      return { alerts: [...state.alerts, ...newOnes] };
    }),
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),
}));
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand stores (merchant, draft, inventory, alerts)"
```

---

## Task 7: Screen stubs

**Files:**
- Create: all 7 screen files under `src/screens/`

Each screen is a minimal valid React Native component that renders a labelled placeholder — enough to confirm navigation works.

- [ ] **Step 1: Create all screen stubs**

```bash
mkdir -p src/screens
```

Create `frontend/src/screens/OnboardingScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function OnboardingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Onboarding</Text>
    </View>
  );
}
```

Create `frontend/src/screens/HomeScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Home</Text>
    </View>
  );
}
```

Create `frontend/src/screens/VoiceCaptureScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function VoiceCaptureScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Voice Capture</Text>
    </View>
  );
}
```

Create `frontend/src/screens/ConfirmScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function ConfirmScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Confirm Sale</Text>
    </View>
  );
}
```

Create `frontend/src/screens/InventoryScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function InventoryScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Inventory</Text>
    </View>
  );
}
```

Create `frontend/src/screens/InsightsScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function InsightsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Insights</Text>
    </View>
  );
}
```

Create `frontend/src/screens/AssistantScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function AssistantScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-text-primary">Assistant</Text>
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/
git commit -m "feat: add screen stubs (7 screens)"
```

---

## Task 8: Component stubs

**Files:**
- Create: all 6 component files under `src/components/`

- [ ] **Step 1: Create all component stubs**

```bash
mkdir -p src/components
```

Create `frontend/src/components/MicFAB.tsx`:
```tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors } from '../theme';

interface MicFABProps {
  onPress: () => void;
  recording?: boolean;
}

export function MicFAB({ onPress, recording = false }: MicFABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-16 h-16 rounded-full items-center justify-center"
      style={{ backgroundColor: recording ? colors.sarvamAccent : colors.paytmBlue }}
      accessibilityLabel="Record sale"
    >
      <Mic color="#FFFFFF" size={28} />
    </TouchableOpacity>
  );
}
```

Create `frontend/src/components/LineItemRow.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';
import type { DraftLineItem } from '../api/types';

interface LineItemRowProps {
  item: DraftLineItem;
}

export function LineItemRow({ item }: LineItemRowProps) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-text-primary body">
        {item.qty} {item.unit} · {item.matched_name}
      </Text>
      <Text className="text-text-primary font-semibold">
        ₹{(item.line_total / 100).toFixed(0)}
      </Text>
    </View>
  );
}
```

Create `frontend/src/components/InsightCard.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';

interface InsightCardProps {
  title: string;
  value: string;
  takeaway: string;
  actionLabel: string;
  onAction: () => void;
}

export function InsightCard({ title, value, takeaway, actionLabel, onAction }: InsightCardProps) {
  return (
    <View className="bg-surface rounded-2xl p-4 m-2 flex-1">
      <Text className="text-text-secondary text-sm">{title}</Text>
      <Text className="text-text-primary text-xl font-bold mt-1">{value}</Text>
      <Text className="text-text-secondary text-sm mt-1">{takeaway}</Text>
    </View>
  );
}
```

Create `frontend/src/components/AlertPill.tsx`:
```tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import type { Alert } from '../api/types';
import { colors } from '../theme';

interface AlertPillProps {
  alert: Alert;
  onPress: () => void;
}

const severityColor: Record<Alert['severity'], string> = {
  info:     colors.paytmBlue,
  warning:  colors.warning,
  critical: colors.danger,
};

export function AlertPill({ alert, onPress }: AlertPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-full px-3 py-1 mr-2"
      style={{ backgroundColor: severityColor[alert.severity] }}
    >
      <Text className="text-white text-xs font-medium">{alert.message}</Text>
    </TouchableOpacity>
  );
}
```

Create `frontend/src/components/StockBadge.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme';

interface StockBadgeProps {
  stock: number;
  reorderPoint: number;
}

export function StockBadge({ stock, reorderPoint }: StockBadgeProps) {
  const color =
    stock === 0 ? colors.danger :
    stock <= reorderPoint ? colors.warning :
    colors.success;

  return (
    <View className="flex-row items-center gap-1">
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-text-secondary text-xs">{stock}</Text>
    </View>
  );
}
```

Create `frontend/src/components/LangNumber.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';

interface LangNumberProps {
  value: number;
  prefix?: string;
  style?: object;
}

export function LangNumber({ value, prefix = '', style }: LangNumberProps) {
  return (
    <Text style={style}>
      {prefix}{value.toLocaleString('en-IN')}
    </Text>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add component stubs (MicFAB, LineItemRow, InsightCard, AlertPill, StockBadge, LangNumber)"
```

---

## Task 9: Navigation skeleton

**Files:**
- Create: `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`, `src/navigation/MainTabs.tsx`

- [ ] **Step 1: Create `src/navigation/types.ts`**

```bash
mkdir -p src/navigation
```

Create `frontend/src/navigation/types.ts`:
```ts
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  VoiceCapture: undefined;
  Confirm: undefined;
};

export type TabParamList = {
  Home: undefined;
  Inventory: undefined;
  Insights: undefined;
  Assistant: undefined;
};
```

- [ ] **Step 2: Create `src/navigation/MainTabs.tsx`**

Create `frontend/src/navigation/MainTabs.tsx`:
```tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Home, Package, BarChart2, MessageCircle } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import InventoryScreen from '../screens/InventoryScreen';
import InsightsScreen from '../screens/InsightsScreen';
import AssistantScreen from '../screens/AssistantScreen';
import { MicFAB } from '../components/MicFAB';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View
      className="flex-row bg-surface border-t border-border"
      style={{ paddingBottom: 20, paddingTop: 8 }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };

        const iconColor = isFocused ? colors.paytmBlue : colors.textSecondary;

        const Icon =
          route.name === 'Home'      ? Home :
          route.name === 'Inventory' ? Package :
          route.name === 'Insights'  ? BarChart2 :
          MessageCircle;

        const tabButton = (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center"
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <Icon color={iconColor} size={24} />
          </TouchableOpacity>
        );

        // Insert MicFAB in the center (after index 1, before index 2)
        if (index === 2) {
          return (
            <React.Fragment key={`frag-${route.key}`}>
              <View className="flex-1 items-center" style={{ marginTop: -20 }}>
                <MicFAB onPress={() => rootNav.navigate('VoiceCapture')} />
              </View>
              {tabButton}
            </React.Fragment>
          );
        }

        return tabButton;
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Create `src/navigation/RootNavigator.tsx`**

Create `frontend/src/navigation/RootNavigator.tsx`:
```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/OnboardingScreen';
import VoiceCaptureScreen from '../screens/VoiceCaptureScreen';
import ConfirmScreen from '../screens/ConfirmScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="VoiceCapture"
        component={VoiceCaptureScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Confirm"
        component={ConfirmScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/
git commit -m "feat: add navigation skeleton (RootNavigator + MainTabs with MicFAB)"
```

---

## Task 10: Wire App.tsx and final verification

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Replace `App.tsx` body**

Overwrite `frontend/App.tsx` completely:
```tsx
import './global.css';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start Expo and verify on device**

```bash
npx expo start
```

Scan the QR code with Expo Go. Verify:
- App loads (Onboarding screen with "Onboarding" label).
- No red error screen.
- Bottom tab bar is visible once you navigate to MainTabs (for now you can temporarily change `initialRouteName` to `"MainTabs"` to check the tab bar, then revert).
- MicFAB appears centered in the tab bar and is tappable (opens VoiceCapture modal).
- All 4 tabs are tappable with no crash.

- [ ] **Step 4: Revert any temporary navigation change if made**

If you changed `initialRouteName` to `"MainTabs"` for testing, revert it back to `"Onboarding"`.

- [ ] **Step 5: Final commit**

```bash
git add App.tsx
git commit -m "feat: wire App.tsx — scaffold complete and Expo Go verified"
```

---

## Success Criteria Checklist

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx expo start` → QR scans, app loads in Expo Go
- [ ] Onboarding screen renders on launch
- [ ] Navigating to MainTabs shows bottom tab bar + MicFAB
- [ ] All 4 tabs navigate without crash
- [ ] Tapping MicFAB opens VoiceCapture modal
- [ ] NativeWind `className="bg-paytm-blue"` resolves to `#00BAF2` (verify by inspecting any screen with that class)
- [ ] `.env` is gitignored; `.env.example` is committed
- [ ] `npx expo-doctor` passes without errors
