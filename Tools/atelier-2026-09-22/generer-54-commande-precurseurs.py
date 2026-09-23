#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""54 — le geste « Commander » de ② nomme le précurseur servi (commande f2 du 23/09) : une FAMILLE indexée par la VALEUR,
`building.commande.<precursor_type>`, 6 clés, fr et en.

Pourquoi une famille et pas un gabarit `{precursor}` : l'ARTICLE change avec le nom (« du Pyralin », « de la Thalmite », « du lys de verre »,
« de la résine de lull »…) ; aucun gabarit ne le porte. Le back confirme que `POST /v1/operational/precursors/order` accepte les 6.
Mesuré au back HEAD :
  - le domaine : `precursorType = pgEnum('precursor_type', [pyralin, thalmite, garnet_salt, verdant_root_extract, lull_resin, glass_lily])`
    (`db/schema/operational_chain.ts:36`) — les clés sont ces valeurs, telles quelles (déjà en minuscules) ;
  - les NOMS : le catalogue servi `building.precursor.*` (D12 : un mot par chose), lu dans EN_MESSAGES et FR_MESSAGES par leur nom.
    Au milieu de la phrase, un nom COMMUN perd sa capitale (« Sel de grenat » → « du sel de grenat ») ; Pyralin et Thalmite sont des
    NOMS PROPRES (glossaire, table 39 : jamais en minuscule) et la gardent — la casse inégale est juste (f2) ;
  - `building.action.commander_du_pyralin` (« Commander du Pyralin ») reste SERVIE (contrat additif) ; la famille la double pour Pyralin,
    à l'octet ; le client passe à la famille.
Les replis PROPOSÉS de CLIENT-2 (relayés par f2) sont comparés À L'OCTET : la table fait foi, un écart se signale.
Contrôles (exit 1) : 6 clés = le domaine servi ; nom du catalogue présent dans la valeur (casse réglée) ; replis de CLIENT-2 = nos fr ;
fr de Pyralin = la valeur servie de commander_du_pyralin ; D17 (aucune ponctuation haute) ; apostrophe typographique ; somme-table code 0.
Usage : python3 Tools/atelier-2026-09-22/generer-54-commande-precurseurs.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
PROPRES = {'pyralin', 'thalmite'}          # noms propres (glossaire, table 39)
# article devant le nom (le genre du nom commun français ; « la Thalmite » : minéral en -ite, féminin — le repli de CLIENT-2 le dit aussi)
ARTICLE = {'pyralin': 'du ', 'thalmite': 'de la ', 'garnet_salt': 'du ', 'glass_lily': 'du ', 'lull_resin': 'de la ', 'verdant_root_extract': 'de la '}
REPLIS_CLIENT2 = {'pyralin': 'Commander du Pyralin', 'thalmite': 'Commander de la Thalmite', 'garnet_salt': 'Commander du sel de grenat',
                  'verdant_root_extract': 'Commander de la racine verdoyante', 'lull_resin': 'Commander de la résine de lull',
                  'glass_lily': 'Commander du lys de verre'}

def main():
    git = lambda chemin: subprocess.run(['git', '-C', BACK, 'show', f'HEAD:services/game-back/src/{chemin}'], capture_output=True, text=True, check=True).stdout
    st = git('i18n/string_table.ts')
    def registre(nom):
        d = st.index(f'export const {nom}'); t = st[d:st.index('\n};', d)]
        return {m.group(1): m.group(3).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(['\"])((?:[^'\"\\]|\\.)*)\2", t, re.M)}
    EN, FR = registre('EN_MESSAGES'), registre('FR_MESSAGES')
    domaine = re.search(r"pgEnum\('precursor_type',\s*\[([^\]]*)\]", git('db/schema/operational_chain.ts')).group(1)
    domaine = re.findall(r"'([^']+)'", domaine)
    d, lignes = [], []
    for v in domaine:
        nfr, nen = FR.get(f'building.precursor.{v}'), EN.get(f'building.precursor.{v}')
        if not nfr or not nen: d.append(f'{v} : building.precursor.{v} absent d’un registre'); continue
        cfr = nfr if v in PROPRES else nfr[0].lower() + nfr[1:]
        cen = nen if v in PROPRES else nen[0].lower() + nen[1:]
        fr, en = f'Commander {ARTICLE[v]}{cfr}', f'Order {cen}'
        note = (f'nom du catalogue `building.precursor.{v}` (« {nfr} » / « {nen} ») — '
                + ('nom PROPRE, capitale gardée (glossaire, table 39)' if v in PROPRES else 'nom commun : minuscule au milieu de la phrase'))
        if v == 'pyralin': note += ' ; double à l’octet `building.action.commander_du_pyralin`, qui reste servie (additif)'
        if REPLIS_CLIENT2.get(v) != fr: d.append(f'{v} : repli CLIENT-2 « {REPLIS_CLIENT2.get(v)} » ≠ table « {fr} »')
        if re.search(r'[:;!?]', fr + en) or "'" in fr + en: d.append(f'{v} : D17 / apostrophe')
        lignes.append([REPLIS_CLIENT2.get(v, fr), '② (geste « Commander », labo)', 'proposée', f'building.commande.{v}', fr, en, note])
    if sorted(domaine) != sorted(ARTICLE): d.append(f'domaine servi {domaine} ≠ articles {sorted(ARTICLE)}')
    if FR.get('building.action.commander_du_pyralin') != 'Commander du Pyralin': d.append('commander_du_pyralin servie a changé')
    out = os.path.join(ICI, '54-commande-precurseurs-2026-09-23.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note']) + '\n')
        for l in lignes: f.write('\t'.join(l) + '\n')
    print(f'54 : somme = {len(lignes)} lignes = {len(lignes)} mots + 0 compléments · 6 clés building.commande.* = domaine servi {domaine}')
    rc = subprocess.run([sys.executable, os.path.join(ICI, 'somme-table.py'), out]).returncode
    if rc: d.append(f'somme-table code {rc}')
    for x in d: print('⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
