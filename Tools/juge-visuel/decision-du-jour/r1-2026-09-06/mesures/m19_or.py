#!/usr/bin/env python3
"""m19 - les ORS de l'ecran : le libelle du jeton, le chiffre, l'anneau du jeton.
Le 1er jet de m18 avait pose la fenetre de 'libre' A COTE du texte -> valeur non recevable ;
ici on LOCALISE d'abord la ligne de texte, puis on echantillonne son encre.
Controle positif : la fenetre retenue doit contenir >= 8 lignes encrees.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def rl(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def K(a,b):
    l1,l2=rl(a),rl(b)
    if l1<l2: l1,l2=l2,l1
    return (l1+0.05)/(l2+0.05)
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def lignes(im,x0,x1,y0,y1,seuil,label):
    px=im.load(); runs=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if L(px[x,y])>seuil)
        if n>=3:
            if cur is None: cur=[y,y]
            else: cur[1]=y
        else:
            if cur: runs.append(tuple(cur)); cur=None
    if cur: runs.append(tuple(cur))
    print(f"[{label}] x={x0}..{x1} y={y0}..{y1} seuil>{seuil} : lignes encrees {runs}")
    return runs

def encre(im,x0,x1,y0,y1,label,quoi,fond=(13,13,13),pct=8):
    px=im.load()
    vals=sorted([px[x,y] for y in range(y0,y1) for x in range(x0,x1)],key=L,reverse=True)
    k=max(1,len(vals)*pct//100)
    c=vals[:k]
    e=(round(statistics.median(p[0] for p in c)),round(statistics.median(p[1] for p in c)),round(statistics.median(p[2] for p in c)))
    print(f"[{label}] {quoi:28s} encre={str(e):16s} lum={L(e):6.1f}  contraste/fond{fond}={K(e,fond):5.2f}:1")
    return e

print("\n-- localisation du libelle sous le jeton --")
lignes(ref,760,1000,1360,1440,60,'REF LIBRE')
lignes(cap,820,1010,1580,1660,45,'CAP libre')

print("\n-- encre du libelle --")
er=encre(ref,780,975,1380,1412,'REF','LIBRE',(15,17,21))
ec=encre(cap,855,975,1592,1620,'CAP','libre',(13,13,13))
print(f"   -> ecart RGB = ({ec[0]-er[0]:+d},{ec[1]-er[1]:+d},{ec[2]-er[2]:+d})  lum {L(er):.1f} -> {L(ec):.1f} ({(L(ec)-L(er))/L(er)*100:+.1f}%)")

print("\n-- autres ors (echantillon median d'une fenetre INTERIEURE, a >=3px de tout bord) --")
def med(im,x0,x1,y0,y1,label,quoi):
    px=im.load()
    v=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    m=(round(statistics.median(p[0] for p in v)),round(statistics.median(p[1] for p in v)),round(statistics.median(p[2] for p in v)))
    print(f"[{label}] {quoi:28s} mediane={str(m):16s} lum={L(m):6.1f}")
    return m
a=med(ref,850,900,1250,1290,'REF',"corps du jeton (or)")
b=med(cap,880,940,1470,1520,'CAP',"corps du jeton (or)")
print(f"   -> ecart RGB = ({b[0]-a[0]:+d},{b[1]-a[1]:+d},{b[2]-a[2]:+d})  lum {L(a):.1f} -> {L(b):.1f} ({(L(b)-L(a))/L(a)*100:+.1f}%)")
c=med(ref,152,172,1420,1440,'REF',"pastille pleine (rouge)")
d=med(cap,192,206,1576,1590,'CAP',"pastille pleine (or)")
print(f"   -> ecart RGB = ({d[0]-c[0]:+d},{d[1]-c[1]:+d},{d[2]-c[2]:+d})")
