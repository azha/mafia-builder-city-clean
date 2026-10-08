#!/usr/bin/env python3
"""Vérifie, par COMMANDE, que les chiffres de DESIGN.md sont ceux des mesures (exit 0 = tout égal ; exit 1 = écart listé). Revue ⊥ n°4 M2 : plus de compte à la main."""
import json,os,re,sys,collections,subprocess
D=os.path.dirname(os.path.abspath(__file__)); L=lambda n:json.load(open(os.path.join(D,n),encoding='utf-8'))
d=open(os.path.join(D,'DESIGN.md'),encoding='utf-8').read(); ko=[]
def chk(nom,a,b):
    print(('OK  ' if a==b else 'ÉCART'),nom,'| design:',a,'| mesure:',b)
    if a!=b: ko.append(nom)
# 1. teintes.json à jour (rejeu en mémoire)
avant=open(os.path.join(D,'teintes.json'),encoding='utf-8').read()
subprocess.run([sys.executable,os.path.join(D,'teintes.py')],stdout=subprocess.DEVNULL,check=True)
chk('teintes.json idempotent (rejeu de teintes.py)',open(os.path.join(D,'teintes.json'),encoding='utf-8').read()==avant,True)
t=L('teintes.json'); tj=sum(x['regle']=='JETON' for x in t)
m=re.search(r'\*\*(\d+) couleurs : (\d+) à d ≤ 4.*?(\d+) littéraux admis',d,re.S)
chk('§4.1 couleurs / jetons / littéraux',tuple(map(int,m.groups())),(len(t),tj,len(t)-tj))
lignes=set(re.findall(r'^\| `(#[0-9a-f]{6})` \| `\w+` \| [\d.]+ \|$',d[d.index('<!-- 4.1:DEBUT'):d.index('<!-- 4.1:FIN')],re.M))
chk('§4.1 lignes de la table = jetons du JSON',lignes,{x['hex'] for x in t if x['regle']=='JETON'})
# 2. filets
f=L('mesure-filets.json'); el=sum(r['n'] for r in f); cot=sum(len(e['cotes']) for r in f for e in r['el'])
rec={(len(e['cotes']),e['cotes'][0]['st'],e['cotes'][0]['col'],e['cotes'][0]['w']) for r in f for e in r['el']}
cols={c['col'].split('@')[0] for r in f for e in r['el'] for c in e['cotes']}
m=re.search(r'\*\*(\d+) éléments bordés, (\d+) côtés\*\*.*?\*\*(\d+) recettes distinctes\*\*.*?\*\*(\d+) couleurs de bord\*\*',d,re.S)
chk('§3.4 éléments / côtés / recettes / couleurs',tuple(map(int,m.groups())),(el,cot,len(rec),len(cols)))
idx=L('ecrans-index.json'); allc=sorted({c for x in idx if x[3] for c in x[3]['cadres']})
chk('mesure-filets couvre TOUS les cadres des 26 écrans',sorted(r['i'] for r in f),allc)
# 3. catalogue
rows=re.findall(r'^\| (\S+) \| [^|]+ \| (Posé|DéjàLivré|NonMonté) \|',d,re.M)
c=collections.Counter(s for _,s in rows)
chk('§4 : 26 lignes, 21 Posé / 4 DéjàLivré / 1 NonMonté (③ DéjàLivré : amendement du 08/10)',(len(rows),c['Posé'],c['DéjàLivré'],c['NonMonté']),(26,21,4,1))
chk('§4 : symboles = écrans de l\'INDEX avec cadres série 6',{s for s,_ in rows},{x[0] for x in idx if x[3]})
# 4. cohérence textuelle des décisions de la revue n°5 (greps)
chk('clip : RectMask2D exigé sur Decor/Support (§3.3 et D0)',d.count('RectMask2D')>=3,True)
chk('plus de « calculé au montage » du rayon',len(re.findall(r'(?i)calculé au montage',d)),0)
chk('composant CercleDeSupport présent, pas de « composant `RadialCercle` »',('CercleDeSupport' in d) and ('composant `RadialCercle`' not in d),True)
sys.exit(1 if ko else 0)
