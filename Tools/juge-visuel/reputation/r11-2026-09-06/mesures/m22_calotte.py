#!/usr/bin/env python3
"""m22 - LA CALOTTE : les quatre nombres, redefinis explicitement.
Coordonnees LOCALES du cadre. Convention de bord : NOMINALE, mi-alpha.
Classes : fond de carte / visage (creme2, L1<=90) / calotte-silhouette (le reste).
Definitions declarees par ce juge (r11) :
  N1 largeur MAX de la calotte / largeur MAX de la tete
     calotte = silhouette des rangees SANS visage ; tete = silhouette max toutes rangees
  N2 largeur de la calotte / largeur de la tete A LA JONCTION
     jonction = premiere rangee ou du visage apparait ; largeurs prises A CETTE RANGEE,
     largeur de tete = largeur max de la silhouette (breadth du crane)
  N3 hauteur d'attache = (y du bord bas de la calotte AU BORD, cote gauche)
     - (y du sommet de la tete), en px et en % de la hauteur de la tete
  N4 epaisseur LATERALE de la calotte a 15 % de la hauteur du visage sous le
     haut du visage : (bord gauche du visage) - (bord gauche de la silhouette)
  N5 courbure du bord bas = (y du bord bas au CENTRE) - (moyenne des y du bord bas
     aux deux extremites du visage), en px  (>0 = creux au milieu vers le BAS,
     <0 = arche : front degage au milieu)
Controle positif : le centre du visage doit valoir ~272 des deux cotes (m19).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAD={'ref':('reference-1080x2102.png',21,452,(17,24,35)),
     'jeu':('capture-1080x2400.png',18,482,(13,22,34))}
CREME2=(185,173,146)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
R={}
for nom in ('ref','jeu'):
    f,X0,Y0,FOND=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    sil={}; vis={}
    for y in range(560,830):
        s=[];v=[]
        for x in range(150,400):
            p=px[X0+x,Y0+y]
            if L1(p,FOND)<=18: continue
            s.append(x)
            if L1(p,CREME2)<=90: v.append(x)
        # ignore les rangees ou la ligne de balayage teal traverse (silhouette >200)
        if s and (s[-1]-s[0]+1)<200: sil[y]=(s[0],s[-1])
        if v: vis[y]=(v[0],v[-1])
    ytop=min(sil); yvis=min(vis)
    Wsil={y:sil[y][1]-sil[y][0]+1 for y in sil}
    Wvis={y:vis[y][1]-vis[y][0]+1 for y in vis}
    Wtete=max(Wsil.values()); ytete=max(Wsil,key=lambda y:Wsil[y])
    Wcal=max(Wsil[y] for y in sil if y<yvis); ycal=max((y for y in sil if y<yvis),key=lambda y:Wsil[y])
    # chin : derniere rangee ou le visage est encore large (>60 % de son max) avant le cou
    Wvmax=max(Wvis.values())
    chin=max(y for y in vis if Wvis[y]>0.60*Wvmax)
    hvis=chin-yvis+1
    y15=yvis+int(round(0.15*hvis))
    ep_g=vis[y15][0]-sil[y15][0]; ep_d=sil[y15][1]-vis[y15][1]
    # bord bas de la calotte : pour chaque x, premiere rangee de visage
    bord={}
    for x in range(150,400):
        for y in range(yvis,chin):
            p=px[X0+x,Y0+y]
            if L1(p,CREME2)<=90: bord[x]=y; break
    xs=sorted(bord)
    xc=(vis[y15][0]+vis[y15][1])//2
    # extremites : les colonnes a +-40 % de la demi-largeur du visage
    demi=(Wvis[y15])/2
    xg=int(xc-0.80*demi); xd=int(xc+0.80*demi)
    courb=bord.get(xc,0)-(bord.get(xg,0)+bord.get(xd,0))/2
    # hauteur d'attache : y du bord bas de la calotte au bord gauche du visage
    xatt=min(vis[y] [0] for y in vis if y<chin)
    yatt=max(bord[x] for x in bord if abs(x-xatt)<6) if any(abs(x-xatt)<6 for x in bord) else None
    print(f'  sommet de la tete y={ytop} · haut du visage y={yvis} · menton y={chin} (h visage {hvis})')
    print(f'  N1 calotte max {Wcal} px (y={ycal}) / tete max {Wtete} px (y={ytete}) = {Wcal/Wtete:.3f}')
    print(f'  N2 a la jonction (y={yvis}) : silhouette {Wsil[yvis]} px / tete max {Wtete} px = {Wsil[yvis]/Wtete:.3f}')
    print(f'  N3 hauteur d attache : haut de tete {ytop}, bord bas de la calotte au bord gauche y={yatt} '
          f'-> {None if yatt is None else yatt-ytop} px')
    print(f'  N4 epaisseur laterale a 15 % du visage (y={y15}) : gauche {ep_g} px · droite {ep_d} px '
          f'(silhouette {Wsil[y15]}, visage {Wvis[y15]})')
    print(f'  N5 courbure du bord bas : centre x={xc} y={bord.get(xc)} · gauche x={xg} y={bord.get(xg)} '
          f'· droite x={xd} y={bord.get(xd)} -> sagitta {courb:+.1f} px')
    R[nom]=dict(N1=Wcal/Wtete,N2=Wsil[yvis]/Wtete,N3=(None if yatt is None else yatt-ytop),
                N4=(ep_g+ep_d)/2,N5=courb,Wtete=Wtete,Wcal=Wcal,hvis=hvis)
print()
print('  === comparaison')
for k in ('N1','N2','N3','N4','N5','Wtete','Wcal','hvis'):
    a,b=R['ref'][k],R['jeu'][k]
    print(f'   {k}: ref {a} · jeu {b}')
