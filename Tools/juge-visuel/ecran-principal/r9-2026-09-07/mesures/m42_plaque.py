# m42 — plaque de la fiche : alpha/couleur effectifs par regression contre l'art NU (planche district, memes lignes),
# et test du FLOU (l'art vu a travers correle-t-il mieux avec l'art brut ou avec l'art floute a 5 CSS ?)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from PIL import Image, ImageFilter
print('=== m42 plaque de la fiche : composition et flou ===')
ia=Image.open(DIST).convert('RGB'); pa=ia.load()
ib=Image.open(F2400).convert('RGB'); pb=ib.load()
print('   [ouvre] district2400', ia.size, ' / fiche2400', ib.size)
flou=ia.filter(ImageFilter.GaussianBlur(radius=5*SC_CAPT/2.0)); pf=flou.load()
X0,Y0,X1,Y1=33,1652,1046,2118
paires=[]
for y in range(Y0+20,Y1-20,2):
    for x in range(X0+20,X1-20,2):
        paires.append((pa[x,y],pb[x,y],pf[x,y]))
print('   %d paires (interieur de la plaque)' % len(paires))
def reg(idx_src, espace):
    out=[]
    for k in range(3):
        if espace=='srgb':
            X=[p[idx_src][k] for p in paires]; Y=[p[1][k] for p in paires]
        else:
            X=[srgb_vers_lin(p[idx_src][k]) for p in paires]; Y=[srgb_vers_lin(p[1][k]) for p in paires]
        n=len(X); mx=sum(X)/n; my=sum(Y)/n
        sxy=sum((X[i]-mx)*(Y[i]-my) for i in range(n)); sxx=sum((X[i]-mx)**2 for i in range(n)); syy=sum((Y[i]-my)**2 for i in range(n))
        p=sxy/sxx if sxx else 0; q=my-p*mx; a=1-p
        r=sxy/math.sqrt(sxx*syy) if sxx and syy else 0
        out.append((a,(q/a if abs(a)>1e-6 else float('nan')),r))
    return out
for esp in ('srgb','lineaire'):
    r=reg(0,esp)
    conv = (lambda v: v) if esp=='srgb' else lin_vers_srgb
    print('   art BRUT, %-9s : alpha %.3f/%.3f/%.3f ; couleur (%.1f,%.1f,%.1f) ; r %.3f/%.3f/%.3f'
          % (esp,r[0][0],r[1][0],r[2][0],conv(r[0][1]),conv(r[1][1]),conv(r[2][1]),r[0][2],r[1][2],r[2][2]))
r=reg(2,'srgb')
print('   art FLOUTE 5 CSS, srgb  : alpha %.3f/%.3f/%.3f ; r %.3f/%.3f/%.3f' % (r[0][0],r[1][0],r[2][0],r[0][2],r[1][2],r[2][2]))
# amplitude du decor vu a travers
L_art=[L(p[0]) for p in paires]; L_pl=[L(p[1]) for p in paires]
q=sorted(range(len(L_art)), key=lambda i:L_art[i])
d1=[L_pl[i] for i in q[:len(q)//10]]; d9=[L_pl[i] for i in q[-len(q)//10:]]
print('   amplitude du decor a travers la plaque : L du 1er decile d\'art %.2f -> L de la plaque %.2f ; 9e decile %.2f -> %.2f  (ecart %.2f L*)'
      % (med([L_art[i] for i in q[:len(q)//10]]), med(d1), med([L_art[i] for i in q[-len(q)//10:]]), med(d9), med(d9)-med(d1)))
# CANON : meme mesure impossible (pas d'art nu) -> on donne la prediction CSS
V0=hexa('#0c1320'); a0=0xef/255.0; V1=hexa('#080d17'); a1=0xf6/255.0
print('   CSS du canon : voile de %s a %.3f -> %s a %.3f  (alpha 0,937 -> 0,965)' % (str(V0),a0,str(V1),a1))
ec_s=[];ec_l=[]
for p in paires[::7]:
    for t,(V,a) in ((0,(V0,a0)),):
        ps=melange_srgb(V,(a0+a1)/2,p[0]); pl=melange_lineaire(V,(a0+a1)/2,p[0])
        ec_s.append(max(abs(ps[i]-p[1][i]) for i in range(3)))
        ec_l.append(max(abs(pl[i]-p[1][i]) for i in range(3)))
print('   ecart median |mesure - prediction CSS sRGB| = %.1f/255 ; |mesure - prediction CSS LINEAIRE| = %.1f/255' % (med(ec_s),med(ec_l)))
