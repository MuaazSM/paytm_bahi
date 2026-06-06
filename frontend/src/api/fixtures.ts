// Contract-shaped fixture data. All money in paise.
// Seeded to match DATA_CONTRACTS.md so the demo "wow" moment fires:
//   Parle-G stock=4, reorder_point=10 → one sale tips the reorder alert.

import type {
  LoginRequest, LoginResponse,
  Merchant,
  Product, ProductsResponse, CreateProductRequest,
  VoiceDraftResponse,
  ConfirmSaleRequest, ConfirmSaleResponse,
  SaleListItem, SalesResponse,
  AlertsResponse, Alert, DismissAlertResponse,
  InsightsSummary,
  AssistantQueryResponse, SpeakResponse,
  ResetResponse,
} from './types';



const delay = <T>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const MERCHANT: Merchant = {
  id: 1,
  name: 'Ramesh Kirana Store',
  language: 'hi-IN',
  business_type: 'kirana',
};

const PRODUCTS: Product[] = [
  {
    id: 12, name: 'Parle-G Biscuit',
    category: 'snacks', unit: 'packet',
    cost_price: 800, selling_price: 1000,
    current_stock: 4, reorder_point: 10,
    is_perishable: false, last_sold_at: '2026-06-06T08:11:00Z',
  },
  {
    id: 7, name: 'Aashirvaad Atta 1kg',
    category: 'staples', unit: 'kg',
    cost_price: 5000, selling_price: 5500,
    current_stock: 22, reorder_point: 8,
    is_perishable: false, last_sold_at: '2026-06-06T09:00:00Z',
  },
  {
    id: 22, name: 'Amul Milk 500ml',
    category: 'dairy', unit: 'packet',
    cost_price: 2700, selling_price: 3000,
    current_stock: 14, reorder_point: 20,
    is_perishable: true, last_sold_at: '2026-06-06T07:30:00Z',
  },
  {
    id: 9, name: 'Shampoo Sachet',
    category: 'personal care', unit: 'piece',
    cost_price: 200, selling_price: 500,
    current_stock: 60, reorder_point: 20,
    is_perishable: false, last_sold_at: '2026-06-05T15:00:00Z',
  },
  {
    id: 31, name: 'Hair Gel 200ml',
    category: 'personal care', unit: 'piece',
    cost_price: 8000, selling_price: 12000,
    current_stock: 8, reorder_point: 5,
    is_perishable: false, last_sold_at: '2026-05-11T10:00:00Z',
  },
  {
    id: 3, name: 'Bread',
    category: 'bakery', unit: 'piece',
    cost_price: 2500, selling_price: 3500,
    current_stock: 6, reorder_point: 10,
    is_perishable: true, last_sold_at: '2026-06-06T09:10:00Z',
  },
  {
    id: 4, name: 'Butter 100g',
    category: 'dairy', unit: 'piece',
    cost_price: 4500, selling_price: 5500,
    current_stock: 5, reorder_point: 8,
    is_perishable: true, last_sold_at: '2026-06-06T09:10:00Z',
  },
  {
    id: 5, name: 'Maggi 70g',
    category: 'snacks', unit: 'packet',
    cost_price: 1200, selling_price: 1400,
    current_stock: 30, reorder_point: 10,
    is_perishable: false, last_sold_at: '2026-06-05T18:00:00Z',
  },
];

const ALERTS: Alert[] = [
  {
    id: 1, type: 'reorder', severity: 'warning',
    product_id: 12,
    message: 'Parle-G — 4 packets left',
    spoken_message: 'Parle-G sirf chaar packet bacha hai, dobara order karein?',
    created_at: '2026-06-06T09:00:00Z', dismissed: false,
  },
  {
    id: 2, type: 'wastage_risk', severity: 'warning',
    product_id: 22,
    message: 'Amul Milk — wastage risk',
    spoken_message: 'Amul Milk khatam hone se pehle bech dein.',
    created_at: '2026-06-06T08:00:00Z', dismissed: false,
  },
];

const INSIGHTS: InsightsSummary = {
  revenue_today_paise: 412000,
  revenue_week_paise: 2841500,
  top_movers: [
    { product_id: 12, name: 'Parle-G Biscuit', units: 47, revenue_paise: 47000 },
    { product_id: 7,  name: 'Aashirvaad Atta 1kg', units: 31, revenue_paise: 170500 },
    { product_id: 5,  name: 'Maggi 70g', units: 28, revenue_paise: 39200 },
  ],
  dead_stock: [
    { product_id: 31, name: 'Hair Gel 200ml', days_since_sale: 26, stock: 8 },
  ],
  running_low: [
    { product_id: 12, name: 'Parle-G Biscuit', stock: 4, reorder_point: 10 },
    { product_id: 22, name: 'Amul Milk 500ml', stock: 14, reorder_point: 20 },
  ],
  wastage_risk: [
    { product_id: 22, name: 'Amul Milk 500ml', stock: 14, trend: 'declining' },
  ],
  margin_leaders: [
    { product_id: 9,  name: 'Shampoo Sachet', margin_paise: 28200, units: 94 },
    { product_id: 31, name: 'Hair Gel 200ml', margin_paise: 32000, units: 8 },
  ],
  pairings: [
    { a: 'Bread', b: 'Butter 100g', count: 12 },
  ],
};

// Mutable session state so fixture confirm/dismiss/reset behave realistically.
let _products = PRODUCTS.map((p) => ({ ...p }));
let _alerts = ALERTS.map((a) => ({ ...a }));
let _sales: SaleListItem[] = [];
let _nextSaleId = 100;

export const login = (_req: LoginRequest): Promise<LoginResponse> =>
  delay(300, { token: 'demo-static-token', merchant: MERCHANT });

export const getMe = (): Promise<Merchant> =>
  delay(200, MERCHANT);

export const getProducts = (params?: { q?: string; low_only?: boolean }): Promise<ProductsResponse> => {
  let list = _products;
  if (params?.low_only) list = list.filter((p) => p.current_stock <= p.reorder_point);
  if (params?.q) {
    const q = params.q.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  return delay(300, { products: list });
};

export const createProduct = (req: CreateProductRequest): Promise<Product> => {
  const p: Product = { ...req, id: Date.now(), last_sold_at: null };
  _products = [..._products, p];
  return delay(300, p);
};

export const patchProduct = (id: number, patch: Partial<CreateProductRequest>): Promise<Product> => {
  _products = _products.map((p) => (p.id === id ? { ...p, ...patch } : p));
  const updated = _products.find((p) => p.id === id);
  if (!updated) return Promise.reject(new Error('not_found'));
  return delay(200, updated);
};

export const postVoiceSale = (_audioUri: string, _language?: string): Promise<VoiceDraftResponse> =>
  delay(1200, {
    draft_id: 'fixture_draft_1',
    source: 'voice' as const,
    transcript: 'ek Parle-G aur do kilo aata',
    language_detected: 'hi-IN',
    needs_clarification: false,
    clarification: null,
    line_items: [
      {
        product_id: 12, matched_name: 'Parle-G Biscuit',
        qty: 1, unit: 'packet',
        unit_price: 1000, line_total: 1000, match_confidence: 0.95,
      },
      {
        product_id: 7, matched_name: 'Aashirvaad Atta 1kg',
        qty: 2, unit: 'kg',
        unit_price: 5500, line_total: 11000, match_confidence: 0.91,
      },
    ],
    total_amount: 12000,
  });

export const confirmSale = (req: ConfirmSaleRequest): Promise<ConfirmSaleResponse> => {
  const stockUpdates: ConfirmSaleResponse['stock_updates'] = [];
  const newAlerts: Alert[] = [];

  req.line_items.forEach((li) => {
    const product = _products.find((p) => p.id === li.product_id);
    if (!product) return;
    const newStock = Math.max(0, product.current_stock - li.qty);
    _products = _products.map((p) =>
      p.id === li.product_id ? { ...p, current_stock: newStock } : p,
    );
    stockUpdates.push({ product_id: li.product_id, new_stock: newStock });

    if (newStock <= product.reorder_point) {
      const alert: Alert = {
        id: Date.now() + li.product_id,
        type: 'reorder',
        severity: newStock === 0 ? 'critical' : 'warning',
        product_id: li.product_id,
        message: `${product.name} — ${newStock} bache hain`,
        spoken_message: `${product.name} sirf ${newStock} bacha hai, dobara order karein?`,
        created_at: new Date().toISOString(),
        dismissed: false,
      };
      _alerts = [..._alerts, alert];
      newAlerts.push(alert);
    }
  });

  const sale = {
    id: _nextSaleId++,
    total_amount: req.line_items.reduce((s, li) => s + li.unit_price * li.qty, 0),
    confirmed: true,
    created_at: new Date().toISOString(),
  };

  _sales = [
    { id: sale.id, total_amount: sale.total_amount, source: req.source, created_at: sale.created_at, line_items: req.line_items },
    ..._sales,
  ];

  return delay(400, {
    sale,
    stock_updates: stockUpdates,
    alerts: newAlerts,
  });
};

export const getSales = (params?: { from?: string; to?: string }): Promise<SalesResponse> => {
  let list = _sales;
  if (params?.from) list = list.filter((s) => s.created_at >= params.from!);
  if (params?.to)   list = list.filter((s) => s.created_at <= params.to!);
  return delay(200, { sales: list });
};

export const getInsightsSummary = (): Promise<InsightsSummary> =>
  delay(400, INSIGHTS);

export const getAlerts = (includeDismissed = false): Promise<AlertsResponse> =>
  delay(200, {
    alerts: includeDismissed ? _alerts : _alerts.filter((a) => !a.dismissed),
  });

export const dismissAlert = (id: number): Promise<DismissAlertResponse> => {
  const exists = _alerts.some((a) => a.id === id);
  if (!exists) return Promise.reject(new Error('not_found'));
  _alerts = _alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a));
  return delay(150, { id, dismissed: true });
};

export const speakText = (_text: string, _language?: string): Promise<SpeakResponse> =>
  delay(600, { audio_url: '' });

export const queryAssistant = (_text: string, _language?: string): Promise<AssistantQueryResponse> =>
  delay(900, {
    question_text: 'is hafte sabse zyada kya bika?',
    answer_text: 'Is hafte sabse zyada Parle-G bika — 47 packet, ₹470 ka.',
    answer_audio_url: '',
    data: { top_movers: [{ name: 'Parle-G Biscuit', units: 47 }] },
  });

export const queryAssistantAudio = (_uri: string, _language?: string): Promise<AssistantQueryResponse> =>
  delay(1400, {
    question_text: 'kya khatam hone wala hai?',
    answer_text: 'Parle-G aur Amul Milk khatam hone wale hain — abhi order karein.',
    answer_audio_url: '',
    data: {
      running_low: [
        { name: 'Parle-G Biscuit', stock: 4 },
        { name: 'Amul Milk 500ml', stock: 14 },
      ],
    },
  });

export const resetDemo = (): Promise<ResetResponse> => {
  _products = PRODUCTS.map((p) => ({ ...p }));
  _alerts = ALERTS.map((a) => ({ ...a }));
  _sales = [];
  _nextSaleId = 100;
  return delay(300, { status: 'reset', products: PRODUCTS.length });
};
