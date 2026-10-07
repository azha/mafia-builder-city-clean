# m17 — separer TAILLE et INTERLETTRAGE sur les libelles de bouton :
# on segmente les glyphes (colonnes d'encre) et on compare (a) la largeur MOYENNE d'un glyphe,
# (b) le pas moyen entre deux debuts de glyphe.
# Controle positif : le nombre de glyphes trouve doit valoir le nombre de lettres du mot.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def glyphes(im,nom,lib,n_attendu,x0,x1,y0,y1,sens):
    px=im.load()
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])
    col=[]
    for x in range(x0,x1):
        c=sum(1 for y in range(y0,y1) if (lum(px[x,y])-base>35 if sens=='clair' else base-lum(px[x,y])>35))
        col.append(c)
    segs=[];cur=None
    for i,c in enumerate(col):
        if c>0 and cur is None: cur=i
        elif c==0 and cur is not None:
            if i-cur>=2: segs.append((x0+cur,x0+i-1))
            cur=None
    if cur is not None: segs.append((x0+cur,x1-1))
    larg=[b-a+1 for a,b in segs]
    pas=[segs[i+1][0]-segs[i][0] for i in range(len(segs)-1)]
    print(f'    {nom:8s} {lib:14s} glyphes={len(segs)} (attendu~{n_attendu})  largeur moy={sum(larg)/len(larg):.1f}  pas moy={sum(pas)/len(pas):.2f}')
    print(f'       segments {segs}')
ref=charge(REF); j19=charge(J19); j24=charge(J24)
print('COMMANDER (9 lettres) — bouton or')
glyphes(ref,'REF','COMMANDER',9,688,940,950,1032,'sombre')
glyphes(j19,'JEU1920','COMMANDER',9,712,946,870,952,'sombre')
glyphes(j24,'JEU2400','COMMANDER',9,712,946,1276,1358,'sombre')
print('BLANCHIR (8 lettres) — bouton fantome')
glyphes(ref,'REF','BLANCHIR',8,740,942,1440,1485,'clair')
glyphes(j19,'JEU1920','BLANCHIR',8,765,947,1300,1345,'clair')
glyphes(j24,'JEU2400','BLANCHIR',8,765,947,1707,1752,'clair')
