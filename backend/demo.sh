#!/usr/bin/env bash
# Dukaan IQ — backend-only demo walkthrough.
# Usage:  ./demo.sh                    (hits localhost)
#         URL=https://x.ngrok.app ./demo.sh   (hits a tunnel)
set -e
URL="${URL:-http://localhost:8000}"
JQ=$(command -v jq || echo "cat")
pause() { echo; read -rp "  ↵ next…" _; echo; }
say()   { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }

say "0. Reset demo data — fresh state for the judges"
echo "POST $URL/admin/reset"
curl -s -X POST "$URL/admin/reset" | $JQ
pause

say "1. The merchant — Ramesh Kirana Store, Hindi"
echo "POST $URL/auth/login"
curl -s -X POST "$URL/auth/login" -H 'Content-Type: application/json' \
  -d '{"phone":"9800000000"}' | $JQ
pause

say "2. The catalog — 30 SKUs with Hindi aliases (constrained vocab for STT)"
echo "GET  $URL/products  (first 3 shown)"
curl -s "$URL/products" | $JQ '.products[:3]'
pause

say "3. Parle-G is the scripted wow item: stock 4, reorder_point 10"
echo "GET  $URL/products?q=parle"
curl -s "$URL/products?q=parle" | $JQ '.products[0] | {name, current_stock, reorder_point}'
pause

say "4. THE HERO — merchant confirms a Parle-G sale. Stock 4→3 + Hindi alert."
echo "POST $URL/sales/confirm"
curl -s -X POST "$URL/sales/confirm" -H 'Content-Type: application/json' -d '{
  "source":"voice","raw_input":"ek parle g",
  "line_items":[{"product_id":1,"qty":1,"unit":"packet","unit_price":1000}]
}' | $JQ '{sale: .sale.id, stock_updates, alerts: [.alerts[] | {type, message, spoken_message}]}'
pause

say "5. Insights — Paytm's payment data + our item data = analytics nobody else has"
echo "GET  $URL/insights/summary"
curl -s "$URL/insights/summary" | $JQ '{
  revenue_today_paise, revenue_week_paise,
  top_movers: .top_movers[:3],
  running_low, dead_stock: .dead_stock[:2],
  margin_leaders: .margin_leaders[:2], pairings
}'
pause

say "6. Active alert queue"
echo "GET  $URL/insights/alerts"
curl -s "$URL/insights/alerts" | $JQ
pause

say "7. The voice assistant answering from the merchant's real data"
echo "POST $URL/assistant/query  text='kya khatam hone wala hai?'"
curl -s -X POST "$URL/assistant/query" -H 'Content-Type: application/json' \
  -d '{"text":"kya khatam hone wala hai?","language":"hi-IN"}' \
  | $JQ '{question_text, answer_text, audio: .answer_audio_url, data}'

say "Done — that's the full Dukaan IQ backend."
