#!/usr/bin/env python3
"""Contrôle d'arithmétique ET DE PROPRIÉTÉ du découpage de `Tools/redimensionnement-design.md`.

⛔ CE QUE CE SCRIPT PROUVE, ET CE QU'IL NE PROUVE PAS.
   Il prouve deux choses entre les cellules R1/R2/R3 et les lignes de l'énumération :
     (a) la BIJECTION des numéros — aucun orphelin dans un sens ni dans l'autre ;
     (b) l'ACCORD DE PROPRIÉTAIRE — le chunk que l'énumération assigne est celui dont la cellule
         porte le numéro.
   ⚠️ (b) N'EXISTAIT PAS jusqu'au 2026-08-31, et c'est un BLOQUANT mesuré qui l'a créé : ㉛,
   le SEUL livrable que la v18 ajoutait, était assigné à R2 par l'énumération et porté par la
   cellule R1. **Comparer des ENSEMBLES de symboles est structurellement aveugle à cela** : les
   deux ensembles étaient identiques, la bijection verte, et les deux membres se contredisaient.
   Le document portait bien un « contrôle de cohérence de propriétaire » — en PROSE, couvrant
   corps↔cellule, et déclaré « vérifié à cette version » sans être rejoué sur le livrable neuf.
   ⇒ *Un contrôle d'ensemble ne peut pas voir un désaccord d'application.*
   ⚠️ Il NE prouve PAS que le plancher est dérivé du CORPS indépendamment de la table.
   ⚠️ ET SA PORTÉE EST LE §11 SEUL : des numéros cerclés vivent dans le CORPS, hors §11, et lui
   sont INVISIBLES (le compte se lit dans sa propre sortie, il n'est pas recopié ici — un chiffre
   recopié se périme, et celui-ci s'est déjà périmé une fois). En cellule, un numéro signifie
   POSSESSION ; en prose, il n'est qu'une référence — rien ici ne distingue les deux, donc une
   PRESCRIPTION écrite en prose avec un numéro cerclé échappe au contrôle de possession. La règle
   (v10) reste : dans une CELLULE, un numéro cerclé ne vit que là où il est POSSÉDÉ ; une
   référence croisée se nomme en toutes lettres. ⇒ Ne pas lire un « ✅ » comme « la propriété est
   bien assignée partout » : il dit « aucun orphelin ET aucun désaccord ENTRE la table et
   l'énumération ». Les deux membres sont écrits dans le même §11, donc un livrable oublié DES
   DEUX CÔTÉS reste invisible. C'est le BLOQUANT B2 de la revue v8, et il n'est pas fermé par cet
   instrument — le dire plutôt que de laisser un ✅ le suggérer.

⚠️ L'ALPHABET EST DÉRIVÉ, PLUS JAMAIS ÉNUMÉRÉ À LA MAIN (mesuré 2026-08-31, revue ⊥).
   Une plage `[①-㉓]` s'étend de U+2460 à U+3253 et avale ⚠ ⛔ ✅ : elle rendait 26 numéros là où
   il y en avait 24. Le remède d'alors — un jeu EXPLICITE — a produit le défaut symétrique : il
   OMETTAIT ㉗, exactement le numéro que le document déclare libéré. *Un jeu explicite est une
   allowlist, et son trou tombe là où le document bouge.* ⇒ La classe se ferme par la PROPRIÉTÉ
   Unicode (`CIRCLED DIGIT` / `CIRCLED NUMBER`), qui ne peut pas avoir de trou ; le jeu explicite
   survit comme CONTRÔLE NÉGATIF, et tout écart est imprimé.
"""
import re, sys, unicodedata

# Jeu de référence — n'est plus la source, il est le CONTRÔLE.
EXPLICITE = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉘㉙㉚㉛'

def est_cercle(c):
    try: n = unicodedata.name(c)
    except ValueError: return False
    return n.startswith('CIRCLED DIGIT') or n.startswith('CIRCLED NUMBER')

path = sys.argv[1] if len(sys.argv) > 1 else 'Tools/redimensionnement-design.md'
t = open(path, encoding='utf-8').read()

CIRCLED = {c for c in t if est_cercle(c)}

# contrôle POSITIF : la propriété reconnaît tout le jeu de référence.
manquants = [c for c in EXPLICITE if not est_cercle(c)]
assert not manquants, f'la propriété Unicode ne reconnaît pas {manquants}'
# contrôle NÉGATIF : elle rejette les symboles que la plage avalait.
for s in '⚠⛔✅':
    assert not est_cercle(s), f'{s} classé cerclé — la propriété est trop large'

if '## 11.' not in t:
    print('⛔ §11 introuvable'); sys.exit(2)
tbl = t.split('## 11.')[1]

# ⛔ UN CONTRÔLE QUI NE TROUVE PAS SON TEXTE NE DOIT PAS POUVOIR MOURIR EN SILENCE (mesuré
#    2026-08-31) : la borne de fin de la v8 était une chaîne que la v9 a supprimée. Le script
#    levait une ValueError, le document continuait d'afficher « 25 = 25 » en citant cet
#    instrument, et un lecteur vérifiait qu'il EXISTE. Un instrument commité et INERTE est plus
#    dangereux qu'un instrument absent : il nomme un mécanisme réel.
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

# ⛔ COMPTER N'EST PAS EXTRAIRE : `rows` et `in_enum` dérivent tous deux de la MÊME tranche.
#    Une tranche TRONQUÉE les réduirait ENSEMBLE, ils coïncideraient quand même, et le compte
#    serait juste pendant que l'extraction est incomplète. ⇒ Grandeur INDÉPENDANTE de la tranche.
rows_whole_doc = len(re.findall(r'^\| [0-9]+ \| §', t, re.M))
if rows_whole_doc != rows:
    print(f'⛔ TRANCHE TRONQUÉE : {rows} ligne(s) dans la tranche, {rows_whole_doc} dans le document.')
    print('   Le compte interne coïnciderait quand même — c est pour ça que ce contrôle existe.')
    sys.exit(3)

per_chunk = {}
for name in ('R1', 'R2', 'R3'):
    key = f'**{name} —'
    if key not in cells: continue
    seg = cells.split(key)[1].split('| revue ⊥ |')[0]
    per_chunk[name] = {c for c in seg if c in CIRCLED}

# ⛔⛔ ACCORD DE PROPRIÉTAIRE — la moitié que la comparaison d'ensembles ne peut pas voir.
#    Chaque ligne d'énumération finit par « | R<i> <num> | » : on lit le chunk QU'ELLE assigne,
#    et on le confronte à la cellule qui porte réellement le numéro.
proprio_enum = {}
for m in re.finditer(r'^\| ([0-9]+) \| .* \| (R[123]) [^|]*?([' + ''.join(CIRCLED) + r'])[^|]* \|\s*$',
                     enum, re.M):
    proprio_enum[m.group(3)] = (m.group(2), m.group(1))
proprio_cell = {c: n for n, s in per_chunk.items() for c in s}

# le contrôle doit prouver qu'il a LU — sinon « 0 divergence » est un vert de non-exécution
if len(proprio_enum) < rows:
    print(f'⛔ EXTRACTION INCOMPLÈTE : {len(proprio_enum)} propriétaires lus pour {rows} lignes.')
    print('   Une ligne dont le propriétaire n est pas lisible ne peut pas être confrontée —')
    print('   ce n est PAS « aucune divergence », c est un instrument qui a perdu son objet.')
    sys.exit(2)

divergences = [(c, e[0], e[1], proprio_cell.get(c, '—'))
               for c, e in sorted(proprio_enum.items())
               if proprio_cell.get(c) != e[0]]

print(f'  lignes énumérées ......... {rows}')
print(f'  numéros énumérés ......... {len(in_enum)}')
print(f'  numéros en cellule ....... {len(in_cells)}')
for n, v in per_chunk.items():
    print(f'    {n} : {len(v)}')
tot = sum(len(v) for v in per_chunk.values())
print(f'  somme des chunks ......... {tot}')
print(f'  propriétaires confrontés . {len(proprio_enum)}')
print(f'  en cellule non énuméré ... {sorted(in_cells - in_enum) or "aucun"}')
print(f'  énuméré non en cellule ... {sorted(in_enum - in_cells) or "aucun"}')
hors = sorted(c for c in CIRCLED if c not in EXPLICITE)
print(f'  cerclés hors jeu explicite {hors or "aucun"}  (dérivés, donc VUS — le jeu explicite n est plus la source)')
for a in per_chunk:
    for b in per_chunk:
        if a < b and (dup := per_chunk[a] & per_chunk[b]):
            print(f'  ⛔ {a} ET {b} possèdent : {sorted(dup)}')
for c, ce, ligne, cc in divergences:
    print(f'  ⛔⛔ {c} : énumération (ligne {ligne}) dit {ce}, cellule dit {cc}')

ok = (rows == len(in_enum) == len(in_cells) == tot) and not (in_cells ^ in_enum) and not divergences
print(f'\n  ⇒ bijection ET propriétaires {"✅" if ok else "⛔"}   (et ce script ne dit RIEN de plus — voir la docstring)')
sys.exit(0 if ok else 1)
