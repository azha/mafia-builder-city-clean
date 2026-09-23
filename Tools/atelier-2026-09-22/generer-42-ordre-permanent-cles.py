#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""42 — les clés EXACTES des mots de `41-…` §3-§4 (⑦, l'ordre permanent), que CLIENT-1 prendra telles quelles et que le back servira
(commande f2 du 23/09). Clé = `Libelle.De(domaine, rôle, fr)` = `famille.<rôle>.` + slug(fr) (`Libelle.Slug` recopié).
Domaine `famille`, rôles ALIGNÉS sur ceux que le client emploie déjà sur ⑦ (cumul `6bb7f837`) :
  `ecran` (le `Lib()` de `LieutenantScreenController.cs:3912-3913`) · `ordre` (freshness, `FamilleLabels.cs:150-151`) · `refus`
  (`MotDuRefus`, l.3226 : « aucun ordre en cours », mot de f2) ; rôles NEUFS : `instruction` (Collecte · Blanchir · Surveiller), `lapse`
  (les 3 `lapse_action`), `fiabilite` (`cue_bands`).
Les refus prennent la forme du mot de f2 déjà au client (minuscule, sans point) : 42 REMPLACE les formes de 41 §4 pour les refus.
Contrôles : clé = slug ; aucune `'` droite (D10) ; D17 (insécable U+00A0 avant « : ») ; en ≠ fr ; une clé déjà servie l'est avec ces mots.
Sortie : `42-ordre-permanent-cles-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-42-ordre-permanent-cles.py"""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); NB = ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
S1 = 'RATIFIÉ — série 1, « Lieutenant — fiche + formulaire » (ecrans-brennar.html l.~285)'
L = [  # (rôle, fr, en, statut, pour)
 ('ecran', 'Donner un ordre', 'Give an order', 'PROPOSÉ', 'le geste sur la ligne « Ordre permanent · aucun ordre » (freshness = NONE)'),
 ('instruction', 'Collecte', 'Collection', S1, 'l’instruction (produit le `rule_source`)'),
 ('instruction', 'Blanchir', 'Launder', S1, 'idem'),
 ('instruction', 'Surveiller', 'Watch', S1, 'idem'),
 ('ecran', 'Cible', 'Target', S1, 'la condition du `rule_source`'),
 ('ecran', 'Et quand il expire', 'And when it expires', 'PROPOSÉ', 'le titre des 3 `lapse_action` (« il » = l’ordre)'),
 ('lapse', 'retour à la routine', 'back to routine', 'PROPOSÉ, épicène (D13)', '`lapse_action` = REVERT_DEFAULT'),
 ('lapse', 'l’ordre continue', 'the order keeps running', 'PROPOSÉ, épicène', '= HOLD_LAST'),
 ('lapse', 'on vous demande', 'you get asked', 'PROPOSÉ, épicène', '= ESCALATE_TO_PLAYER'),
 ('ecran', 'pour une durée fixe', 'for a fixed term', 'PROPOSÉ', 'la durée est FIXE au back (`duration_class` ignoré en M2) : pas de glissière'),
 ('ecran', 'Signer l’ordre', 'Sign the order', S1 + ' (« SIGNER L’ORDRE »)', '`POST /v1/lieutenants/:id/standing-order {rule_source, lapse_action}`'),
 ('ordre', 'en cours', 'in force', 'PROPOSÉ', 'freshness = FRESH (NONE « aucun ordre » et EXPIRES_SOON « expire bientôt » sont déjà au client)'),
 ('ordre', 'échu', 'lapsed', 'PROPOSÉ', 'freshness = EXPIRED (ne se voit qu’avec HOLD_LAST)'),
 ('refus', 'trop tôt pour refaire ce geste', 'too soon to do that again', 'PROPOSÉ', '409 cooldown (par geste+repère pour le signal, par décision pour l’ordre)'),
 ('refus', 'aucun ordre en cours', 'no order in force', 'mot de f2 (23/09), déjà au client (`MotDuRefus`)', '409 « has no standing order to {kind} »'),
 ('refus', 'cet ordre n’a pas encore fait ses preuves', 'this order hasn’t proven itself yet', 'PROPOSÉ', '409 PROMOTE refusé (pas `promotion_suggested` ; client : « not flagged for promotion »)'),
 ('refus', f'un ordre est déjà en cours{NB}: renouvelez-le', 'an order is already in force: renew it', 'PROPOSÉ', '409 à l’émission, ordre actif (« RENEW it instead »)'),
 ('refus', 'ce geste n’est pas reconnu', 'that move isn’t recognised', 'PROPOSÉ', '422 geste ou repère invalide'),
 ('fiabilite', 'en sommeil', 'dormant', 'PROPOSÉ (même locution que ⑰ DORMANT)', '`cue_bands` = dormant'),
 ('fiabilite', 'à moitié fiable', 'partly reliable', 'PROPOSÉ', '= partial'),
 ('fiabilite', 'fiable', 'reliable', 'PROPOSÉ', '= reliable'),
 ('fiabilite', 'décisif', 'decisive', 'PROPOSÉ', '= dominant'),
]
st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                    capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')
d, out, cles = [], ['\t'.join(['clé', 'fr', 'en', 'statut', 'pour'])], []
for role, fr, en, statut, pour in L:
    cle = f'famille.{role}.{slug(fr)}'; cles.append(cle)
    if "'" in fr + en: d.append(f'{cle} : apostrophe droite')
    if re.search(r' [:;!?»]|« ', fr): d.append(f'{cle} : D17')
    if not en or en.lower() == fr.lower(): d.append(f'{cle} : en')
    if cle in FR and (FR[cle], EN.get(cle)) != (fr, en): d.append(f'{cle} : servie avec d’autres mots ({FR[cle]!r})')
    out.append('\t'.join([cle, fr, en, statut, pour]))
if len(set(cles)) != len(cles): d.append('deux lignes, une clé')
open(os.path.join(ICI, '42-ordre-permanent-cles-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{len(L)} clés · déjà servies : {sum(c in FR for c in cles)}'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
