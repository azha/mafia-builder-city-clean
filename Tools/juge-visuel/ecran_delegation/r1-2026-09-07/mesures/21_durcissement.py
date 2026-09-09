#!/usr/bin/env python3
"""DURCISSEMENT des trois conclusions d'ABSENCE. Un motif qui rend le resultat espere doit
etre durci, pas conclu (socle). On rejoue chaque 'absent' par un critere qui NE SUPPOSE PAS
la forme attendue.
(A) m1 : y a-t-il, entre la derniere plaque et le CTA, UNE ligne pleine largeur nettement plus
    claire que ses deux voisines -- de N'IMPORTE QUELLE couleur ? (le balayage du 07 visait
    #2c3640 : il raterait un filet de teinte differente)
(B) m5 : l'emphase du .sv-dit est-elle portee par une autre TEINTE plutot que par la clarte ?
    (le 15 comparait des luminances : il raterait un or ou un cyan de meme clarte)
(C) m9 : la rangee EN TROP existe-t-elle dans le DOM du cadre #73 ? comptage par cadre.
Controle positif (A) : le meme detecteur DOIT trouver le filet dans la REFERENCE.
Controle positif (B) : il DOIT voir l'ecart de teinte la ou il y en a un (le 'vous' cyan)."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
def bande(px,y,x0,x1):
    vs=[px[x,y] for x in range(x0,x1)]; vs.sort(key=lum); return vs[len(vs)//2]
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load()
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pk=cap.load()
print("REF",ref.size,"CAP",cap.size)
print("\n=== (A) une ligne pleine largeur plus claire que ses voisines, TOUTE couleur ===")
def trait(px,y0,y1,x0,x1,tag):
    hits=[]
    for y in range(y0,y1):
        c=bande(px,y,x0,x1); l=lum(c)
        a=lum(bande(px,y-6,x0,x1)); b=lum(bande(px,y+6,x0,x1))
        if l-max(a,b)>=8: hits.append((y,round(l-max(a,b),1),hx(c)))
    print(f"   [{tag}] y=[{y0},{y1}) sur x=[{x0},{x1}) -> {len(hits)} ligne(s) : {hits[:8]}{' ...' if len(hits)>8 else ''}")
    return hits
trait(pr,1460,1935,120,960,"REF  (controle positif : le filet doit sortir)")
trait(pk,1200,1990,120,960,"CAP  (entre la derniere plaque et le CTA)")
print("\n=== (B) l'emphase du sv-dit passe-t-elle par la TEINTE ? ===")
def teinte(px,y0,y1,x0,x1,tag):
    ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum,reverse=True); sel=ps[:max(1,len(ps)//15)]
    m=tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3))
    print(f"   [{tag}] encre={hx(m)} {m}  R-B={m[0]-m[2]:+4d}  R-G={m[0]-m[1]:+4d}")
    return m
a=teinte(pr,1826,1858,51,450,"REF courant "); b=teinte(pr,1826,1858,460,870,"REF GRAS    ")
c=teinte(pk,1894,1926,43,445,"CAP courant "); d=teinte(pk,1894,1926,455,865,"CAP GRAS    ")
print(f"   ecart de teinte (R-B) : REF {abs((b[0]-b[2])-(a[0]-a[2]))}  |  CAP {abs((d[0]-d[2])-(c[0]-c[2]))}")
print(f"   ecart RGB complet     : REF {max(abs(a[i]-b[i]) for i in range(3))}  |  CAP {max(abs(c[i]-d[i]) for i in range(3))}")
e=teinte(pk,658,675,922,996,"CONTROLE + : 'vous' cyan de la capture")
print(f"   controle positif de teinte : 'vous' cyan vs texte de plaque -> R-B={e[0]-e[2]} (tres negatif attendu)")
