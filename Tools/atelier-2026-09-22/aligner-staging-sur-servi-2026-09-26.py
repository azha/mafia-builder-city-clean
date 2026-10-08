#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Point 5 de la file f2 du 26/09 — les « 184 valeurs divergentes » : le dossier de RATIFICATION du back
(`docs/content/i18n-staging/*.fr.json`, familles PROPOSITIONS* exclues, comme `i18n_staging_pont.spec.ts`) contre le FR servi
(`FR_MESSAGES` + `ERROR_TEXT_RATIFIED.fr` de `string_table.ts`), au SHA du lot i18n (défaut 18dfa633). Source du chiffre : revue ⊥ du lot,
`scratchpad/revues-2026-09/REVUE-i18n-2026-09-24.md` MAJOR-2 (lot/i18n-2026-09-24 @ 49781922) ; dette TD-740 (« fermeture : une fois les tables
de l'atelier alignées sur la typographie servie »).
Mesure reproduite : 403 communes, 184 divergentes = 173 de typographie seule (’, U+00A0, U+202F normalisés par le lot) + 11 de MOTS, déjà
divergentes avant le lot (11 à 66060cc1) — le servi y suit une décision d'atelier POSTÉRIEURE à la ratification : table 37 (D14, la
maquette ratifiée l'emporte : lab_tier ×3, grow_stage ×4, husbandry ×3) et D12 (money_holding = « Banque »).
⇒ Le dossier est aligné sur le servi À L'OCTET pour les 184. L'atelier n'écrit pas au back : les 11 fichiers alignés sont posés dans
`staging-aligne-2026-09-26/`, pour recopie par le back (f7), avec cet outil comme preuve.
Gardes : (1) remplacement TEXTUEL de la seule valeur (les octets hors valeurs ne bougent pas — contrôlé) ; (2) après alignement, 0 divergence ;
(3) les 173 ne diffèrent que par la typographie (normalisation) ; (4) les 11 de mots sont exactement la liste attendue.
Usage : aligner-staging-sur-servi-2026-09-26.py [--controle | --ecrire] [--sha 18dfa633]"""
import json, os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); SORTIE = os.path.join(ICI, 'staging-aligne-2026-09-26')
BACK = os.path.expanduser('~/project/mafia-clean-city')
SHA = sys.argv[sys.argv.index('--sha') + 1] if '--sha' in sys.argv else '18dfa633'
MOTS_ATTENDUS = {'building.type.money_holding', 'building.lab_tier.basic', 'building.lab_tier.refined', 'building.lab_tier.master',
                 'building.grow_stage.early', 'building.grow_stage.mid', 'building.grow_stage.late', 'building.grow_stage.done',
                 'building.husbandry.withered', 'building.husbandry.on_track', 'building.husbandry.thriving'}
g = lambda f: subprocess.run(['git', '-C', BACK, 'show', f'{SHA}:{f}'], capture_output=True, text=True, check=True).stdout
CLE = r"[a-zA-Z0-9_.-]+"

def unesc(v): return re.sub(r"\\u([0-9a-fA-F]{4})|\\(.)", lambda m: chr(int(m.group(1), 16)) if m.group(1) else m.group(2), v)

def valeurs(bloc):
    d = {}
    for m in re.finditer(r"^\s*'(" + CLE + r")':\s*\n?((?:\s*'(?:[^'\\]|\\.)*'\s*\+?\s*\n?)+),", bloc, re.M):
        d[m.group(1)] = unesc(''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))))
    return d

def servi():
    st = g('services/game-back/src/i18n/string_table.ts')
    d = st.index('export const FR_MESSAGES'); fr = valeurs(st[d:st.index('\n};', d)])
    e = st.index('export const ERROR_TEXT_RATIFIED'); e = st.index('\n  fr: {', e)
    fr.update(valeurs(st[e:st.index('\n  },', e)]))
    return fr

def remplacer(o, fr, touchees, p=''):
    for k, v in o.items():
        c = f'{p}.{k}' if p else k
        if isinstance(v, dict): remplacer(v, fr, touchees, c)
        elif isinstance(v, str) and c in fr and fr[c] != v: o[k] = fr[c]; touchees.append((c, v, fr[c]))

def textuel(brut, touchees):
    """Remplace, dans le JSON BRUT, la seule chaîne de valeur de chaque clé touchée : la forme du fichier (ordre, lignes vides,
    indentation, échappements des autres valeurs) reste à l'octet."""
    for c, a, b in touchees:
        m = re.compile(r'("' + re.escape(c) + r'"\s*:\s*)"((?:[^"\\]|\\.)*)"')
        trouve = [x for x in m.finditer(brut) if json.loads('"' + x.group(2) + '"') == a]
        if len(trouve) != 1: raise SystemExit(f'⛔ {c} : {len(trouve)} occurrence(s) de la valeur ratifiée dans le brut')
        x = trouve[0]
        brut = brut[:x.start()] + x.group(1) + json.dumps(b, ensure_ascii=False) + brut[x.end():]
    return brut

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('--') and sys.argv[1] != '--sha' else '--controle'
    fr = servi()
    noms = [f for f in subprocess.run(['git', '-C', BACK, 'ls-tree', '-r', '--name-only', SHA, '--', 'docs/content/i18n-staging'],
            capture_output=True, text=True).stdout.split() if f.endswith('.fr.json') and 'PROPOSITIONS' not in f]
    norm = lambda s: re.sub(r'[   ]+', ' ', s.replace('’', "'")).strip()
    D, toutes, sorties = [], [], {}
    for f in noms:
        brut = g(f); o = json.loads(brut)
        if any(isinstance(v, dict) for v in o.values()): D.append(f'{f} : JSON imbriqué, remplacement textuel non sûr'); continue
        t = []; remplacer(o, fr, t); toutes += t
        if t:
            neuf = textuel(brut, t)
            if json.loads(neuf) != o: D.append(f'{f} : le remplacement textuel ne rend pas l’objet attendu')
            if re.sub(r'"(?:[^"\\]|\\.)*"', '""', neuf) != re.sub(r'"(?:[^"\\]|\\.)*"', '""', brut):
                D.append(f'{f} : des octets HORS valeurs ont bougé')
            sorties[os.path.basename(f)] = neuf
    typo = [c for c, a, b in toutes if norm(a) == norm(b)]; mots = {c for c, a, b in toutes if norm(a) != norm(b)}
    if mots != MOTS_ATTENDUS: D.append(f'mots : en trop {sorted(mots - MOTS_ATTENDUS)} ; manquants {sorted(MOTS_ATTENDUS - mots)}')
    print(f'{SHA} : {len(noms)} fichiers ; {len(toutes)} valeurs alignées = {len(typo)} typographie + {len(mots)} mots ; '
          f'{len(sorties)} fichiers touchés')
    for x in D: print('  ⛔', x)
    if D: return 1
    if mode == '--ecrire':
        os.makedirs(SORTIE, exist_ok=True)
        for n, t in sorties.items(): open(os.path.join(SORTIE, n), 'w', encoding='utf-8', newline='\n').write(t)
        # garde (2) : relu depuis le disque, plus aucune divergence
        reste = 0
        for n in sorties:
            o = json.load(open(os.path.join(SORTIE, n), encoding='utf-8')); t = []; remplacer(o, fr, t); reste += len(t)
        print(f'écrits dans {os.path.relpath(SORTIE, ICI)}/ ; divergences restantes après alignement : {reste}')
        return 1 if reste else 0
    return 0

if __name__ == '__main__':
    sys.exit(main())
