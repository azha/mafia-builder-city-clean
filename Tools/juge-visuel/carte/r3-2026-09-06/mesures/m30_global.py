# m30 - COUCHE GLOBALE (palette, luminance, densite) et CONTRASTE des noms sur la peinture.
# Les zones de la couche d'ETAT de la maquette (ecussons, nappes, disque or, legende) sont
# MASQUEES des deux cotes pour que la comparaison ne mesure pas ce qui est ASSUME.
# CONTROLE POSITIF : le fleuve (aplat present des deux cotes) doit coincider a ~1/255.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import statistics
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
w=Image.open('ref_warp.png').convert('RGB'); Wp=w.load()
print('ref',ref.size,'cap',cap.size,'ref_warp',w.size)
# zones ASSUMEES a masquer, en coordonnees de la CAPTURE (englobent large)
MASQUES=[(150,400,290,520),(560,390,700,500),   # ecussons 1 et 2
         (130,800,260,930),(370,800,500,930),   # 3 et 4
         (350,1590,500,1720),(600,1740,740,1880), # 5 et 6
         (0,400,420,560),(360,590,830,830),     # nappes BASSINS / HAUTES-MARCHES
         (760,1600,1080,1790),                  # LA LISIERE + disque or
         (0,2040,1080,2152),                    # legende + pastille
         (240,330,320,420)]                     # drapeau rouge
def masque(x,y):
    for a,b,c_,d in MASQUES:
        if a<=x<=c_ and b<=y<=d: return True
    return False
pix_r=[];pix_c=[]
for y in range(240,2140,3):
    for x in range(6,1074,3):
        if masque(x,y): continue
        pix_r.append(Wp[x,y]); pix_c.append(C[x,y])
print('n echantillons :',len(pix_r))
def couche(pix,lab):
    Ls=[L(p) for p in pix]; Ls.sort()
    dens=sum(1 for v in Ls if v>110)/len(Ls)
    # palette quantifiee grossiere
    h={}
    for p in pix:
        k=(p[0]//24,p[1]//24,p[2]//24); h[k]=h.get(k,0)+1
    top=sorted(h.items(),key=lambda kv:-kv[1])[:6]
    print(f'  {lab}: L moy {statistics.mean(Ls):6.2f}  med {Ls[len(Ls)//2]:6.1f}  p90 {Ls[int(len(Ls)*0.9)]:6.1f}  p99 {Ls[int(len(Ls)*0.99)]:6.1f}  densite L>110 {100*dens:5.2f} %')
    print('     palette : '+' | '.join(f'({k[0]*24+12},{k[1]*24+12},{k[2]*24+12}) {100*v/len(pix):.1f}%' for k,v in top))
couche(pix_r,'maquette recalee')
couche(pix_c,'jeu            ')
print('\nCONTROLE POSITIF — fleuve (aplat present des deux cotes), fenetre 41x41 en (760,1100) ref')
cx,cy=r2c(760,1100)
def med(px,x0,y0):
    vals=[px[int(x0)+i,int(y0)+j] for i in range(-20,21) for j in range(-20,21)]
    return tuple(statistics.median([v[k] for v in vals]) for k in range(3))
print('   maquette',med(R,760,1100),'  jeu',med(C,cx,cy))
print('\nCONTROLE POSITIF — route or, point homologue ref (200, 660)')
print('   maquette',med(R,200,662),'  jeu',med(C,*r2c(200,662)))
print('\n--- CONTRASTE encre/peinture des noms (WCAG, sur l art reel) ---')
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def relL(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def contraste(a,b):
    la,lb=relL(a),relL(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
import json
mm=json.load(open('noms_v3.json'))
print(f"{'quartier':19s} {'encre maq':>17s} {'peinture':>15s} {'C maq':>6s} | {'encre jeu':>17s} {'peinture':>15s} {'C jeu':>6s}")
cr=[];cc=[]
for nom,xs,ys,src in NOMS:
    d=mm.get(nom)
    if not d or not d['ref'] or not d['cap']: continue
    # peinture lointaine : mediane d'un anneau a 20-26 px du centre du mot, sur la ligne
    def fondloc(px,cx,cy,rad=(24,34)):
        vals=[]
        for dx in range(-rad[1],rad[1]+1,2):
            for dy in (-rad[1],-rad[0],rad[0],rad[1]):
                x=int(cx+dx); y=int(cy+dy)
                if 0<=x<1080 and 0<=y<2400: vals.append(px[x,y])
        return tuple(statistics.median([v[k] for v in vals]) for k in range(3))
    fr=fondloc(R,d['ref']['cx'],d['ref']['cy']); fc=fondloc(C,d['cap']['cx'],d['cap']['cy'])
    er=tuple(int(v) for v in d['ref']['col']); ec=tuple(int(v) for v in d['cap']['col'])
    a=contraste(er,fr); b=contraste(ec,fc); cr.append(a); cc.append(b)
    print(f"{nom:19s} {str(er):>17s} {str(fr):>15s} {a:6.2f} | {str(ec):>17s} {str(fc):>15s} {b:6.2f}")
print(f'\n  contraste : maquette min {min(cr):.2f} med {statistics.median(cr):.2f} ; jeu min {min(cc):.2f} med {statistics.median(cc):.2f}  (plancher de doctrine 4,5:1)')
