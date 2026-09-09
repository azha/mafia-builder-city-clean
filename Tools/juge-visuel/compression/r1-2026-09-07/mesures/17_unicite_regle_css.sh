#!/bin/sh
# 17 — la regle CSS citee par M1 et B2 est-elle UNIQUE dans la source ?
#   Le fichier porte TROIS blocs <style> (15082 + 358369 + 148061 octets) : une seconde
#   definition plus bas ecraserait la premiere et rendrait ma citation fausse.
#   Tous les comptes sont pris dans un $( ) : la couche d'affichage du proxy fausse
#   tout compte lu au terminal (socle).
#   CONTROLE POSITIF du motif : 'font-family:Georgia,serif' doit rendre 48, pas 0
#   (un motif qui rend zero pour la mauvaise raison est le zero le plus credible qui soit).
cd /home/erutheone/project/atelier3d-mafia || exit 1
echo "  '.jetons-lib.lecture{' : $(grep -o -F '.jetons-lib.lecture{' ecrans-brennar-4.html | wc -l)"
echo "  '.lecture{'            : $(grep -o -E '\.lecture\{'          ecrans-brennar-4.html | wc -l)"
echo "  CONTROLE + 'font-family:Georgia,serif' : $(grep -o -F 'font-family:Georgia,serif' ecrans-brennar-4.html | wc -l)"
echo "  corps, dedupliques :"
grep -o -E "[^{};,>]*\.lecture[^{]{0,10}\{[^}]*\}" ecrans-brennar-4.html | sort -u | sed 's/^/    /'
