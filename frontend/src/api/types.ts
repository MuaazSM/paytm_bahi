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
