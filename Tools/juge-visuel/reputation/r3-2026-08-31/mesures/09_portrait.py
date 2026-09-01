# -*- coding: utf-8 -*-
"""09 — LE PORTRAIT (angle mort A7 déclaré par l'auteur : aucune garde ne lit une forme).
On classe chaque pixel de la boîte du portrait par PROXIMITÉ à un jeton (distance L1 <= 24),
puis on rend, pour chaque trait, sa boîte d'encre, son aire, et son remplissage aire/boîte.
Toutes les longueurs sont ramenées en UNITÉS DU viewBox SVG (62 x 78) : la maquette rend le SVG
à 96 px CSS de large, soit 288 px en réf (x3,0) et 345,6 px en capture (x3,6) ; l'unité vaut
donc 4,645 px en réf et 5,574 px en capture. C'est la seule façon de comparer les deux.
Contrôle positif : la LARGEUR du buste (path 6..56 = 50 unités) est écrite dans le générateur ;
elle doit ressortir à ~50 u des deux côtés.
Contrôle négatif : le remplissage aire/boîte doit SÉPARER un triangle (~0,43-0,50) d'un
rectangle (1,00) ; on l'exerce sur le cou (un vrai rectangle) qui doit sortir à ~1,00."""
from PIL import Image
JET={'creme':(234,224,200),'creme2':(185,173,146),'carte2':(22,25,27),'rang':(35,42,45),
     'fond':(11,16,22),'carte':(17,24,35)}
def classe(p,tol=24):
    best,bd=None,1e9
    for n,c in JET.items():
        d=sum(abs(a-b) for a,b in zip(p,c))
        if d<bd: best,bd=n,d
    return best if bd<=tol else None
CAS=[('REF','/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',
      4.6452,(100,808,398,1182)),
     ('CAP','/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
      5.5742,(106,528,464,972))]
res={}
for nom,path,u,(x0,y0,x1,y1) in CAS:
    im=Image.open(path).convert('RGB'); px=im.load()
    print('='*76); print(nom,path.split('/')[-1],im.size,' boite portrait',(x0,y0,x1,y1),
          ' 1 unite SVG = %.3f px'%u)
    m={}
    for y in range(y0,y1):
        for x in range(x0,x1):
            k=classe(px[x,y])
            if k: m.setdefault(k,[]).append((x,y))
    res[nom]={}
    for k in ('creme2','creme','carte2','rang','fond','carte'):
        pts=m.get(k,[])
        if not pts: print('  %-8s ABSENT'%k); continue
        bx0=min(p[0] for p in pts); bx1=max(p[0] for p in pts)
        by0=min(p[1] for p in pts); by1=max(p[1] for p in pts)
        aire=len(pts); boite=(bx1-bx0+1)*(by1-by0+1)
        print('  %-8s boite %6.1f x %6.1f u | aire %7.1f u2 | aire/boite %.3f | pos (%.1f, %.1f) u'
              %(k,(bx1-bx0+1)/u,(by1-by0+1)/u,aire/u/u,aire/boite,(bx0-x0)/u,(by0-y0)/u))
        res[nom][k]=(bx0,by0,bx1,by1,aire,u,x0,y0)
    # ---- traits séparés : col (creme sous le cou) / cou (creme2 rectangulaire) / tete
    for k,ylim,lib in (('creme2',None,'creme2 total'),):
        pass
    if 'creme2' in res[nom]:
        bx0,by0,bx1,by1,_,_,_,_=res[nom]['creme2']
        # la tete : moitié haute du creme2 ; le cou : sous le menton
        ymid=by0+int((by1-by0)*0.72)
        tete=[(x,y) for x in range(x0,x1) for y in range(by0,ymid) if classe(px[x,y])=='creme2']
        cou=[(x,y) for x in range(x0,x1) for y in range(ymid,by1+1) if classe(px[x,y])=='creme2']
        for lib,pts in (('  tete',tete),('  cou',cou)):
            if not pts: continue
            a0=min(p[0] for p in pts);a1=max(p[0] for p in pts)
            b0=min(p[1] for p in pts);b1=max(p[1] for p in pts)
            print('   %-8s boite %6.1f x %6.1f u | aire %7.1f u2 | aire/boite %.3f'
                  %(lib,(a1-a0+1)/u,(b1-b0+1)/u,len(pts)/u/u,len(pts)/((a1-a0+1)*(b1-b0+1))))
