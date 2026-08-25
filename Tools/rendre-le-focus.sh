#!/usr/bin/env bash
# Rend le focus à la fenêtre que l'user utilisait, quand Unity le lui vole.
#
# ⛔ POURQUOI ÇA EXISTE. Unity remonte sa propre fenêtre à l'entrée en Play Mode, et un run de
# tests PlayMode en passe par là. Mesuré : ce n'est PAS le plugin MCP (il ne fait que LIRE
# `isApplicationActive` ; ses seuls `Focus()` visent sa propre fenêtre et l'utilitaire de
# capture), ce n'est PAS la Game View (`enterPlayModeBehavior` est à `PlayUnfocused`,
# `maximizeOnPlay` à False), et ce n'est pas la politique GNOME (`focus-new-windows` est déjà
# à `strict` — mais elle ne gouverne que les fenêtres NEUVES, pas une fenêtre existante qui
# se remonte via XSetInputFocus, ce qui contourne le gestionnaire).
#   ⇒ Rien, du côté Unity, ne permet de l'empêcher. On ne l'empêche donc pas : on le RÉPARE.
#
# Il ne se bat jamais avec l'user : il ne rend le focus que pendant `DUREE` secondes après le
# lancement d'un run, et seulement si la fenêtre volée est bien Unity.
set -u
export DISPLAY="${DISPLAY:-:0}"
DUREE="${1:-90}"

PRECEDENTE="$(xdotool getactivewindow 2>/dev/null || true)"
[ -z "$PRECEDENTE" ] && { echo "aucune fenêtre active — rien à protéger"; exit 0; }
NOM="$(xdotool getwindowname "$PRECEDENTE" 2>/dev/null || echo '?')"
echo "fenêtre protégée : $PRECEDENTE — $NOM"

FIN=$(( $(date +%s) + DUREE ))
RENDUS=0
while [ "$(date +%s)" -lt "$FIN" ]; do
    ACT="$(xdotool getactivewindow 2>/dev/null || true)"
    if [ -n "$ACT" ] && [ "$ACT" != "$PRECEDENTE" ]; then
        CLASSE="$(xdotool getwindowclassname "$ACT" 2>/dev/null || echo '')"
        case "$CLASSE" in
            *[Uu]nity*)
                # la fenêtre protégée existe-t-elle encore ?
                if xdotool getwindowname "$PRECEDENTE" >/dev/null 2>&1; then
                    xdotool windowactivate "$PRECEDENTE" 2>/dev/null && RENDUS=$((RENDUS+1))
                fi
                ;;
        esac
    fi
    sleep 0.4
done
echo "focus rendu $RENDUS fois en ${DUREE}s"
