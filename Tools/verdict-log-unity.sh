#!/usr/bin/env bash
# Le VERDICT d'un run Unity batchmode, lu dans son journal — fonction PURE, sans effet de bord,
# sourçable. Séparée de `run-unity-check.sh` pour une seule raison : elle devient essayable sur des
# journaux SYNTHÉTIQUES, donc sans la porte Unity et sans les 15 minutes d'un run. Le harnais la
# source ; `verdict-controle.sh` l'essaie. Les deux appellent LE MÊME code — jamais une copie, sinon
# le contrôle et son sujet dérivent (leçon payée le 2026-09-07 sur la porte, où la fonction était
# juste et le site d'appel faux).
#
# ⛔⛔ CE QUE ÇA FERME — mesuré le 2026-09-07 : `run-unity-check.sh -executeMethod <classe absente>`
#    rendait **RC=0** sur un run qui N'A JAMAIS DÉMARRÉ. Le mécanisme, et il tient en une phrase :
#    sur le chemin `-executeMethod`, le harnais NE PASSE PAS `-quit` (à dessein — un `-quit`
#    inconditionnel couperait un run de test asynchrone). Mais son chien de garde accordait `RC=0`
#    dès qu'il voyait `Internal_EditorApplicationQuit`, sous le commentaire « compile atteint son
#    -quit : pas d'erreur CS ⇒ succès ». **Cette phrase est vraie sur le chemin compile et FAUSSE
#    sur le chemin executeMethod**, où aucun `-quit` n'a été passé : le quit observé n'y est pas la
#    preuve d'un travail fini, c'est l'abandon d'Unity.
#    ⇒ Une seule branche servait DEUX RÉGIMES sans savoir dans lequel elle était. C'est la forme
#      « garde sur les PARAMÈTRES de l'effet » : elle lisait « l'éditeur a quitté », pas « le
#      travail a eu lieu ».
#
# ⚠️ POURQUOI DÉTECTER L'ABANDON PAR SON PRÉFIXE ET NON PAR SES MOTIFS. Les motifs d'abandon ont
#    été énumérés dans le binaire de l'éditeur (6000.4.6f1), pas devinés :
#      executeMethod class '%s' could not be found.
#      executeMethod method '%s' in class '%s' could not be found.
#      executeMethod method %s has %d arguments. Only methods with 0 arguments are supported
#      executeMethod async method %s has return type '%s'. …
#      executeMethod must have format ClassName.MethodName
#      Scripts have compiler errors.
#    Ils sont NOMBREUX, et cette liste est datée du jour où je l'ai lue. Le préfixe
#    `Aborting batchmode due to failure:` est en revanche une constante UNIQUE de la table de
#    chaînes, commune à tous. ⇒ On mesure la PROPRIÉTÉ (« l'éditeur a abandonné »), on ne CLASSE
#    pas le motif : un instrument qui doit classer avant de mesurer peut se tromper de classe.
# ⚠️ ANCRÉ EN DÉBUT DE LIGNE (`^`) : le journal porte AUSSI la sortie des tests, donc un test qui
#    imprimerait cette phrase la déclencherait. Le contrôle et son sujet partagent le support ;
#    l'ancre est ce qui les sépare, et la 9ᵉ assertion du contrôle l'atteste.
#
# ⚠️ ADDITIF STRICT — aucun code de sortie existant n'est modifié :
#      0   run de test vert (marqueur `failed=0`)               ← inchangé
#      1   tests rouges, ou `error CS` (garde de l'appelant)     ← inchangé
#      124 tué par `timeout`                                     ← inchangé
#      >128 signal externe                                       ← inchangé
#      3   NEUF : l'éditeur a abandonné, ou le chemin `-executeMethod` s'est terminé SANS son
#          marqueur de travail. Ce cas rendait 0 ; il ne rendait aucun autre code.
#    Un code déjà non nul n'est JAMAIS écrasé — on ne promeut qu'un 0, pour ne pas perdre un
#    diagnostic plus précis (124 dit « délai », 3 dirait seulement « pas fini »).
RC_ABANDON=3

# ⛔⛔ MESURÉ SUR UN VRAI ABANDON (run réel, 2026-09-07 02:20) : `Aborting batchmode due to
#    failure:` **N'EST PAS DANS LE `-logFile`** — 0 occurrence, ancrée ou non. Unity l'écrit sur la
#    CONSOLE ; le journal ne porte que la raison nue (`executeMethod method '…' could not be
#    found.`). ⇒ La détection ci-dessous, écrite sur le seul journal, **ne pouvait pas se
#    déclencher** : elle était DÉCORATIVE, et un dispositif inerte ressemble trait pour trait à un
#    dispositif appliqué. Seule la branche structurelle (`-executeMethod` sans marqueur de travail)
#    mordait — c'est elle qui a rendu le RC=3 mesuré.
# ⇒ D'où le 5ᵉ paramètre : le fichier où le harnais CAPTURE la console. La détection y regarde
#   aussi, et couvre alors les six motifs au lieu d'aucun. Absent ⇒ on n'en tient pas compte, donc
#   tout appelant existant garde son comportement.
# ⚠️ La capture se fait par une REDIRECTION, jamais par un pipe : `cmd | tee` rend le code de
#    sortie de `tee`, et ce harnais existe précisément pour ne pas le perdre.
# verdict_log <journal> <executeMethod:0|1> <chien_de_garde:0|1> <rc_entrant> [console] → rc sortant
verdict_log(){
  local f="$1" em="$2" wd="$3" rc="$4" cons="${5:-}"
  if [[ "$wd" == 1 ]]; then
    if grep -qE 'MafiaCI: RunPlayModeTests finished' "$f" 2>/dev/null; then
      if grep -qE 'RunPlayModeTests finished — passed=[0-9]+ failed=0( |$)' "$f" 2>/dev/null; then rc=0; else rc=1; fi
    elif [[ "$em" == 1 ]]; then
      # ⛔ LE CAS QUI RENDAIT 0. `-executeMethod` demandé, l'éditeur a quitté, et AUCUNE trace que la
      #    méthode ait fini son travail. Comme `-quit` n'a jamais été passé sur ce chemin, ce quit
      #    n'est pas un succès de compilation : c'est un abandon, ou une méthode morte avant sa fin.
      rc=$RC_ABANDON
    else
      rc=0   # chemin compile nu : `-quit` A été passé, le quit atteste bien qu'il a été atteint
    fi
  fi
  if [[ "$rc" == 0 ]]; then
    if grep -qE '^Aborting batchmode due to failure:' "$f" 2>/dev/null; then rc=$RC_ABANDON
    elif [[ -n "$cons" ]] && grep -qE '^Aborting batchmode due to failure:' "$cons" 2>/dev/null; then rc=$RC_ABANDON
    fi
  fi
  echo "$rc"
}

# La ligne d'abandon, pour la RAPPORTER à l'appelant : un code de sortie dit qu'il y a un défaut,
# jamais lequel. (Le harnais imprime déjà ses lignes `error CS` de la même façon.)
# ⚠️ DEUX LIGNES, pas une : Unity imprime le préfixe puis la RAISON sur la ligne SUIVANTE. Un
#    `grep` du seul préfixe rend « l'éditeur a abandonné » sans jamais dire pourquoi — un code de
#    sortie dit qu'il y a un défaut, jamais lequel, et c'est aussi vrai d'un message tronqué.
motif_abandon(){
  local f
  for f in "$@"; do
    [[ -n "$f" && -f "$f" ]] || continue
    grep -A2 -E '^Aborting batchmode due to failure:' "$f" 2>/dev/null | head -6
  done
}
