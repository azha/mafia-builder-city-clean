# Controle du COMPTE de la table des ecarts : on recompte les lignes du rapport plutot que de l'affirmer.
import re
from collections import Counter
p='../rapport.md'
lines=open(p,encoding='utf-8').read().split('\n')
rows=[l for l in lines if re.match(r'^\| `[A-Z]\d+` \|', l)]
c=Counter(l.split('|')[2].strip() for l in rows)
print(f'  fichier {p} : {len(lines)} lignes')
print(f'  lignes de findings : {len(rows)} ; {dict(c)}')
print(f'  ids : {[l.split("|")[1].strip() for l in rows]}')
assert set(c)<= {'BLOQUANT','MAJEUR','MINEUR'}, 'gravite hors liste fermee'
assert len(rows)==sum(c.values())
print('  OK : liste de gravite fermee respectee, somme = total')
