# m36 — « trop sombre » : de combien, et de quelle NATURE ?
# La maquette declare filter:brightness(.42) sur .scene.district + le voile .voile-scene.
# On prend la TEXTURE SOURCE (non assombrie, extraite de la page de l'atelier par le r3) comme
# ORIGINE COMMUNE, on l'apparie a la REFERENCE puis a la CAPTURE, et on ajuste
#     image = gain * texture + plancher      (par canal, par bande horizontale)
# Le GAIN est le brightness effectif ; le PLANCHER est ce que le voile ajoute.
# Controle positif : sur la REFERENCE, le gain doit retomber sur 0,42 (la valeur declaree) —
#   s'il ne le fait pas, mon appariement ou mon modele est faux et je ne conclus rien.
# Controle negatif : la correlation avec la texture RETOURNEE doit s'effondrer.
import os
from PIL import Image
ICI=os.path.dirname(os.path.abspath(__file__))
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
TEX=B+"r3-2026-10-07/mesures/texture-source-district.jpg"
REF=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
JEU=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
tex=Image.open(TEX).convert('RGB'); ref=Image.open(REF).convert('RGB'); jeu=Image.open(JEU).convert('RGB')
print("LU texture %s | REF %s | JEU %s" % (tex.size, ref.size, jeu.size))
gt=tex.convert('L'); gr=ref.convert('L'); gj=jeu.convert('L')
def ncc(a,b):
    n=len(a); ma=sum(a)/n; mb=sum(b)/n
    va=sum((v-ma)**2 for v in a)**.5; vb=sum((v-mb)**2 for v in b)**.5
    return sum((a[i]-ma)*(b[i]-mb) for i in range(n))/(va*vb) if va and vb else 0
def cherche(gimg, ya, yb, label):
    """trouve s,dx,dy tels que  image(x,y) ~ texture((x-dx)/s, (y-dy)/s)"""
    PTS=[(x,y) for y in range(ya,yb,max(2,(yb-ya)//28)) for x in range(60,1020,40)]
    A=[gimg.getpixel(p) for p in PTS]
    best=None
    for s in [1.10+0.04*k for k in range(36)]:
        for dx in range(-300,181,20):
            for dy in range(-700,401,25):
                Bv=[]
                ok=True
                for (x,y) in PTS:
                    X=int((x-dx)/s); Y=int((y-dy)/s)
                    if not (0<=X<tex.width and 0<=Y<tex.height): ok=False; break
                    Bv.append(gt.getpixel((X,Y)))
                if not ok: continue
                c=ncc(A,Bv)
                if best is None or c>best[0]: best=(c,s,dx,dy)
    c,s,dx,dy=best
    for s2 in [s-0.032+0.008*k for k in range(9)]:
        for dx2 in range(dx-18,dx+19,6):
            for dy2 in range(dy-24,dy+25,8):
                Bv=[];ok=True
                for (x,y) in PTS:
                    X=int((x-dx2)/s2); Y=int((y-dy2)/s2)
                    if not (0<=X<tex.width and 0<=Y<tex.height): ok=False; break
                    Bv.append(gt.getpixel((X,Y)))
                if not ok: continue
                cc=ncc(A,Bv)
                if cc>best[0]: best=(cc,s2,dx2,dy2)
    c,s,dx,dy=best
    # controle negatif
    Bv=[gt.getpixel((min(tex.width-1,max(0,int((x-dx)/s))), min(tex.height-1,max(0,int((y-dy)/s))))) for (x,y) in PTS]
    print(f"  {label}: r={c:+.3f}  s={s:.3f} dx={dx} dy={dy}   [controle negatif, texture retournee : r={ncc(A,Bv[::-1]):+.3f}]")
    return s,dx,dy
print("\n=== appariement a la texture source ===")
sr,dxr,dyr = cherche(gr,170,816,"REFERENCE ")
sj,dxj,dyj = cherche(gj,170,745,"CAPTURE   ")
def ajuste(img,s,dx,dy,ya,yb,label):
    px=img.load(); pt=tex.load()
    print(f"\n  {label} — ajustement  image = gain x texture + plancher, par bande :")
    n=4
    for i in range(n):
        y0=int(ya+(yb-ya)*i/n); y1=int(ya+(yb-ya)*(i+1)/n)
        for ca,nomc in ((0,'R'),(1,'G'),(2,'B')):
            X=[];Y=[]
            for y in range(y0,y1,2):
                for x in range(60,1020,4):
                    Xt=int((x-dx)/s); Yt=int((y-dy)/s)
                    if 0<=Xt<tex.width and 0<=Yt<tex.height:
                        X.append(pt[Xt,Yt][ca]); Y.append(px[x,y][ca])
            m=len(X); sx=sum(X); sy=sum(Y); sxx=sum(v*v for v in X); sxy=sum(X[k]*Y[k] for k in range(m))
            a=(m*sxy-sx*sy)/(m*sxx-sx*sx); b=(sy-a*sx)/m
            if nomc=='R': print(f"    bande y {y0:4d}..{y1:4d} :", end="")
            print(f"  {nomc} gain={a:.3f} plancher={b:+.1f}", end="")
        print()
ajuste(ref,sr,dxr,dyr,170,816,"REFERENCE (brightness declare : 0,420)")
ajuste(jeu,sj,dxj,dyj,170,745,"CAPTURE  ")
