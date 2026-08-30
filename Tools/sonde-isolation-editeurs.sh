#!/usr/bin/env bash
# SONDE 1 — deux éditeurs Unity sur deux arbres partagent-ils leurs rechargements de domaine ?
#
# ⛔ LE PROBLÈME QUE CE SCRIPT EXISTE POUR RÉSOUDRE, ET IL EST DÉJÀ SURVENU ICI.
# Le 2026-08-30 à 22:25, la sonde a été « exécutée » ainsi : empreinte de A, dépôt de 6 fichiers
# dans Assets/ de B, empreinte de A. Résultat : A inchangé. Verdict tentant : « les éditeurs sont
# isolés ». Verdict RÉEL : **B n'avait pas recompilé non plus** — l'éditeur ne rafraîchit ses
# assets qu'au retour de focus, il n'avait jamais vu les fichiers. L'événement n'ayant pas eu
# lieu, l'absence d'effet chez A ne prouvait rien.
#   ⇒ C'est « un run qui n'a jamais démarré ressemble à un run vert », transposé à une sonde.
#
# ⇒ D'OÙ LA RÈGLE DE CE SCRIPT : **il refuse de rendre un verdict tant qu'il n'a pas la preuve
#   que B a réellement recompilé.** Cette preuve est son CONTRÔLE POSITIF, et elle est interne :
#   ce n'est pas un contrôle qu'on pourrait oublier de lancer, c'est la condition de validité du
#   verdict lui-même.
#
# LES DEUX GRANDEURS, ET POURQUOI CELLES-LÀ
#   · `Library/ScriptAssemblies` (mtime du répertoire + somme des mtimes des .dll). Une
#     recompilation les réécrit. La SOMME est mesurée en plus du répertoire parce qu'un
#     changement partiel (une seule dll retouchée) laisserait le mtime du répertoire parlant mais
#     imprécis — et parce qu'un compte nu ne dit pas CE QU'il compte.
#   · Le nombre de .dll : si A passait de 83 à 82 dll pour une raison sans rapport, la somme
#     changerait sans qu'aucune recompilation « partagée » ne soit en cause. On l'imprime pour
#     que le lecteur du verdict puisse écarter ce cas au lieu de le supposer.
#
# CE QUE LA SONDE NE PEUT PAS FAIRE, ET QUI EST DIT ICI PLUTÔT QUE DÉCOUVERT APRÈS
#   Elle ne PROVOQUE pas la recompilation de B : Unity ne rafraîchit qu'au retour de focus (ou
#   sur AssetDatabase.Refresh, qui demande le canal MCP). Le script attend donc que quelqu'un
#   donne le focus à la fenêtre. C'est une limite du dispositif, pas un défaut du protocole —
#   et c'est pourquoi le mode `--attendre` existe.
#
# ⛔ NE PAS LANCER PENDANT UN GATE : le retour de focus déclenche une compilation complète, et
#   ce dépôt a mesuré le prix d'une compilation concurrente à un run E2E (23 rouges concentrés
#   dans un sous-système, tous faux, cause réelle un épuisement de ressources). Le script vérifie
#   lui-même le compte de conteneurs et REFUSE de démarrer au-delà de la base de dev.
#
# usage :
#   Tools/sonde-isolation-editeurs.sh --avant     # empreinte, à prendre AVANT de donner le focus
#   Tools/sonde-isolation-editeurs.sh --apres     # empreinte + VERDICT (exige la preuve côté B)
#   Tools/sonde-isolation-editeurs.sh --attendre  # boucle jusqu'à ce que B recompile, puis verdict
set -uo pipefail

A="${A_PROJET:-/home/erutheone/project/mafia-builder-city-clean}"
B="${B_PROJET:-/home/erutheone/project/mafia-unity-B}"
ETAT="${ETAT_FICHIER:-$B/Tools/.sonde-isolation-etat}"
LOG_B="${LOG_B:-$HOME/.config/unity3d/Editor.log}"
BASE_DEV=7

empreinte() { # $1 = racine projet
  local d="$1/Library/ScriptAssemblies"
  [[ -d "$d" ]] || { echo "0 0 0"; return; }
  local mt n somme
  mt=$(stat -c %Y "$d")
  n=$(ls "$d"/*.dll 2>/dev/null | wc -l)
  somme=$(stat -c %Y "$d"/*.dll 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo 0)
  echo "$mt $n $somme"
}

garde_machine() {
  local c
  c=$(docker ps -q 2>/dev/null | wc -l)
  if [[ "$c" -gt "$BASE_DEV" ]]; then
    echo "⛔ $c conteneurs (base de dev = $BASE_DEV) : un gate tourne."
    echo "   Le retour de focus déclencherait une compilation DANS ce run — 23 faux rouges déjà"
    echo "   payés ici pour cette raison exacte. Sonde refusée."
    return 1
  fi
  echo "machine : $c conteneurs, charge $(cut -d' ' -f1 /proc/loadavg) — OK"
  return 0
}

case "${1:---apres}" in
  --avant)
    garde_machine || exit 2
    read -r amt an asom <<< "$(empreinte "$A")"
    read -r bmt bn bsom <<< "$(empreinte "$B")"
    printf 'A_MT=%s\nA_N=%s\nA_SOM=%s\nB_MT=%s\nB_N=%s\nB_SOM=%s\nLOG_B_SZ=%s\nPRISE=%s\n' \
      "$amt" "$an" "$asom" "$bmt" "$bn" "$bsom" "$(stat -c %s "$LOG_B" 2>/dev/null || echo 0)" \
      "$(date '+%Y-%m-%d %H:%M:%S')" > "$ETAT"
    echo "empreinte AVANT écrite dans $ETAT :"
    cat "$ETAT"
    echo
    echo "⇒ DONNER MAINTENANT LE FOCUS à la fenêtre Unity de B ($B), puis relancer avec --apres."
    ;;

  --attendre|--apres)
    [[ -f "$ETAT" ]] || { echo "aucune empreinte AVANT : lancer --avant d'abord"; exit 2; }
    # shellcheck disable=SC1090
    source "$ETAT"
    if [[ "${1}" == "--attendre" ]]; then
      echo "attente de la recompilation de B (au retour de focus)…"
      for _ in $(seq 1 120); do
        read -r bmt _ bsom <<< "$(empreinte "$B")"
        [[ "$bmt" != "$B_MT" || "$bsom" != "$B_SOM" ]] && break
        sleep 5
      done
    fi
    read -r amt an asom <<< "$(empreinte "$A")"
    read -r bmt bn bsom <<< "$(empreinte "$B")"

    echo "=== B (celui qui devait recompiler) ==="
    echo "  mtime : $B_MT → $bmt   |   somme dll : $B_SOM → $bsom   ($bn dll)"
    echo "=== A (celui qui ne doit RIEN voir) ==="
    echo "  mtime : $A_MT → $amt   |   somme dll : $A_SOM → $asom   ($an dll, était $A_N)"
    echo

    # ⛔ LE CONTRÔLE POSITIF, ET IL EST BLOQUANT. Sans preuve que B a recompilé, tout verdict
    # sur A est vide — c'est l'erreur exacte commise à 22:25.
    if [[ "$bmt" == "$B_MT" && "$bsom" == "$B_SOM" ]]; then
      echo "✗ CONTRÔLE POSITIF ÉCHOUÉ : B n'a PAS recompilé."
      echo "  ⇒ AUCUN VERDICT. « A inchangé » ne prouverait rien : l'événement n'a pas eu lieu."
      echo "  ⇒ Donner le focus à la fenêtre Unity de B, puis relancer."
      exit 1
    fi
    echo "✓ contrôle positif : B a recompilé (l'événement a bien eu lieu)."

    if [[ "$an" != "$A_N" ]]; then
      echo "⚠️ le NOMBRE de dll de A a changé ($A_N → $an) : la somme des mtimes n'est plus"
      echo "   comparable terme à terme. Verdict SUSPENDU — enquêter avant de conclure."
      exit 3
    fi

    if [[ "$amt" == "$A_MT" && "$asom" == "$A_SOM" ]]; then
      echo "✓ VERDICT : ISOLATION CONFIRMÉE — B a recompilé, A n'a pas bougé d'un octet."
      exit 0
    fi
    echo "✗ VERDICT : LES DEUX ÉDITEURS NE SONT PAS ISOLÉS — A a recompilé aussi."
    echo "  ⇒ Arrêter le travail à deux éditeurs et le remonter : le dispositif est faux."
    exit 4
    ;;
  *)
    echo "usage: $0 [--avant|--apres|--attendre]"; exit 2;;
esac
