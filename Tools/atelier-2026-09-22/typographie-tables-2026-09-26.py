#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Point 5 de la file f2 du 26/09 — la typographie des tables de l'atelier, alignée sur les QUATRE règles de la garde de classe du back
(`tests/unit/i18n/typographie_fr_classe_unit.spec.ts`, lot/i18n-2026-09-24) : R1 aucune apostrophe droite · R2 U+00A0 devant « : » ·
R3 U+00A0 à l'intérieur de « » · R4 U+202F devant « ; ? ! ». ARBITRAGES D10 et D17.
Population : la colonne `fr` des TSV de ce dossier, et la cellule fr (2ᵉ colonne) des lignes `| `clé` | fr | en |` des .md de ce dossier.
Ne touche QUE cette cellule, hors ancres de code entre backticks : ni la clé, ni l'anglais, ni le texte courant. Idempotent (un second passage rend 0).
Usage : typographie-tables-2026-09-26.py [--controle | --ecrire]"""
import csv, glob, io, os, re, sys
ICI = os.path.dirname(os.path.abspath(__file__))
NB, FI = '\u00a0', '\u202f'
REGLES = {'R1': re.compile(r"'"), 'R2': re.compile('(?<!\u00a0):(?=\\s|$)'), 'R3': re.compile('«(?!\u00a0)|(?<!\u00a0)»'),
          'R4': re.compile('(?<!\u202f)[;?!]')}
LIGNE_MD = re.compile(r'^(\| `[a-z0-9_.]+` \| )(.*?)( \| .*)$')

CODE = re.compile(r'(`[^`]*`)')   # une ancre de code (`fichier.ts:43`, `Lib("…")`) n'est pas du texte joueur : jamais touchée

def hors_code(v): return ''.join(x for x in CODE.split(v) if not x.startswith('`'))

def fautes(v): return [k for k, rx in REGLES.items() if rx.search(hors_code(v))]

def corriger(v): return ''.join(x if x.startswith('`') else _corriger(x) for x in CODE.split(v))

def _corriger(v):
    v = v.replace("'", '’')
    v = re.sub('[ \u202f]?:(?=\\s|$)', NB + ':', v)             # R2 : le « : » de ponctuation (« fichier:ligne » n'en est pas un)
    v = re.sub('«[ \u202f]?', '«' + NB, v); v = re.sub('[ \u202f]?»', NB + '»', v)   # R3
    v = re.sub('[ \u00a0]?([;?!])', FI + r'\1', v)               # R4
    return v

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    total, par_fichier, a_ecrire = 0, {}, {}
    for f in sorted(glob.glob(os.path.join(ICI, '*.tsv'))):
        texte = open(f, encoding='utf-8').read()
        rows = list(csv.reader(io.StringIO(texte), delimiter='\t', quoting=csv.QUOTE_NONE))
        if not rows or 'fr' not in rows[0]: continue
        i = rows[0].index('fr'); n = 0
        for r in rows[1:]:
            if len(r) > i and fautes(r[i]):
                r[i] = corriger(r[i]); n += 1
        if n:
            par_fichier[os.path.basename(f)] = n; total += n
            a_ecrire[f] = ''.join('\t'.join(r) + '\n' for r in rows)
    for f in sorted(glob.glob(os.path.join(ICI, '*.md'))):
        lignes = open(f, encoding='utf-8').read().split('\n'); n = 0
        for j, l in enumerate(lignes):
            m = LIGNE_MD.match(l)
            if m and fautes(m.group(2)):
                lignes[j] = m.group(1) + corriger(m.group(2)) + m.group(3); n += 1
        if n:
            par_fichier[os.path.basename(f)] = n; total += n
            a_ecrire[f] = '\n'.join(lignes)
    for k, v in par_fichier.items(): print(f'  {v:3d}  {k}')
    print(f'{total} valeur(s) fr à aligner' + (' — écrites' if mode == '--ecrire' and total else ''))
    if mode == '--ecrire':
        for f, t in a_ecrire.items(): open(f, 'w', encoding='utf-8', newline='\n').write(t)
    return 0

if __name__ == '__main__':
    sys.exit(main())
