# m32 — chasse comparee sur des chaines IDENTIQUES : "JOUR" (aile droite), "ARGENT" (aile gauche),
# "EMPIRE"/"FAMILLE"/"PLUS" (dock), "BLANCHIR"/"AMELIORER" (boutons), "COLLECTER" (bouton or).
# Methode : groupes de colonnes encrees, on ne garde que le nombre de lettres attendu.
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
def lettres(px,fac,x0,x1,y0,y1,thr=110,gapcss=0.9):
    C=lambda v:int(round(v*fac))
    cnt=[sum(1 for y in range(C(y0),C(y1)) if lum(px[x,y])>thr) for x in range(C(x0),C(x1))]
    out=[];cur=None;bl=0
    for i,c in enumerate(cnt):
        if c>=1:
            if cur is None: cur=[i,i]
            else: cur[1]=i
            bl=0
        else:
            if cur is not None:
                bl+=1
                if bl>C(gapcss): out.append(cur);cur=None
    if cur: out.append(cur)
    return [((a+C(x0))/fac,(b+1+C(x0))/fac) for a,b in out]
CAS=[('canon','../ecran-canon.png',3.0,{'JOUR':(276,312,14,22),'ARGENT':(15,60,10.5,17.5)}),
     ('fiche19','../capture-fiche-1080x1920.png',2.755,{'JOUR':(340,368,10,18),'ARGENT':(63,105,10,17)})]
for name,f,fac,W in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); print(f'== {name} {im.size}')
    for k,(a,b,c,d) in W.items():
        L=lettres(px,fac,a,b,c,d)
        if L:
            print(f'   {k:8s} : {len(L)} groupes ; de {L[0][0]:.2f} a {L[-1][1]:.2f} (l={L[-1][1]-L[0][0]:.2f} CSS) ; lettres = ' + ', '.join(f'{p:.1f}-{q:.1f}' for p,q in L))
            if len(L)>1:
                pas=[(L[i+1][0]-L[i][0]) for i in range(len(L)-1)]
                print(f'      pas entre debuts de lettres : {[round(p,2) for p in pas]}  (moyen {sum(pas)/len(pas):.2f} CSS)')
