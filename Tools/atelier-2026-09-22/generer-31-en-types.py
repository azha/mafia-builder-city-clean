#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""31 — le mot EN du JOUEUR pour les 12 types du catalogue `building.type.*` (commande f2 du 23/09, après D12).
D12 tient (un mot par type, le catalogue fait foi) ; mais l'EN du catalogue sent l'identifiant (« Cash safehouse », « Dealer-spot front »,
« Distribution hub », « Specialized lab », « Front shop »). Pour chaque type : le fr servi, l'en servi (back HEAD), l'en PROPOSÉ, et la raison —
d'abord le mot que l'EN servi AILLEURS emploie déjà pour ce type (lignes de fiche, revue, filière), sinon le mot court du métier.
Dérivés : les formes à article de `30-…` v2 (Démolition `demolition.ecran.*`, Distribution `distribution.bloc.*`) en découlent ; `district.type_batiment.*`
(①) suit par la garde de relation du back.
Sortie : `31-en-types-batiment-2026-09-23.tsv` (clé · fr servi · en servi · en proposé · état · raison).
Usage : python3 Tools/atelier-2026-09-22/generer-31-en-types.py"""
import os, re, subprocess
ICI = os.path.dirname(os.path.abspath(__file__))
st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                    capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')

PROPOSE = {  # type → (en proposé, raison)
 'lab': ('Lab', 'déjà juste'),
 'specialized_lab': ('Specialist lab', '« specialized » est l’adjectif d’une fiche technique ; « specialist lab » est l’anglais courant — aucun usage servi ailleurs'),
 'stash': ('Stash', 'déjà juste'),
 'front_shop': ('Front', 'le mot du métier (« a front ») ; l’EN servi l’emploie déjà : `revue.phrase.j_ai_rapproche_les_comptes_de_la_facade` « the front’s books », « the front is pinned »'),
 'cash_safehouse': ('Safehouse', 'le mot de ① avant D12 ; l’EN servi l’emploie déjà pour la planque : `filiere.bloc.obtenir_une_planque` « Get a safehouse », `famille.ecran.batiment_cible_destination_planque`'),
 'dealer_spot_front': ('Corner', 'le coin de vente EST un corner (fr « coin ») ; l’EN servi l’emploie déjà : `revue.phrase.j_ai_fait_tourner_le_coin_de_vente` « the sales corner »'),
 'refinery': ('Refinery', 'déjà juste'),
 'grow_house': ('Grow house', 'déjà juste (le mot du métier)'),
 'distribution_hub': ('Hub', 'le mot de ① avant D12 ; l’EN servi l’emploie déjà : `building.row.taille_du_relais` « Hub size », `building.hub_tier.none` « No hub »'),
 'money_holding': ('Vault', 'déjà juste, et cohérent : `building.row.taille_de_la_banque` « Vault size », « No vault » ×3 ; « Bank » heurterait « North bank » / « South bank » (`carte.bloc.rive_*`)'),
 'press_house': ('Print shop', 'déjà juste (« Press » = les journaux, comme « presse »)'),
 'office': ('Agency', 'déjà juste'),
}
DERIVES = {  # type → (clé Démolition, clé Distribution) — `30-…` v2
 'lab': ('demolition.ecran.un_labo', 'distribution.bloc.le_labo'),
 'specialized_lab': ('demolition.ecran.un_labo_specialise', 'distribution.bloc.le_labo_specialise'),
 'stash': ('demolition.ecran.une_reserve', 'distribution.bloc.la_reserve'),
 'front_shop': ('demolition.ecran.un_commerce_ecran', 'distribution.bloc.le_commerce_ecran'),
 'cash_safehouse': ('demolition.ecran.une_planque', 'distribution.bloc.la_planque'),
 'dealer_spot_front': ('demolition.ecran.un_coin_de_vente', 'distribution.bloc.le_coin_de_vente'),
 'refinery': ('demolition.ecran.une_raffinerie', 'distribution.bloc.la_raffinerie'),
 'grow_house': ('demolition.ecran.une_serre', 'distribution.bloc.la_serre'),
 'distribution_hub': ('demolition.ecran.un_relais', 'distribution.bloc.le_relais'),
 'money_holding': ('demolition.ecran.une_banque', 'distribution.bloc.la_banque'),
 'press_house': ('demolition.ecran.une_imprimerie', 'distribution.bloc.l_imprimerie'),
 'office': ('demolition.ecran.une_agence', 'distribution.bloc.l_agence'),
}
lignes = ['\t'.join(['clé', 'fr servi', 'en servi', 'en proposé', 'état', 'raison'])]
def ligne(cle, en_prop, raison):
    etat = 'inchangé' if EN.get(cle) == en_prop else 'PROPOSÉ'
    lignes.append('\t'.join([cle, FR.get(cle, '(non servie)'), EN.get(cle, '(non servie)'), en_prop, etat, raison]))
for t, (w, r) in PROPOSE.items():
    ligne(f'building.type.{t}', w, r)
for t, (w, _) in PROPOSE.items():
    dem, dis = DERIVES[t]
    ligne(dem, ('An ' if w[0] in 'AEIOU' else 'A ') + w[0].lower() + w[1:], f'dérivé de `building.type.{t}` (article indéfini, Démolition)')
    ligne(dis, 'the ' + w[0].lower() + w[1:], f'dérivé de `building.type.{t}` (article défini, Distribution)')
dest = os.path.join(ICI, '31-en-types-batiment-2026-09-23.tsv')
open(dest, 'w', encoding='utf-8').write('\n'.join(lignes) + '\n')
n = sum(1 for l in lignes[1:] if '\tPROPOSÉ\t' in l)
print(f'écrit : {dest} — {len(lignes) - 1} clés, {n} PROPOSÉ(S)')

# ── ADDENDUM (f2, 23/09) : les heurts FR de D12 vus au §« Côté FR » de 31 — même tête (clé → fr → en), puis la clé et le fr servis ──────
import unicodedata
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
ADD = [  # (clé servie, fr proposé, clé dérivée du fr ? , raison)
 ('revue.phrase.j_ai_rapproche_les_comptes_de_la_facade', 'J’ai rapproché les comptes du commerce-écran', True, 'D12 : « la façade » → le mot du commerce-écran'),
 ('revue.phrase.il_passe_plus_d_argent_par_la_caisse_que_la_facade_ne_peut_en_justifier',
  '— il passe plus d’argent par la caisse que le commerce-écran ne peut en justifier.', True, 'D12 : « la façade » → le mot du commerce-écran'),
 ('revue.phrase.la_facade_est_epinglee_pour_un_controle', '— le commerce-écran est épinglé pour un contrôle.', True,
  'D12 : « la façade » → le mot du commerce-écran (l’accord suit : épinglé)'),
 ('random_world.coupling.pair.erlang_stash__deal_lek', 'ce que tient votre réserve et ce que la rue vient disputer', False,
  'D12 : `stash` = la réserve (« votre planque » = `cash_safehouse`) ; clé nommée par le couplage, pas par le texte : inchangée'),
]
add = ['\t'.join(['clé', 'fr', 'en', 'clé servie', 'fr servi', 'raison'])]
for cle_s, fr, derivee, raison in ADD:
    cle = '.'.join(cle_s.split('.')[:2]) + '.' + slug(fr) if derivee else cle_s
    add.append('\t'.join([cle, fr, EN[cle_s], cle_s, FR[cle_s], raison + ('' if cle == cle_s else ' ; clé RENOMMÉE (slug du fr)')]))
dest_a = os.path.join(ICI, '31-addendum-fr-d12-2026-09-23.tsv')
open(dest_a, 'w', encoding='utf-8').write('\n'.join(add) + '\n')
print(f'écrit : {dest_a} — {len(add) - 1} clés (en inchangé : il disait déjà « front », « stash »)')
