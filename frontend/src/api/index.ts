// Single switching gate.
// Set EXPO_PUBLIC_USE_FIXTURES=true in .env to use in-memory fixture data;
// unset (or false) to hit the real backend at EXPO_PUBLIC_API_URL.
// Screens import from '../api' — never from './client' or './fixtures' directly.

import * as live from './client';
import * as fixture from './fixtures';

const USE_FIXTURES = process.env.EXPO_PUBLIC_USE_FIXTURES === 'true';

const impl = USE_FIXTURES ? fixture : live;

export const login          = impl.login;
export const getMe          = impl.getMe;
export const getProducts    = impl.getProducts;
export const createProduct  = impl.createProduct;
export const patchProduct   = impl.patchProduct;
export const postVoiceSale  = impl.postVoiceSale;
export const confirmSale    = impl.confirmSale;
export const getSales       = impl.getSales;
export const getInsightsSummary = impl.getInsightsSummary;
export const getAlerts      = impl.getAlerts;
export const dismissAlert   = impl.dismissAlert;
export const speakText      = impl.speakText;
export const queryAssistant = impl.queryAssistant;
export const resetDemo      = impl.resetDemo;

export { apiClient } from './client';
export * from './types';
