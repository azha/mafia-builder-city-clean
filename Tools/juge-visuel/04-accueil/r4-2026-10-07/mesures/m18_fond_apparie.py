# m18 — EXPERIENCE A UNE SEULE VARIABLE sur le diorama.
# Etape 1 : affiner l'homographie (echelle s, offsets) qui envoie le fond du JEU sur celui de la REF.
# Etape 2 : comparer la luminance SUR LE MEME CONTENU (sinon on compare deux cadrages differents).
# Controle positif : la correlation apres appariement doit depasser 0,9 ; le controle NEGATIF est
# l'appariement avec l'image retournee, qui doit s'effondrer.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
ir=Image.open(R).convert('RGB'); ij=Image.open(J).convert('RGB')
print("REF",ir.size,"  JEU",ij.size)
gr=ir.convert('L'); gj=ij.convert('L')
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def ncc(a,b):
    n=len(a); ma=sum(a)/n; mb=sum(b)/n
    va=sum((v-ma)**2 for v in a)**0.5; vb=sum((v-mb)**2 for v in b)**0.5
    return sum((a[i]-ma)*(b[i]-mb) for i in range(n))/(va*vb) if va and vb else 0
# echantillon de points du JEU dans la zone de DECOR VISIBLE (sous le bandeau, au-dessus du panneau)
PTS=[(x,y) for y in range(300,800,50) for x in range(60,1020,60)]
def score(s,dx,dy,flip=False):
    a=[];b=[]
    for (x,y) in PTS:
        X=int(s*x+dx); Y=int(s*y+dy)
        if not (0<=X<ir.width and 0<=Y<ir.height): return -2,0
        a.append(gj.getpixel((x,y))); b.append(gr.getpixel((X,Y)))
    if flip: b=b[::-1]
    return ncc(a,b), len(a)
best=None
for s in [1.06+0.005*k for k in range(17)]:
    for dx in range(-110,-10,4):
        for dy in range(-60,60,4):
            c,_=score(s,dx,dy)
            if best is None or c>best[0]: best=(c,s,dx,dy)
print(f"  grossier : r={best[0]:.4f} s={best[1]:.3f} dx={best[2]} dy={best[3]}")
c0,s0,dx0,dy0=best
for s in [s0-0.006+0.002*k for k in range(7)]:
    for dx in range(dx0-5,dx0+6):
        for dy in range(dy0-5,dy0+6):
            c,_=score(s,dx,dy)
            if c>best[0]: best=(c,s,dx,dy)
c,s,dx,dy=best
print(f"  AFFINE  : r={c:.4f}  s={s:.4f}  dx={dx}  dy={dy}   (REF = s*JEU + offset)")
print(f"  CONTROLE NEGATIF (reference retournee) : r={score(s,dx,dy,flip=True)[0]:+.4f}")
print(f"  => le jeu rend le diorama a {1/s*100:.1f} % du zoom de la reference")
print()
# Etape 2 : luminance sur le MEME contenu
pxr=ir.load(); pxj=ij.load()
zones=[("decor haut  (y 300..450 du jeu)",300,450),("decor milieu (y 450..620)",450,620),
       ("decor bas   (y 620..800)",620,800)]
print("  %-32s %8s %8s %8s %8s %8s" % ("zone (coord. JEU)","REF lum","JEU lum","rapport","REF p90","JEU p90"))
for nom,ya,yb in zones:
    A=[];Bv=[]
    for y in range(ya,yb,2):
        for x in range(60,1020,3):
            X=int(s*x+dx); Y=int(s*y+dy)
            if 0<=X<ir.width and 0<=Y<ir.height:
                A.append(lum(pxr[X,Y])); Bv.append(lum(pxj[x,y]))
    A.sort(); Bs=sorted(Bv)
    ma=sum(A)/len(A); mb=sum(Bv)/len(Bv)
    print("  %-32s %8.2f %8.2f %8.3f %8.1f %8.1f   n=%d" % (nom,ma,mb,mb/ma,A[int(len(A)*.9)],Bs[int(len(Bs)*.9)],len(A)))
# percentiles globaux sur toute la zone de decor
A=[];Bv=[]
for y in range(300,800,2):
    for x in range(60,1020,3):
        X=int(s*x+dx); Y=int(s*y+dy)
        if 0<=X<ir.width and 0<=Y<ir.height:
            A.append(lum(pxr[X,Y])); Bv.append(lum(pxj[x,y]))
A.sort(); Bv.sort()
print("\n  percentiles de luminance sur le MEME contenu (zone de decor entiere) :")
print("   %-6s %8s %8s %8s" % ("perc","REF","JEU","JEU/REF"))
for q in (5,10,25,50,75,90,95,99):
    a=A[int(len(A)*q/100)]; b=Bv[int(len(Bv)*q/100)]
    print("   p%-5d %8.2f %8.2f %8.3f" % (q,a,b,(b/a if a else 0)))
