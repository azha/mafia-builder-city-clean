# -*- coding: utf-8 -*-
"""Y a-t-il un cadre POINTILLE sur cet ecran, et l'un de ses rails porte-t-il un TROU central ?
Methode : sur chaque rail horizontal connu, compter les RUNS contigus de couleur de bord.
  cadre PLEIN     -> 1 run couvrant toute la largeur de la carte
  cadre POINTILLE -> N runs courts, periodiques
  rail TROUE      -> 2 runs longs separes par un trou
Controle POSITIF : la REFERENCE porte un vrai pointille connu, le separateur `.dm-fiche .l`
  (`border-top:1px dotted #c2bda4`) -> la sonde DOIT y rendre de nombreux runs courts.
Controle NEGATIF : un rail plein (bord de carte) doit rendre 1 seul run."""
from PIL import Image
def runs_de(px,y,x0,x1,cible,tol):
    rs=[];cur=None
    for x in range(x0,x1):
        p=px[x,y]
        ok=all(abs(p[i]-cible[i])<=tol for i in range(3))
        if ok:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: rs.append(tuple(cur)); cur=None
    if cur: rs.append(tuple(cur))
    return rs
def juge(px,y,x0,x1,cible,tol,lab):
    rs=runs_de(px,y,x0,x1,cible,tol)
    if not rs: print("   %-34s y=%4d : 0 run"%(lab,y)); return
    longs=[r for r in rs if r[1]-r[0]+1>=8]
    tot=sum(r[1]-r[0]+1 for r in rs); larg=x1-x0
    trous=[]
    for i in range(1,len(longs)):
        a=longs[i-1][1]; b=longs[i][0]
        if b-a-1>=8: trous.append((a+1,b-1,b-a-1))
    print("   %-34s y=%4d : %3d runs (%d longs)  couverture %3d/%d = %5.1f%%  trous>=8px : %s"
          %(lab,y,len(rs),len(longs),tot,larg,100.0*tot/larg,trous if trous else "aucun"))
    return trous

C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load()
R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load()
print("OUVERT cap %s ref %s"%(C.size,R.size))
print()
print("=== CONTROLE POSITIF : pointille reel de la REFERENCE (.dm-fiche .l, 1px dotted #c2bda4) ===")
for y in (790,862,934,1005,1077):
    juge(pr,y,80,1010,(194,189,164),22,"separateur pointille de la fiche")
print()
print("=== CONTROLE NEGATIF : rails PLEINS de la REFERENCE ===")
juge(pr,1782,60,1020,(44,54,64),8,"filet 2px plein de .dm-bas")
print()
print("=== CAPTURE : tous les rails horizontaux de cartes (haut ET bas) ===")
bord=(60,62,53)
paires=[("dm-glob",437,608),("rangee 1",727,852),("rangee 2",874,1000),("rangee 3",1022,1148),
        ("rangee 4",1170,1295),("rangee 5",1317,1443),("rangee 6",1465,1590),("rangee 7",1612,1738),
        ("rangee 8 (coupee)",1760,None)]
for lab,yh,yb in paires:
    juge(pc,yh,48,1032,bord,14,lab+" — rail HAUT")
    if yb: juge(pc,yb,48,1032,bord,14,lab+" — rail BAS")
print()
juge(pc,1956,48,1032,(90,73,42),14,"CTA — rail HAUT")
juge(pc,2096,48,1032,(90,73,42),14,"CTA — rail BAS")
juge(pc,396,20,1060,(59,61,53),10,"filet bas de .dm-tete")
print()
print("=== CAPTURE : existe-t-il un bord POINTILLE quelque part ? (jeton .dm-parcelle #5a5c4e) ===")
def compte(px,cible,tol,zone,pas=1):
    x0,y0,x1,y1=zone; n=0; ys=set()
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            if all(abs(px[x,y][i]-cible[i])<=tol for i in range(3)): n+=1; ys.add(y)
    return n,(min(ys),max(ys)) if ys else None
n,r=compte(pc,(90,92,78),8,(0,145,1080,2152))
print("   #5a5c4e (bord tirete de .dm-parcelle) dans toute la zone de contenu : n=%d  lignes=%s"%(n,r))
n,r=compte(pr,(90,92,78),8,(0,434,1080,2097))
print("   [meme sonde sur la REFERENCE, ou .dm-parcelle est aussi absent]      : n=%d  lignes=%s"%(n,r))
