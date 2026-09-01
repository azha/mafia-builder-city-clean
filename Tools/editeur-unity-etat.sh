#!/usr/bin/env bash
# Répond à UNE question : un ÉDITEUR Unity tourne-t-il, et sur quel arbre ?
#
# ⛔ POURQUOI CE SCRIPT EXISTE (payé deux fois le 2026-08-31/09-01, sur le MÊME paragraphe).
#    J'ai écrit deux raisons de blocage successives, toutes deux confortables et toutes deux FAUSSES :
#      (1) « le serveur MCP refuse la connexion »  -> vrai de MON point de terminaison, faux de l'éditeur
#      (2) « l'éditeur est piloté par une autre session » -> j'avais lu `mcp_http_8081.pid`, VIVANT, et
#          écoutant. Mais ce pid nomme `/usr/bin/python3.12` exécutant le PONT mcp-for-unity.
#    ⇒ **UN FICHIER .pid ATTESTE QU'UN PROCESSUS EXISTE, JAMAIS L'IDENTITÉ DE CE QU'IL SERT.**
#    Un pont sans éditeur derrière écoute, répond, et ne pilote rien. La vérification était
#    rigoureuse et portait sur le mauvais objet.
#
# DEUX ORACLES STRUCTURELLEMENT INDÉPENDANTS, parce qu'un seul chemin de mesure ne suffit pas :
#   (A) les PROCESSUS, par /proc/<pid>/exe — jamais `pgrep -f`, qui matche sa propre ligne de
#       commande et rend un PID pour un gate qui ne tourne pas (piège déjà au socle).
#   (B) le VERROU de projet : un éditeur qui DÉTIENT un projet pose `Temp/UnityLockfile`.
#   Les deux doivent concorder ; s'ils divergent, le script le DIT au lieu de choisir.
#
# ⚠️ CONTRÔLE POSITIF INTÉGRÉ : (A) doit trouver des processus Unity (le Hub en est un). S'il en
#    trouve ZÉRO, il est aveugle et son « aucun éditeur » ne prouve rien — cas distingué, sortie 2.

set -u
ARBRES=("$HOME/project/mafia-builder-city-clean" "$HOME/project/mafia-unity-B")

echo "== (A) processus, via /proc/<pid>/exe =="
tous=0; editeurs=0; moi=$$
for p in /proc/[0-9]*; do
  pid=${p#/proc/}; [ "$pid" = "$moi" ] && continue
  exe=$(readlink -f "$p/exe" 2>/dev/null) || continue
  case "$exe" in *[Uu]nity*) tous=$((tous+1)) ;; *) continue ;; esac
  # un ÉDITEUR est le binaire `Unity` lui-même — ni le Hub, ni le client de licence, ni un pont
  case "$exe" in
    */Editor/Unity|*/Unity)
      editeurs=$((editeurs+1))
      arg=$(tr '\0' '\n' < "$p/cmdline" 2>/dev/null | grep -A1 -x -- '-projectPath' | tail -1)
      echo "   ÉDITEUR pid=$pid  projet=${arg:-<non déclaré>}" ;;
  esac
done
echo "   processus Unity au total : $tous  ·  éditeurs : $editeurs"
if [ "$tous" -eq 0 ]; then
  echo "⛔ CONTRÔLE POSITIF MUET : aucun processus Unity du tout, pas même le Hub."
  echo "   Ce balayage ne voit rien — son « aucun éditeur » ne prouve RIEN. Sortie 2."
  exit 2
fi

echo "== (B) verrous de projet =="
verrous=0
for d in "${ARBRES[@]}"; do
  if [ -f "$d/Temp/UnityLockfile" ]; then
    verrous=$((verrous+1)); echo "   VERROU  $d  ($(stat -c %y "$d/Temp/UnityLockfile"))"
  else
    echo "   libre   $d"
  fi
done

echo "== verdict =="
if [ "$editeurs" -ne "$verrous" ]; then
  echo "⚠️  LES DEUX ORACLES DIVERGENT : $editeurs éditeur(s) vu(s), $verrous verrou(s) posé(s)."
  echo "   Ne pas trancher depuis ce script — aller lire. Sortie 3."
  exit 3
fi
if [ "$editeurs" -eq 0 ]; then
  echo "✅ AUCUN éditeur ne tourne, AUCUN verrou : le batchmode est possible sur les deux arbres."
  echo "   ⚠️ Un pont MCP peut écouter quand même — il ne pilote rien. Ne pas le confondre."
  exit 0
fi
echo "⛔ $editeurs éditeur(s) actif(s) — un seul pilote : NE PAS lancer de run, demander le créneau."
exit 1
