# -*- coding: utf-8 -*-
"""m15 - volutes (fenetres serrees, hors blocs de texte) + bloc ARGENT + barre de ratio.
Fenetres : GAUCHE x 0..17 (le canon place `.aile.gauche` a x=17, donc pas de texte) ;
DROITE x 376..392 (le canon place `.aile.droite` jusqu'a x=375). Sonde = pixel plus clair de
>=6 L que la mediane de ses voisins verticaux a +-5/6 CSS (elimine un fond degrade).
CONTROLE DE CAPACITE : la meme sonde, meme fenetre GAUCHE, doit trouver la volute du canon."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))

def sonde(cle,x0,x1,y0=16.0,y1=36.0,seuil=6.0):
    im,f=ouvrir(cle,taire=True); px=im.load()
    hits=[]
    for yy in range(int(y0*f),int(y1*f)):
        for xx in range(int(x0*f),int(x1*f)):
            c=px[xx,yy]
            vois=[L(px[xx,yy+k]) for k in (-6,-5,5,6)]
            if L(c)-mediane(vois)>=seuil: hits.append((xx/f,yy/f,c))
    return hits

print("=== m15 ===\n-- VOLUTES")
for cle in ['canon','j1920','j2400']:
    ouvrir(cle)
    for nom,(x0,x1) in [('GAUCHE',(0.0,17.0)),('DROITE',(376.0,392.0))]:
        h=sonde(cle,x0,x1)
        if not h:
            print("   %-6s %-6s : 0 px -> ABSENTE"%(cle,nom)); continue
        xs=[p[0] for p in h]; ys=[p[1] for p in h]
        c=tuple(int(mediane([p[2][k] for p in h])) for k in range(3))
        im,f=ouvrir(cle,taire=True); px=im.load()
        fond=med_fenetre(im,int(((x0+x1)/2)*f),int(38*f),4)
        print("   %-6s %-6s : %4d px  x %.2f..%.2f  y %.2f..%.2f  encre mediane %s  fond local %s"
              %(cle,nom,len(h),min(xs),max(xs),min(ys),max(ys),c,fond))
        if cle=='canon' and nom=='GAUCHE':
            # opacite resultante : (encre - fond)/(creme - fond) par canal
            cr=JETONS['creme']
            op=[ (c[k]-fond[k])/float(cr[k]-fond[k]) for k in range(3) if cr[k]!=fond[k]]
            print("      opacite resultante deduite (canon, cible .28) : %s"%["%.2f"%o for o in op])

print("\n-- BLOC ARGENT (aile gauche) : encre or-vif, jour au medaillon, barre de ratio")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load(); a=ANC[cle]
    # dernier pixel or-vif du montant, sur la bande du montant
    orx=[]
    for yy in range(int(18*f),int(42*f)):
        for xx in range(int(10*f),int(int(a['cx'])*f)):
            c=px[xx,yy]
            if dist_max(c,JETONS['or-vif'])<=45 and c[0]>150: orx.append((xx/f,yy/f))
    if orx:
        xmax=max(p[0] for p in orx); xmin=min(p[0] for p in orx)
        bord_nom = a['cx']-a['r_nom_ext']
        print("   %-6s : montant or-vif x %.2f..%.2f ; bord NOMINAL gauche du cerclage x=%.2f => jour %.2f CSS"
              %(cle,xmin,xmax,bord_nom,bord_nom-xmax))
    # barre de ratio : segment horizontal or, sous le montant
    bar=[]
    for yy in range(int(38*f),int(52*f)):
        n=0; xs=[]
        for xx in range(int(5*f),int(180*f)):
            c=px[xx,yy]
            if dist_max(c,JETONS['or'])<=55 and (c[0]-c[2])>80: n+=1; xs.append(xx/f)
        if n>=int(30*f): bar.append((yy/f,min(xs),max(xs),n/f))
    if bar:
        y0=bar[0][0]; y1=bar[-1][0]
        print("      barre de ratio : y %.2f..%.2f (ep %.2f CSS) x %.2f..%.2f (long %.2f CSS)"
              %(y0,y1,y1-y0+1/f,bar[0][1],bar[0][2],bar[0][2]-bar[0][1]))
        # piste : y a-t-il un reste de piste plus sombre a droite du remplissage ?
        yy=int(((y0+y1)/2)*f)
        seq=[]
        for xc in range(int(bar[0][1]),int(bar[0][1])+120,6):
            c=px[int(xc*f),yy]; seq.append("%d:%s"%(xc,'OR' if dist_max(c,JETONS['or'])<=55 else 'piste'))
        print("      profil de la barre : %s"%(" ".join(seq)))
