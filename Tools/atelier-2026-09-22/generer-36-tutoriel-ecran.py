#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""36 — l'EN des 7 clés `tutoriel.ecran.*` de ㉕ (CLIENT-2 `049a863e`, commande f2 du 23/09). Le fr est celui de la commande ; le STATUT est lu
dans les registres, pas recopié de la commande :
- ratifié : série 2 cadre 31 (« Compris »), Profil série 6 cadres 95-96, par délégation le 02/09 (`front.md` l.22) ;
- littéral du client : `TutorialScreenController.cs`, sans clé, marqué proposé dans 33 ;
- proposé : l'atelier, 33 §4.
Contrôles : clé = `tutoriel.ecran.` + slug(fr) (`Libelle.Slug` recopié) ; aucune `'` droite (D10) ; aucune ponctuation haute après une espace
ordinaire (D17) ; en non vide et ≠ fr ; une clé déjà servie l'est avec ces mots.
Sortie : `36-tutoriel-ecran-2026-09-23.tsv` (clé · fr · en · statut · source). Usage : python3 Tools/atelier-2026-09-22/generer-36-tutoriel-ecran.py"""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
L = [  # (slug attendu par CLIENT-2, fr, en, statut, source)
 ('vous_avez_tout_vu', 'Vous avez tout vu.', 'You’ve seen it all.', 'littéral du client',
  '`TutorialScreenController.cs:167` ; ⚠️ à n’afficher que si `eligible_tutorial_ids` est vide (33 §4)'),
 ('rien_de_nouveau_pour_aujourd_hui', 'Rien de nouveau pour aujourd’hui.', 'Nothing new for today.', 'PROPOSÉ', 'atelier 33 §4 (`next_tutorial_id` null ≠ fini)'),
 ('vous_avez_demande_qu_on_vous_laisse_tranquille', 'Vous avez demandé qu’on vous laisse tranquille.', 'You asked to be left alone.',
  'littéral du client', '`TutorialScreenController.cs:156` ; maquette ㉕ cadre 3 (proposé)'),
 ('a_decouvrir', 'À découvrir', 'Next up', 'littéral du client', '`TutorialScreenController.cs:174` ; maquette ㉕ cadre 2 (proposé)'),
 ('compris', 'Compris', 'Got it', 'RATIFIÉ', 'série 2 cadre 31 (ratifiée par délégation le 02/09) — D14'),
 ('on_vous_explique_encore', 'On vous explique encore', 'Keep explaining', 'RATIFIÉ', 'Profil série 6 cadres 95-96 (ratifiés par délégation) — D14'),
 ('decochez_le_jour_ou_vous_n_avez_plus_besoin_qu_on_vous_tienne_la_main',
  'décochez le jour où vous n’avez plus besoin qu’on vous tienne la main', 'untick it the day you no longer need your hand held',
  'RATIFIÉ', 'Profil série 6 cadres 95-96 (ratifiés par délégation) — D14'),
 # 24/09 (f2, maquettes à ratifier) : les mots de la maquette ㉕ qu'aucune table ne portait — PROPOSÉS ; « =x » = clé NOMMÉE (ICU)
 ('la_premiere_fois', 'La première fois', 'First time', 'PROPOSÉ', 'atelier 33 §6 ; maquette ㉕ : surtitre de la bulle (cadres 0-1, en capitales) et titre de la page (2-3)'),
 ('ne_plus_rien_me_montrer', 'Ne plus rien me montrer', 'Show me nothing more', 'PROPOSÉ (ouvert)',
  'atelier 33 §7.2 : second geste de la bulle (cadres 0-1) — le client a une BASCULE à la place (049a863e) : ARBITRAGE à la ratification'),
 ('=vues', '{n, plural, one {vue} other {vues}}', '{n, plural, one {seen} other {seen}}', 'PROPOSÉ',
  'maquette ㉕ cadre 2 : libellé SOUS le nombre (`shown_tutorial_ids`) — accordé au compte, sans « # » (le nombre est dessiné à part) ; clé NOMMÉE'),
 ('a_venir', 'à venir', 'to come', 'PROPOSÉ', 'maquette ㉕ cadre 2 : libellé sous le nombre (`eligible_tutorial_ids` non vus)'),
]
st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                    capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')
d, out = [], ['\t'.join(['clé', 'fr', 'en', 'statut', 'source'])]
for s_, fr, en, statut, src in L:
    cle = 'tutoriel.ecran.' + (s_[1:] if s_.startswith('=') else slug(fr))
    if not s_.startswith('=') and slug(fr) != s_: d.append(f'{s_} : le slug du fr est {slug(fr)}')
    if "'" in fr + en: d.append(f'{cle} : apostrophe droite')
    if re.search(r' [:;!?»]|« ', fr): d.append(f'{cle} : ponctuation haute après une espace ordinaire (D17)')
    if not en or en == fr: d.append(f'{cle} : en')
    if cle in FR and (FR[cle], EN.get(cle)) != (fr, en): d.append(f'{cle} : déjà servie avec d’autres mots')
    out.append('\t'.join([cle, fr, en, statut, src]))
open(os.path.join(ICI, '36-tutoriel-ecran-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{len(L)} clés · {sum(c[3] == "RATIFIÉ" for c in L)} ratifiées, {sum(c[3] == "littéral du client" for c in L)} littéraux du client, '
      f'{sum(c[3] == "PROPOSÉ" for c in L)} proposée ; déjà servies : {sum(("tutoriel.ecran." + slug(c[1])) in FR for c in L)}')
[print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
