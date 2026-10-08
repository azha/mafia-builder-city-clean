#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""38 — l'EN des 15 clés `reglages.bloc.*` de ⑲ : les 14 de CLIENT-2 `19ddc253` + « Rouvrir le coffre » (tranché par f2), commande du 23/09
(« 37 » était pris par la table de ②).
Le fr est celui du commit (lu, pas recopié de la commande) ; le STATUT est lu aux registres :
- ratifié : la porte « le coffre », série 6 cadres 95-97, ratifiée par délégation le 02/09 (`front.md` l.22) ;
- proposé : l'atelier ; littéral du client : `SettingsScreenController.cs`, sans source ratifiée.
D17 : le fr livré porte l'espace INSÉCABLE avant « : » (U+00A0) et dans « » (U+00A0) — la clé ne change pas (le slug ignore la ponctuation) ;
⚠️ le littéral du client porte des espaces ordinaires : à aligner chez lui (son repli s'affiche tant que la clé n'est pas servie).
Contrôles : clé = `reglages.bloc.` + slug(fr) ; aucune `'` droite (D10) ; D17 ; en ≠ fr ; une clé déjà servie l'est avec ces mots ; l'en de
`on_vous_explique_encore` et de son sous-titre = celui de 36 (mêmes mots ratifiés, même anglais).
Sortie : `38-reglages-bloc-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-38-reglages-bloc.py"""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); NB = ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
R95 = 'Profil série 6, cadres 95-96 (ratifiés par délégation)'; R97 = 'Profil série 6, cadre 97 (ratifié par délégation)'
L = [
 ('La langue de la maison', 'The house language', 'RATIFIÉ', R95),
 ('Le jeu', 'The game', 'RATIFIÉ', 'Profil série 6, cadres 95-97 : le tiroir'),
 ('On vous explique encore', 'Keep explaining', 'RATIFIÉ', R95 + ' — même en que 36'),
 ('décochez le jour où vous n’avez plus besoin qu’on vous tienne la main', 'untick it the day you no longer need your hand held', 'RATIFIÉ', R95 + ' — même en que 36'),
 ('Dire mes prix au marché', 'Share my prices with the market', 'RATIFIÉ', R97),
 ('sans ça, le marché de région ne vous dit rien non plus', 'without it, the regional market tells you nothing either', 'RATIFIÉ', R97),
 ('Le coffre est fermé.', 'The vault is closed.', 'PROPOSÉ', 'l’état après « Fermer le coffre » (aucune maquette de l’après : voir la réponse Q2 du 23/09)'),
 ('Rouvrir le coffre', 'Reopen the vault', 'PROPOSÉ', 'tranché par f2 le 23/09 : la forme minimale de l’entrée (le geste qui rejoue le lancement après « Le coffre est fermé. ») ; aucune maquette (Q2) ; pas encore dans le client'),
 ('Fermer le coffre', 'Close the vault', 'RATIFIÉ', R95 + ' (« FERMER LE COFFRE »)'),
 ('cette session seulement', 'this session only', 'RATIFIÉ', R95),
 ('Ce qui ne s’ouvre pas encore', 'What doesn’t open yet', 'littéral du client', '`SettingsScreenController.cs` (section)'),
 ('Fermer partout', 'Close everywhere', 'RATIFIÉ', R97 + ' (« FERMER PARTOUT », L11)'),
 (f'pas encore{NB}: toutes les sessions ouvertes n’ont pas encore de guichet', 'not yet: there’s no counter yet for every open session',
  'littéral du client', 'la raison éteinte de L11 ; D17 : insécable avant « : »'),
 ('Tout effacer', 'Wipe everything', 'RATIFIÉ', R97 + ' (« TOUT EFFACER », L10)'),
 (f'pas encore{NB}: «{NB}et ne plus jamais revenir{NB}» n’a pas encore de guichet', 'not yet: “and never come back” has no counter yet',
  'littéral du client', 'la raison éteinte de L10 ; cite le sous-titre ratifié du 97 ; D17 : insécables avant « : » et dans « »'),
]
st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                    capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')
T36 = {l.split('\t')[1]: l.split('\t')[2] for l in open(os.path.join(ICI, '36-tutoriel-ecran-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:] if l}
src = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-unity-F'), 'show', '19ddc253:Assets/Scripts/Account/Settings/SettingsScreenController.cs'],
                     capture_output=True, text=True).stdout
d, out = [], ['\t'.join(['clé', 'fr', 'en', 'statut', 'source'])]
for fr, en, statut, source in L:
    cle = 'reglages.bloc.' + slug(fr)
    lit = fr.replace(NB, ' ')
    if fr != 'Rouvrir le coffre' and f'Lib("{lit}")' not in src and f'Lib("{lit.replace("«", "« ").replace("»", " »").replace("  ", " ")}")' not in src:
        d.append(f'{cle} : le fr n’est pas le littéral de 19ddc253')
    if "'" in fr + en: d.append(f'{cle} : apostrophe droite')
    if re.search(r' [:;!?»]|« ', fr): d.append(f'{cle} : D17')
    if not en or en == fr: d.append(f'{cle} : en')
    if cle in FR and (FR[cle], EN.get(cle)) != (fr, en): d.append(f'{cle} : déjà servie avec d’autres mots')
    if fr in T36 and T36[fr] != en: d.append(f'{cle} : l’en diffère de 36 ({T36[fr]!r})')
    out.append('\t'.join([cle, fr, en, statut, source]))
open(os.path.join(ICI, '38-reglages-bloc-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{len(L)} clés · ratifiées {sum(x[2] == "RATIFIÉ" for x in L)} · proposée {sum(x[2] == "PROPOSÉ" for x in L)} · littéraux du client '
      f'{sum(x[2] == "littéral du client" for x in L)} · déjà servies {sum(("reglages.bloc." + slug(x[0])) in FR for x in L)}')
[print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
