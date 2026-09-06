# -- m03 : profil VERTICAL du filet a x fixe. Convention de bord : (a) coeur = px pleins ; (b) nominal = largeur a mi-alpha.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def profil(key, xc, y0=47, y1=57):
    s=sc(key); im=img(key); d=im.load(); xp=int(round(xc*s))
    print("  %s  x=%.1f CSS (px %d), image %s"%(key,xc,xp,im.size))
    rows=[]
    for yp in range(int(y0*s), int(y1*s)):
        p=d[xp,yp]; rows.append((yp,yp/s,p,round(lum(p),1)))
    for r in rows: print("    yp=%4d y=%7.3f  rgb=%-16s L=%.1f"%(r[0],r[1],str(r[2]),r[3]))
    return rows

def epaisseurs(rows, base, pic):
    """base = luminance du fond ; pic = luminance du trait. coeur = >=95% du pic ; nominal = somme des alphas."""
    tot=0.0; coeur=0
    for _,_,p,L in rows:
        a=(L-base)/(pic-base)
        a=max(0.0,min(1.0,a))
        tot+=a
        if a>=0.95: coeur+=1
    return tot, coeur

print("=== CANON : filet a x=300 CSS ===")
r=profil('ref',300)
print("=== CANON : filet a x=90 CSS ===")
r90=profil('ref',90)

print()
print("=== c19 : filet a x=300 CSS ===")
c=profil('c19',300)
print("=== c24 : filet a x=300 CSS ===")
c2=profil('c24',300)
