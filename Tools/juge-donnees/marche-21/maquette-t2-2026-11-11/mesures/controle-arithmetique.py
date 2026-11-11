#!/usr/bin/env python3
# Recompte la table de couverture : |B| + |M non appariés| = nombre de lignes.
# Positif -> rc 0. Contrôle négatif : --casser duplique une clé B -> rc != 0.
import sys, os, collections
BASE=os.path.dirname(os.path.abspath(__file__))
rows=[]
for l in open(os.path.join(BASE,'couverture.tsv'),encoding='utf-8'):
    if l.startswith('#') or not l.strip(): continue
    c=l.rstrip('\n').split('\t')
    assert len(c)==7, f'ligne malformée ({len(c)} colonnes) : {c[:2]}'
    rows.append(c)
if '--casser' in sys.argv:            # contrôle négatif : une clé B comptée deux fois
    rows.append(list(rows[0]))
B=[r[2] for r in rows if r[2]!='-']
M=[r[3] for r in rows if r[2]=='-']
dup=[k for k,n in collections.Counter(B).items() if n>1]
print(f'|B| (clés B, chacune sur UNE ligne)   = {len(B)}')
print(f'|M non appariés| (lignes sans clé B)  = {len(M)}')
print(f'somme                                 = {len(B)+len(M)}')
print(f'nombre de lignes de la table          = {len(rows)}')
ok = (len(B)+len(M)==len(rows)) and not dup
if dup: print(f'ECHEC : clé(s) B répétée(s) : {dup}')
print('CONTROLE ' + ('OK' if ok else 'EN ECHEC'))
sys.exit(0 if ok else 2)
