#!/usr/bin/env python3
"""Écran ⑥ : sites Libelle atteints depuis BuildLayout (gestionnaires `=>` exclus : ils ne tournent pas à la construction)
et jamais rejoués par RendreTousLesLibelles. Usage : python3 Tools/juge-donnees/i18n/construction-ecran-6.py <dossier du sites-libelle.json>"""
import re,json,sys
S=sys.argv[1]; L='Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs'
t=re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*', lambda m: m.group(1) or '', open(L,encoding='utf-8').read())
meths={}
for m in re.finditer(r'(?m)^\s{8}(?:(?:public|private|protected|internal|static|override)\s+)+[\w<>\[\],. ]+?\s(\w+)\s*\([^;{]*\)\s*\{',t):
    j=m.end()-1; d=0
    for k in range(j,len(t)):
        d+= t[k]=='{'; d-= t[k]=='}'
        if d==0: break
    meths[m.group(1)]=t[j:k]
def sans_lambdas(b):   # un gestionnaire (`() => …`, `x => …`, `delegate {…}`) ne s'exécute pas à la construction
    b=re.sub(r'\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)', ')', b)
    return re.sub(r'(?:\(\s*\w*\s*\)|\b\w+)\s*=>\s*[^;]*', '', b)
def atteint(racine):
    vu=set(); pile=[racine]
    while pile:
        x=pile.pop()
        if x in vu or x not in meths: continue
        vu.add(x); pile+= [c for c in re.findall(r'(?<![\w.])(\w+)\s*\(',sans_lambdas(meths[x])) if c in meths]
    return vu
construction=atteint('BuildLayout'); rej=atteint('RendreTousLesLibelles')
r=json.load(open(f'{S}/sites-libelle.json'))[L]
c=[s for s in r if s['methode'] in construction and s['methode'] not in rej]
print(f"⑥ : {len(r)} sites · rejoués {sum(1 for s in r if s['methode'] in rej)} · construction non rejouée {len(c)} sites / {len(set(s['cle'] for s in c))} clés · non servies {[s['cle'] for s in c if not s['servie']]}")
print('construction :', sorted({s['methode'] for s in c}))
a=[s for s in r if s['methode'] not in construction and s['methode'] not in rej]
print(f"ni construction ni rejeu : {len(a)} sites / {len(set(s['cle'] for s in a))} clés · non servies {[s['cle'] for s in a if not s['servie']]} ; méthodes {sorted({s['methode'] for s in a})}")
