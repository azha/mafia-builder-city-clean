#!/usr/bin/env python3
"""Contrôle d'arithmétique du découpage de `Tools/redimensionnement-design.md`.

⛔ CE QUE CE SCRIPT PROUVE, ET CE QU'IL NE PROUVE PAS.
   Il prouve la BIJECTION entre les numéros cerclés des cellules R1/R2/R3 et les lignes de
   l'énumération : aucun orphelin dans un sens ni dans l'autre. C'est réel et ça a déjà attrapé
   deux défauts (deux obligations sous un seul numéro ; un numéro possédé par deux chunks).
   ⚠️ Il NE prouve PAS que le plancher est dérivé du CORPS indépendamment de la table.
   ⚠️ ET SA PORTÉE EST LE §11 SEUL (mesuré 2026-08-31) : 11 numéros cerclés vivent dans le CORPS,
   hors §11, et lui sont INVISIBLES. En cellule, un numéro signifie POSSESSION ; en prose, il n'est
   qu'une référence — mais rien ici ne distingue les deux, donc une PRESCRIPTION écrite en prose
   avec un numéro cerclé échappe au contrôle de possession. La règle (v10) reste : dans une
   CELLULE, un numéro cerclé ne vit que là où il est POSSÉDÉ ; une référence croisée se nomme en
   toutes lettres. ⇒ Ne pas lire un « bijection ✅ » comme « la propriété est bien assignée
   partout » : il dit seulement « aucun orphelin ENTRE la table et l'énumération ». Les deux
   membres sont écrits dans le même §11, donc un livrable oublié DES DEUX CÔTÉS reste invisible.
   C'est le BLOQUANT B2 de la revue v8, et il n'est pas fermé par cet instrument — le dire plutôt
   que de laisser un ✅ le suggérer.

⚠️ Jeu de symboles EXPLICITE, jamais une plage : `[①-㉓]` s'étend de U+2460 à U+3253 et avale
   ⚠ (U+26A0), ⛔ (U+26D4), ✅ (U+2705) — mesuré, il rendait 26 numéros là où il y en avait 24.
"""
import re, sys

CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉘㉙㉚'
path = sys.argv[1] if len(sys.argv) > 1 else 'Tools/redimensionnement-design.md'
t = open(path, encoding='utf-8').read()

if '## 11.' not in t:
    print('⛔ §11 introuvable'); sys.exit(2)
tbl = t.split('## 11.')[1]

# ⛔ UN CONTRÔLE QUI NE TROUVE PAS SON TEXTE NE DOIT PAS POUVOIR MOURIR EN SILENCE (mesuré
#    2026-08-31) : la borne de fin de la v8 était la chaîne « **Plancher dérivé », que la v9 a
#    supprimée. Le script levait une ValueError, le document continuait d'afficher « 25 = 25 » en
#    citant cet instrument, et un lecteur vérifiait qu'il EXISTE. Un instrument commité et INERTE
#    est plus dangereux qu'un instrument absent : il nomme un mécanisme réel.
#    ⇒ Ancres multiples, et sortie 2 EXPLICITE si aucune ne mord.
START = '| # | ancre du corps'
ENDS = ('**Plancher dérivé', '**Bijection cellules', '⛔⛔ **B2 de la v8')
if START not in tbl:
    print(f'⛔ ancre de début introuvable ({START!r}) — le contrôle NE S EST PAS EXÉCUTÉ')
    sys.exit(2)
end = next((e for e in ENDS if e in tbl), None)
if end is None:
    print(f'⛔ aucune ancre de fin trouvée parmi {ENDS} — le contrôle NE S EST PAS EXÉCUTÉ')
    sys.exit(2)
enum = tbl[tbl.index(START):tbl.index(end)]
cells = tbl[tbl.index('| chunk | livrables'):]

in_enum = {c for c in enum if c in CIRCLED}
in_cells = {c for c in cells if c in CIRCLED}
rows = len(re.findall(r'^\| [0-9]+ \|', enum, re.M))

# ⛔ COMPTER N'EST PAS EXTRAIRE (leçon d'une session voisine, 2026-08-31) : `rows` et `in_enum`
#    dérivent tous deux de la MÊME tranche `enum`. Une tranche TRONQUÉE les réduirait ENSEMBLE, ils
#    coïncideraient quand même, et le compte serait juste pendant que l'extraction est incomplète.
#    ⇒ Grandeur INDÉPENDANTE de la tranche : compter les lignes d'énumération sur le document
#    ENTIER. Si les deux diffèrent, la tranche a perdu des lignes — le mode d'échec que la
#    coïncidence interne ne peut pas voir.
rows_whole_doc = len(re.findall(r'^\| [0-9]+ \| §', t, re.M))
if rows_whole_doc != rows:
    print(f'⛔ TRANCHE TRONQUÉE : {rows} ligne(s) dans la tranche, {rows_whole_doc} dans le document.')
    print('   Le compte interne coïnciderait quand même — c est pour ça que ce contrôle existe.')
    sys.exit(3)

# contrôle POSITIF : le jeu doit reconnaître son premier et son dernier symbole
assert '①' in CIRCLED and '㉕' in CIRCLED, 'jeu de symboles incomplet'

per_chunk = {}
for name in ('R1', 'R2', 'R3'):
    key = f'**{name} —'
    if key not in cells: continue
    seg = cells.split(key)[1].split('| revue ⊥ |')[0]
    per_chunk[name] = {c for c in seg if c in CIRCLED}

print(f'  lignes énumérées ......... {rows}')
print(f'  numéros énumérés ......... {len(in_enum)}')
print(f'  numéros en cellule ....... {len(in_cells)}')
for n, v in per_chunk.items():
    print(f'    {n} : {len(v)}')
tot = sum(len(v) for v in per_chunk.values())
print(f'  somme des chunks ......... {tot}')
print(f'  en cellule non énuméré ... {sorted(in_cells - in_enum) or "aucun"}')
print(f'  énuméré non en cellule ... {sorted(in_enum - in_cells) or "aucun"}')
for a in per_chunk:
    for b in per_chunk:
        if a < b and (dup := per_chunk[a] & per_chunk[b]):
            print(f'  ⛔ {a} ET {b} possèdent : {sorted(dup)}')

ok = (rows == len(in_enum) == len(in_cells) == tot) and not (in_cells ^ in_enum)
print(f'\n  ⇒ bijection {"✅" if ok else "⛔"}   (et ce script ne dit RIEN de plus — voir la docstring)')
sys.exit(0 if ok else 1)
