#!/usr/bin/env bash
# W3.U1 C9-F1 (design §3 C9, anti-péremption) — le socle (CLAUDE.md) a mesuré que le piège de
# citation (citer verbatim l'énoncé qu'on corrige le réintroduit) s'est déclenché QUATRE fois en
# une journée, jamais attrapé par relecture — la seule pratique qui ait marché est un contrôle
# EXÉCUTÉ dans le MÊME commit que la réécriture. Ce script exécute, pour CHAQUE énoncé daté
# load-bearing du design v4, UN motif `grep -cF` À LA FOIS (JAMAIS une alternance `|` — elle
# matcherait littéralement ici et rendrait 0 en silence, le piège maison exact).
#
# Portée : le FICHIER, jamais le répertoire (design IMPORTANT-7 — le répertoire des specs grossit
# à chaque revue ⊥ future, un compte par motif y dériverait sans que ce lot ait changé).
set -uo pipefail

UNITY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

check() {
  local desc="$1" file="$2" pattern="$3" min_expect="$4"
  local count
  count=$(grep -cF "$pattern" "$file" 2>/dev/null || true)
  count=${count:-0}
  if [[ "$count" -ge "$min_expect" ]]; then
    echo "OK   [$desc] '$pattern' in $file : $count (attendu >= $min_expect)"
  else
    echo "FAIL [$desc] '$pattern' in $file : $count (attendu >= $min_expect)"
    FAIL=1
  fi
}

echo "=== W3.U1 C9-F1 — anti-péremption (fichier intact, un motif à la fois) ==="

# 1) Design §1.3.b : "grep -rlF 'session/open' Assets/ -> 0" — VRAI avant ce lot, FAUX depuis que
#    C3 (SessionClient.cs) appelle réellement /v1/session/open. Le fichier qui rend cette
#    affirmation périmée doit désormais EXISTER et CONTENIR l'appel — sinon la forme C (le maillon
#    manquant que ce lot ferme) ne serait toujours pas fermée.
check "C3 ferme la forme C" \
  "$UNITY_ROOT/Assets/Scripts/Shell/SessionClient.cs" \
  "/v1/session/open" 1

# 2) Le juge (MafiaCI.cs) — le design prescrit d'ÉLARGIR le juge existant, jamais d'en créer un
#    second (C1-F0). Revue ⊥ IMPORTANT-5 : `'"W3U1"'` seul comptait 2 (le tableau ET un mot dans un
#    commentaire de prose au-dessus) — un désaccord entre le commentaire ("doit être présent
#    EXACTEMENT une fois") et le contrôle (`>= 1`), qui n'aurait PAS attrapé un second point
#    d'entrée resté en prose sans jamais toucher le tableau. Motif resserré à une sous-chaîne qui
#    n'existe QUE dans la déclaration `Categories = { … }` elle-même (jamais dans la prose au-dessus,
#    formulée différemment) — vérifié : exactement 1 occurrence.
#    ⚠️ W3.U2/C4 (2026-08-17, imprévu non bloquant — voir message du commit qui a introduit ce delta) :
#    l'ancre d'origine (`, "W3U1" };`) supposait "W3U1" DERNIER du tableau — exactement le défaut de
#    jointure que ce protocole existe pour attraper, retourné contre son propre auteur. Élargir le
#    tableau par C4 (ajout de "W3U2" après "W3U1", chronologique, patron "on élargit, jamais un
#    second point d'entrée") a fait passer ce motif à 0 sur le fichier INTACT-après-C4 — un motif à
#    0 est un motif FAUX, pas une régression. Ancre déplacée sur le PRÉFIXE du tableau (stable tant
#    que "W4P4a", "W3UDA", "W3U1" restent dans cet ordre — invariant depuis 2 lots), robuste à tout
#    ajout FUTUR après "W3U1" : plus besoin de retoucher ce fichier au prochain élargissement.
check "C1-F0 élargit le juge (le TABLEAU, pas seulement sa prose)" \
  "$UNITY_ROOT/Assets/Editor/MafiaCI.cs" \
  '"W4P4a", "W3UDA", "W3U1"' 1

# 3) L'artefact que run-unity-check.sh détruisait sur ses DEUX chemins de sortie (design C1-F0,
#    §3) — le correctif (LOG_FILE, préservation optionnelle) doit être présent.
check "C1-F0 préserve l'artefact (LOG_FILE)" \
  "$UNITY_ROOT/Tools/run-unity-check.sh" \
  "LOG_FILE" 1

# 4) Le 12e champ (D3/§3-bis) doit exister dans le DTO client — sinon C3-F2 (parité de forme,
#    12 champs) et C9-F2 (la somme de contrôle) seraient tous deux invérifiables.
check "D3 — la 12e clé existe côté client" \
  "$UNITY_ROOT/Assets/Scripts/Shell/SessionDtos.cs" \
  "opened_game_day" 1

# 5) Le cash (`cash_cents`) doit être présent dans le DTO wallet client — design §1.3.f / Q3 close
#    (ruling 263175e7) : "le client est aveugle au solde" est l'énoncé PÉRIMÉ que ce lot corrige.
check "Q3 close — cash_cents exposé côté client" \
  "$UNITY_ROOT/Assets/Scripts/Operational/Dashboard/DashboardDtos.cs" \
  "cash_cents" 1

echo "=== fin ==="
if [[ "$FAIL" == "1" ]]; then
  echo "ECHEC: au moins un énoncé daté est resté périmé (ou la correction n'a pas atterri)."
  exit 1
fi
echo "OK: tous les énoncés datés vérifiés ici sont à jour avec le code."
exit 0
