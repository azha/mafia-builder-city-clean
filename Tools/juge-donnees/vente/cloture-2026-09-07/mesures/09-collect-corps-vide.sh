# Le client Unity poste littéralement "{}" (SellingClient.cs:77 — UnityWebRequest.Post(url, "{}", "application/json")).
# La route exige `safehouse_id` (selling.controller.ts:107 rejectUnknownFields + :111 uuidField).
# Sonde sur un dealer INEXISTANT : si la validation du corps passe AVANT la résolution du dealer, on voit 422 et non 404.
curl -s -X POST "http://localhost/v1/operational/dealer/$FAKE/collect" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d '{}'
