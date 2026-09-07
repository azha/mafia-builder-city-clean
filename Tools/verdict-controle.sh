#!/usr/bin/env bash
# CONTRÔLE du verdict de `run-unity-check.sh`, sur des journaux SYNTHÉTIQUES — donc essayable sans
# la porte Unity et sans les ~15 min d'un run réel. Il source `verdict-log-unity.sh` : c'est LE code
# du harnais qui est jugé, jamais une transcription.
#
# ⚠️ LES JOURNAUX SONT FABRIQUÉS, ET C'EST LA RAISON PRINCIPALE DE CETTE FORME. Le socle exige qu'une
#    cible de contrôle soit INERTE — jamais une ligne que quelqu'un a le droit de corriger, sinon le
#    contrôle s'aveugle au moment précis où le dépôt va bien. Un journal réel serait une cible
#    mouvante (une catégorie renommée, un marqueur reformulé) ; un journal fabriqué ici ne bouge que
#    si on l'édite exprès.
# ⚠️ Et il porte ses DEUX moitiés. Un contrôle qui ne montre que des rouges ne prouve pas qu'il sait
#    se taire : les cas 1, 4, 6, 7, 8 et 9 existent pour attester qu'aucun code de sortie EXISTANT
#    n'a bougé — c'est le contrôle négatif demandé, et il est plus important que le positif.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./verdict-log-unity.sh

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
ko=0; n=0
essai(){ # essai <nom> <attendu> <em> <wd> <rc_in> <<< contenu du journal
  local nom="$1" att="$2" em="$3" wd="$4" rcin="$5"
  cat > "$T/log"
  local got; got=$(verdict_log "$T/log" "$em" "$wd" "$rcin")
  n=$((n+1))
  if [[ "$got" == "$att" ]]; then printf '  ✅ %-46s → %s\n' "$nom" "$got"
  else printf '  ⛔ %-46s → %s (attendu %s)\n' "$nom" "$got" "$att"; ko=1; fi
}

echo "— ce qui doit RESTER tel quel (contrôle négatif : aucun code existant ne bouge)"
essai "run de test vert" 0 1 1 0 <<'L'
MafiaCI: RunPlayModeTests finished — passed=13 failed=0
L
essai "run de test rouge" 1 1 1 0 <<'L'
MafiaCI: RunPlayModeTests finished — passed=12 failed=1
L
essai "compile nu : -quit passé, quit atteint" 0 0 1 0 <<'L'
Internal_EditorApplicationQuit
L
essai "délai dépassé (timeout)" 124 1 0 124 <<'L'
[journal tronqué, le run n'a jamais fini]
L
essai "signal externe (SIGKILL)" 137 1 0 137 <<'L'
[journal tronqué]
L
# ⚠️ CETTE ASSERTION A ÉTÉ ÉCRITE FAUSSE, ET LE CONTRÔLE L'A DIT AVANT LE COMMIT. Je l'avais posée
#    en `chien_de_garde=1, rc=1` pour prouver « un code non nul n'est jamais écrasé » — or quand le
#    chien de garde a mordu, le harnais écrase le code entrant DEPUIS TOUJOURS, et à dessein : c'est
#    NOUS qui avons tué le process, donc son code ne dit rien des tests (le commentaire du harnais le
#    dit mot pour mot). Asserter la survie du code entrant là aurait été CHANGER un comportement
#    existant en croyant le préserver — exactement ce que ce lot s'interdit.
#    ⇒ La propriété que je voulais vraiment protéger ne vit que HORS du chien de garde : quand Unity
#      est sorti tout seul avec un code non nul, la promotion d'abandon ne doit rien lui faire.
#    ★ Et le geste correct n'était pas de rendre l'essai vert : c'était de demander laquelle des deux
#      moitiés avait raison. Ici, le code.
essai "abandon : un code non nul d'Unity survit" 1 1 0 1 <<'L'
Aborting batchmode due to failure: Scripts have compiler errors.
L
essai "abandon : un délai dépassé n'est pas dégradé" 124 1 0 124 <<'L'
Aborting batchmode due to failure: executeMethod class 'X' could not be found.
L
essai "chien de garde : le marqueur prime sur le signal" 0 1 1 137 <<'L'
MafiaCI: RunPlayModeTests finished — passed=13 failed=0
L
essai "la phrase dans la SORTIE D'UN TEST ne mord pas" 0 1 1 0 <<'L'
MafiaCI: RunPlayModeTests finished — passed=13 failed=0
  test log: le harnais doit détecter "Aborting batchmode due to failure:" en début de ligne
L

echo "— ce qui doit désormais ROUGIR (contrôle positif : c'était RC=0)"
essai "classe d'executeMethod introuvable" 3 1 1 0 <<'L'
Aborting batchmode due to failure: executeMethod class 'MafiaCI.Absent' could not be found.
Internal_EditorApplicationQuit
L
essai "executeMethod fini SANS marqueur de travail" 3 1 1 0 <<'L'
Internal_EditorApplicationQuit
L
essai "erreurs de compilation, sans ligne 'error CS'" 3 0 1 0 <<'L'
Aborting batchmode due to failure: Scripts have compiler errors.
Internal_EditorApplicationQuit
L


# ⛔ ET LE CONTRÔLE DE BOUT EN BOUT, parce que les douze essais ci-dessus jugent la FONCTION et pas
#    le CÂBLAGE. Le défaut du 2026-09-07 vivait à moitié dans le câblage : le harnais ne savait pas
#    dans quel régime il était (`-executeMethod` ou compile nu). Un contrôle qui n'appelle que la
#    fonction serait resté vert avec un drapeau mal posé. On lance donc le HARNAIS ENTIER — drapeau,
#    source, appel, message, code de sortie — sur un FAUX éditeur qui écrit le journal du cas à
#    essayer. (`$UNITY` est overridable ; c'est écrit en tête du harnais depuis W4.P4a.)
echo "— le harnais ENTIER, sur un faux éditeur (câblage, pas seulement verdict)"
cat > "$T/faux-unity" <<'FU'
#!/usr/bin/env bash
prev=""; L=""
for a in "$@"; do [ "$prev" = "-logFile" ] && L="$a"; prev="$a"; done
cat "$SCENARIO" > "$L"
sleep 6
exit ${FAUX_RC:-0}
FU
chmod +x "$T/faux-unity"
e2e(){ # e2e <nom> <attendu> <scénario> [args du harnais…]
  local nom="$1" att="$2" sc="$3"; shift 3
  printf '%s' "$sc" > "$T/sc"
  SCENARIO="$T/sc" UNITY="$T/faux-unity" LOG_FILE="$T/e2e.log" TIMEOUT_S=40 \
    ./run-unity-check.sh "$@" >/dev/null 2>&1
  local got=$?; n=$((n+1))
  if [[ "$got" == "$att" ]]; then printf '  ✅ %-46s → RC=%s\n' "$nom" "$got"
  else printf '  ⛔ %-46s → RC=%s (attendu %s)\n' "$nom" "$got" "$att"; ko=1; fi
}
e2e "compile nu reste vert" 0 \
    "Internal_EditorApplicationQuit
"
e2e "run de test vert reste vert" 0 \
    "MafiaCI: RunPlayModeTests finished — passed=13 failed=0
Internal_EditorApplicationQuit
" -executeMethod MafiaCI.RunPlayModeTests
e2e "run de test rouge reste rouge" 1 \
    "MafiaCI: RunPlayModeTests finished — passed=12 failed=1
Internal_EditorApplicationQuit
" -executeMethod MafiaCI.RunPlayModeTests
e2e "classe absente : RC=0 AVANT, refusé maintenant" 3 \
    "Aborting batchmode due to failure: executeMethod class 'MafiaCI.Absent' could not be found.
Internal_EditorApplicationQuit
" -executeMethod MafiaCI.Absent

echo
if [[ $ko == 0 ]]; then echo "✅ verdict : $n/$n — 12 sur la fonction, 4 sur le harnais entier ; 3 faux verts fermés, aucun code existant modifié"; else echo "⛔ verdict : au moins un cas faux"; exit 1; fi
