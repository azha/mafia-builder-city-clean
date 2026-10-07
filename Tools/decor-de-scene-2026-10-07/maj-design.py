#!/usr/bin/env python3
"""Régénère le bloc §4.1 de DESIGN.md (entre <!-- 4.1:DEBUT --> et <!-- 4.1:FIN -->) depuis teintes.json. Lancer APRÈS teintes.py."""
import json,os,re
D=os.path.dirname(os.path.abspath(__file__)); t=json.load(open(os.path.join(D,'teintes.json'),encoding='utf-8'))
tj=[x for x in t if x['regle']=='JETON']; tl=[x for x in t if x['regle']!='JETON']
tab='\n'.join(f"| `{x['hex']}` | `{x['jeton']}` | {x['d']} |" for x in tj)
bloc=f"""<!-- 4.1:DEBUT (régénéré par maj-design.py ; vérifié par verifier-design.py) -->
**{len(t)} couleurs : {len(tj)} à d ≤ 4 d'un jeton (écrites PAR le jeton ; dérive ≤ 3,62/255, « le prix de la règle », précédent `DecorAuComptoir`) · {len(tl)} littéraux admis (d > 4)** — la liste complète des littéraux est dans `teintes.json` (`regle = littéral`).
| couleur | jeton | d |
|---|---|---|
{tab}
<!-- 4.1:FIN -->"""
p=os.path.join(D,'DESIGN.md'); d=open(p,encoding='utf-8').read()
d=re.sub(r'<!-- 4\.1:DEBUT.*?<!-- 4\.1:FIN -->',lambda m:bloc,d,flags=re.S); open(p,'w',encoding='utf-8').write(d); print('§4.1 régénéré :',len(t),len(tj),len(tl))
