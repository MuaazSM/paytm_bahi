import axios from 'axios';
import type {
  LoginRequest, LoginResponse,
  Merchant,
  Product, ProductsResponse, CreateProductRequest,
  VoiceDraftResponse,
  ConfirmSaleRequest, ConfirmSaleResponse,
  SalesResponse,
  AlertsResponse, DismissAlertResponse,
  InsightsSummary,
  AssistantQueryResponse,
  SpeakRequest, SpeakResponse,
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

export const postOcrSale = (imageUri: string): Promise<VoiceDraftResponse> => {
  const form = new FormData();
  form.append('image', { uri: imageUri, name: 'daybook.jpg', type: 'image/jpeg' } as unknown as Blob);
  return apiClient.post<VoiceDraftResponse>('/sales/ocr', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const getSales = (params?: { from?: string; to?: string }): Promise<SalesResponse> =>
  apiClient.get<SalesResponse>('/sales', { params }).then(r => r.data);

// Insights
export const getInsightsSummary = (): Promise<InsightsSummary> =>
  apiClient.get<InsightsSummary>('/insights/summary').then(r => r.data);

export const getAlerts = (includeDismissed = false): Promise<AlertsResponse> =>
  apiClient.get<AlertsResponse>('/insights/alerts', {
    params: { include_dismissed: includeDismissed },
  }).then(r => r.data);

export const dismissAlert = (id: number): Promise<DismissAlertResponse> =>
  apiClient.post<DismissAlertResponse>(`/insights/alerts/${id}/dismiss`).then(r => r.data);

// Assistant
export const speakText = (text: string, language: string = 'hi-IN'): Promise<SpeakResponse> => {
  const body: SpeakRequest = { text, language };
  return apiClient.post<SpeakResponse>('/assistant/speak', body).then(r => r.data);
};

export const queryAssistant = (text: string, language?: string): Promise<AssistantQueryResponse> =>
  apiClient.post<AssistantQueryResponse>('/assistant/query', { text, language }).then(r => r.data);

export const queryAssistantAudio = (audioUri: string, language?: string): Promise<AssistantQueryResponse> => {
  const form = new FormData();
  form.append('audio', { uri: audioUri, name: 'question.m4a', type: 'audio/m4a' } as unknown as Blob);
  if (language) form.append('language', language);
  return apiClient.post<AssistantQueryResponse>('/assistant/query', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

// Admin
export const resetDemo = (): Promise<ResetResponse> =>
  apiClient.post<ResetResponse>('/admin/reset').then(r => r.data);
