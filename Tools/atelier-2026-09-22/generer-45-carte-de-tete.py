#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""45 — ④ la carte de tête (`hl_card`) : une forme HONNÊTE (commande f2 du 23/09).
Mesure du back (`hl-card-types.ts:99-104`) : les options d'une carte sont DESCRIPTIVES (« descriptive flavor content … commit/skip are the only
2 real actions ») ; `POST /v1/session/hl-card/:id/commit` ENREGISTRE la décision de session, sans effet sur le monde ; `…/skip` la laisse.
La maquette ④ cadre 1 faisait des options des boutons d'action (« METTRE EN RÉPARATION / LAISSER EN L’ÉTAT ») : une promesse fausse.
⚠️ « Conseil : … » (suggestion de f2) présumerait que l'option 1 est RECOMMANDÉE : aucun champ servi ne le dit (les options sont une liste
   ordonnée par le fournisseur, sans marque de recommandation). Forme proposée, neutre : « Ce qu’on peut faire », puis les options servies
   (`hl.option.*`) en TEXTE, puis deux boutons honnêtes.
Clés : domaine `accueil`, rôle `carte` — celui des mots servis de la carte de ④ (`accueil.carte.aucune_decision_en_attente`, `…rien_a_signaler`).
Contrôles : clé = slug ; ’ (D10) ; D17 ; en ≠ fr ; D13 (épicène) ; non encore servies.
Sortie : `45-carte-de-tete-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-45-carte-de-tete.py"""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
L = [
 ('Ce qu’on peut faire', 'What can be done', 'PROPOSÉ', 'le surtitre des options servies `hl.option.*`, montrées en TEXTE (pas en boutons)'),
 ('Prendre acte', 'Noted', 'PROPOSÉ', '`POST /v1/session/hl-card/:id/commit` : enregistre la décision de session ; n’agit pas sur le monde'),
 ('Pas maintenant', 'Not now', 'PROPOSÉ', '`POST /v1/session/hl-card/:id/skip`'),
 ('prendre acte n’agit pas à votre place', 'noting it doesn’t act for you', 'PROPOSÉ (facultatif)', 'la ligne d’honnêteté sous « Prendre acte » : l’effet est nul aujourd’hui'),
]
# ADDENDUM (f2, 23/09) — ④ cadre 3, « la file sous pression » : le client câblait « Plusieurs attendent encore » sur `exceptions.file.attendent_encore`,
# un pluriel ICU qui EXIGE un compte ; le back ne sert que des BANDES (`queue_pressure_band`, `backlog_badge` booléen) et le client ne voit que 3
# cartes au plus : un nombre serait faux. Deux phrases SANS compte, domaine `accueil`, rôle `file` (celui du servi `accueil.file.aucune_exception_en_attente`).
ADD = [
 ('Plusieurs attendent encore', 'Several are still waiting', 'PROPOSÉ (addendum)', '`queue_pressure_band` = saturated — sans compte (remplace le ICU `exceptions.file.attendent_encore` sur ④)'),
 ('d’autres attendent au-delà de ce que la file montre', 'others are waiting beyond what the queue shows', 'PROPOSÉ (addendum)',
  '`backlog_badge` = vrai — la file ne montre que 3 cartes (mot de la maquette ④ cadre 3, déjà dessiné)'),
]
st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
_d = st.index('export const FR_MESSAGES')
FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'(accueil\.(?:carte|file)\.[a-z_]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[_d:st.index('\n};', _d)], re.M)}
FR = set(FRV)   # une clé servie DEPUIS la table est conforme si ses mots sont les nôtres (règle de 28, 30, 31, 37)
d, out = [], ['\t'.join(['clé', 'fr', 'en', 'statut', 'pour'])]
for fr, en, statut, pour in L:
    cle = 'accueil.carte.' + slug(fr)
    if cle in FR and FRV[cle] != fr: d.append(f'{cle} : servie avec d’autres mots ({FRV[cle]!r})')
    if "'" in fr + en: d.append(f'{cle} : apostrophe droite')
    if re.search(r' [:;!?»]|« ', fr): d.append(f'{cle} : D17')
    if re.search(r'\b(prêt|seul|sûr)\b', fr): d.append(f'{cle} : D13')
    out.append('\t'.join([cle, fr, en, statut, pour]))
for fr, en, statut, pour in ADD:
    cle = 'accueil.file.' + slug(fr)
    if cle in FR and FRV[cle] != fr: d.append(f'{cle} : servie avec d’autres mots')
    if "'" in fr + en: d.append(f'{cle} : apostrophe droite')
    if re.search(r'\{|plural', fr): d.append(f'{cle} : un compte (ICU) — interdit ici')
    out.append('\t'.join([cle, fr, en, statut, pour]))
open(os.path.join(ICI, '45-carte-de-tete-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'somme : {len(out) - 1} lignes = {len(L)} (carte) + {len(ADD)} (addendum) ; clés distinctes {len(set(l.split(chr(9))[0] for l in out[1:]))}')
print(f'{len(L)} clés'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
