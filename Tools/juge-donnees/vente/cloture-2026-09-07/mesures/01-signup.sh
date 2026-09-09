KEY=303afa4d-73d5-4eb6-ab3b-5477ef638a38; CS=jd-vente-1788754954
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS-A1!\"}"
