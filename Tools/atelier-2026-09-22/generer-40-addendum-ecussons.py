#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""40 — addendum : la LETTRE de l'écusson des médaillons de familles (cadres 59, 60, 61 de la série 6), 4 clés PROPOSÉES `conflit.initiale.<valeur>`
(commande f2 du 24/09, pour le back). Forme ParValeur de la maison (`domaine.champ.<valeur servie>`, comme `decision.portee.*`) : la valeur est
le `rival_key` SERVI (`coil`, `tarcum`, `iron_throat`, `saltline`, `db/schema/conflict_rival.ts`, vérifié ici), pas le slug fr — renommage f2 du
24/09 avant tout service (v1 `conflit.ecusson.<slug fr>`, cfc44be4, jamais servie : le contrat additif n'est pas en jeu). La première lettre du nom servi ne marche pas : « La Coil » donnerait L, et en anglais « The Coil » et
« Tarcum » donneraient tous deux T. La lettre est donc CHOISIE, par langue, sous trois conditions vérifiées ici (exit 1 sinon) :
  - DISTINCTES dans chaque langue (4 lettres différentes en fr, 4 en en) ;
  - COHÉRENTES avec le nom lu à l'écran : la lettre est l'initiale d'un mot du nom SERVI dans cette langue (`conflit.bloc.<famille>`, lu par
    son nom au back HEAD), jamais d'un article (La, The) ;
  - en fr, ÉGALES à la maquette : les `<div class="ecu">` des cadres 59-61 portent C, T, G, S, dans l'ordre des familles.
Choix : fr C / T / G / S (Coil, Tarcum, Gorge-de-Fer, Saltline, ceux de la maquette) ; en C / T / I / S (Coil, Tarcum, Iron Throat, Saltline :
le mot fort du nom, l'article retiré).
Les clés ne doivent pas être servies (sinon, c'est la valeur servie qui compte). Sortie : `40-addendum-ecussons-2026-09-24.tsv`, format des
tables de mots ; somme-table code 0.
Usage : python3 Tools/atelier-2026-09-22/generer-40-addendum-ecussons.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
S6 = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-6.html')
ARTICLES = {'la', 'le', 'les', 'the'}
# rival_key servi → (slug du nom servi `conflit.bloc.*`, fr, en) ; l'ordre est celui des médaillons de la maquette
LETTRES = {'coil': ('la_coil', 'C', 'C'), 'tarcum': ('tarcum', 'T', 'T'), 'iron_throat': ('gorge_de_fer', 'G', 'I'), 'saltline': ('saltline', 'S', 'S')}

def main():
    st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True, check=True).stdout
    sha = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    def registre(nom):
        d = st.index(f'export const {nom}'); t = st[d:st.index('\n};', d)]
        return {m.group(1): m.group(3).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(['\"])((?:[^'\"\\]|\\.)*)\2", t, re.M)}
    FR, EN = registre('FR_MESSAGES'), registre('EN_MESSAGES')
    d = []
    schema = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/db/schema/conflict_rival.ts'], capture_output=True, text=True, check=True).stdout
    for rk in LETTRES:
        if f"'{rk}'" not in schema: d.append(f'« {rk} » n’est pas un rival_key servi')
    for i, langue in ((1, 'fr'), (2, 'en')):
        l = [v[i] for v in LETTRES.values()]
        if len(set(l)) != 4: d.append(f'{langue} : lettres non distinctes {l}')
    lignes = []
    for rk, (fam, lf, le) in LETTRES.items():
        cle, nom = f'conflit.initiale.{rk}', f'conflit.bloc.{fam}'
        if cle in FR or cle in EN: d.append(f'{cle} déjà servie'); continue
        if nom not in FR or nom not in EN: d.append(f'{nom} non servi'); continue
        for lettre, nomv, langue in ((lf, FR[nom], 'fr'), (le, EN[nom], 'en')):
            initiales = [w[0].upper() for w in re.split(r'[\s\-]+', nomv) if w and w.lower() not in ARTICLES]
            if lettre not in initiales: d.append(f'{cle} {langue} : « {lettre} » n’est l’initiale d’aucun mot de « {nomv} »')
        lignes.append((lf, '59, 60, 61', 'proposée', cle, lf, le,
                       f'lettre de l’écusson du médaillon ; ParValeur sur le rival_key servi « {rk} » ; nom servi « {FR[nom]} » / « {EN[nom]} » (`{nom}`) ; '
                       f'initiale du mot fort, article retiré ; 4 lettres distinctes par langue'))
    s6 = open(S6, encoding='utf-8').read()
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s6)] + [len(s6)]
    attendu = [v[1] for v in LETTRES.values()]
    for i in (59, 60, 61):
        vu = re.findall(r'<div class="ecu">([^<]+)</div>', s6[C[i]:C[i + 1]])
        if vu != attendu: d.append(f'cadre {i} : écussons {vu} ≠ {attendu}')
    out = os.path.join(ICI, '40-addendum-ecussons-2026-09-24.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('mot\tcadres\tclasse\tclé\tfr\ten\tnote\n')
        for r in lignes: f.write('\t'.join(r) + '\n')
    print(f'back {sha} · {os.path.basename(out)} : {len(lignes)} clés PROPOSÉES · somme = {len(lignes)} lignes = {len(lignes)} mots + 0 compléments')
    for r in lignes: print(f'  {r[3]:32} fr {r[4]}  en {r[5]}')
    rc = subprocess.run([sys.executable, os.path.join(ICI, 'somme-table.py'), out]).returncode
    if rc: d.append(f'somme-table code {rc}')
    for x in d: print('  ⛔', x)
    return 1 if d or len(lignes) != 4 else 0

if __name__ == '__main__':
    sys.exit(main())
