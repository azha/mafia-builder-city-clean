#!/usr/bin/env python3
"""Separation du 'b' (or sature) et du 'i' (gris chaud desature) du JETON par la COULEUR,
sur la LARGEUR ENTIERE de la boite -> aucune fenetre ne peut tronquer (piege paye au 09).
b : #d9ab4e (217,171,78)  R-B = 139   |   i : #9a8a6a (154,138,106)  R-B = 48
Controle positif : le ROND (#d9ab4e) doit tomber dans la classe 'b' des deux cotes.
Controle negatif : le fond du jeton (#241c11, R-B=19) ne doit tomber dans AUCUNE classe."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def cls(p):
    l=lum(p); rb=p[0]-p[2]
    if l<70: return None
    if rb>=95: return "b"
    if 25<=rb<95: return "i"
    return None
def carte(im,y0,y1,x0,x1,tag):
    px=im.load()
    res={}
    for c in ("b","i"):
        pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if cls(px[x,y])==c]
        if not pts: res[c]=None; continue
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        res[c]=(min(xs),max(xs),min(ys),max(ys),len(pts))
    print(f"  [{tag}] fenetre x=[{x0},{x1}) y=[{y0},{y1})")
    for c in ("b","i"):
        v=res[c]
        if v: print(f"     {c}: x={v[0]}..{v[1]} (l={v[1]-v[0]+1:4d})  y={v[2]}..{v[3]} (h={v[3]-v[2]+1:3d})  n={v[4]}")
        else: print(f"     {c}: VIDE")
    return res
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
print("\n=== JETON entier ===")
r=carte(ref,650,810,56,1024,"REF")
c=carte(cap,440,558,51,1029,"CAP")
print("\n=== 'i' ligne par ligne, largeur entiere ===")
def lignes_i(im,y0,y1,x0,x1,tag):
    px=im.load(); rows=[]
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if cls(px[x,y])=="i"]
        rows.append((min(xs),max(xs)) if xs else None)
    out=[];cur=None
    for i,v in enumerate(rows):
        if v:
            if cur is None: cur=[i,i,v[0],v[1]]
            else: cur[1]=i; cur[2]=min(cur[2],v[0]); cur[3]=max(cur[3],v[1])
        else:
            if cur: out.append(cur); cur=None
    if cur: out.append(cur)
    print(f"  [{tag}]")
    for a,b,xa,xb in out:
        if b-a<4: continue
        print(f"     ligne y={y0+a}..{y0+b} (h={b-a+1:2d})  x={xa}..{xb} (l={xb-xa+1:4d})")
lignes_i(ref,650,810,56,1024,"REF i")
lignes_i(cap,440,558,51,1029,"CAP i")
print("\nCONTROLE POSITIF rond: classe du pixel (110,728)REF =",cls(ref.load()[110,728]),"/ (105,498)CAP =",cls(cap.load()[105,498]),"(attendu 'b')")
print("CONTROLE NEGATIF fond jeton: classe de (500,660)REF =",cls(ref.load()[500,660]),"/ (500,450)CAP =",cls(cap.load()[500,450]),"(attendu None)")
