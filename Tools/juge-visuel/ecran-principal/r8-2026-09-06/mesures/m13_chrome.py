# -*- coding: utf-8 -*-
"""m13 - chrome du bandeau : filet, les QUATRE porteurs de l'etat `.chaud`, volutes, bloc ARGENT.
Temoin d'ETAT : le compte est BRULANT -> pour le boitier, le filet, l'aile droite (.val) et
`.heatpct`, le temoin est la regle CSS `.tel.chaud` (--braise = 224,102,74), pas le PNG calme.
Discriminant laiton/braise = R-B (laiton 114 ; braise 150) ET R-G (laiton 35 ; braise 122)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))
BRAISE=JETONS['braise']; LAITON=JETONS['laiton']; CREME=JETONS['creme']; CREME2=JETONS['creme-2']; ORVIF=JETONS['or-vif']

def mode_encre(cle, x0,y0,x1,y1, seuil_min=None, fn=None):
    """Mode de couleur du CoEUR des glyphes : pixels dont la 'force' est > 80 % du max local."""
    im,f=ouvrir(cle,taire=True); px=im.load()
    P=[]
    for yy in range(int(y0*f),int(y1*f)):
        for xx in range(int(x0*f),int(x1*f)):
            c=px[xx,yy]
            if fn is None or fn(c): P.append(c)
    if not P: return None,0,0
    v,fr=mode_couleur(P)
    return v,fr,len(P)

print("=== m13 : chrome ===")
# ---- 1) FILET du bandeau : continuite, largeur, y, couleur
print("\n-- FILET du bandeau (ASSUME : cote 1.00 CSS, tronquee a 2 px pleins a x2.7551)")
for cle in ['canon','j1920','j2400','d2400','t2400']:
    im,f=ouvrir(cle); px=im.load(); W,H=im.size
    # cherche la ligne y (45..58 CSS) qui maximise le nombre de colonnes 'chaudes'
    best=None
    for i in range(int(45*f),int(58*f)):
        n=0
        for xx in range(0,W,3):
            c=px[xx,i]
            if (c[0]-c[2])>=45 and c[0]>=110: n+=1
        if best is None or n>best[1]: best=(i,n)
    i,n=best
    tot=len(range(0,W,3))
    # couleur mediane sur la ligne, et etendue horizontale continue
    cols=[xx for xx in range(W) if (px[xx,i][0]-px[xx,i][2])>=45 and px[xx,i][0]>=110]
    med=tuple(int(mediane([px[xx,i][k] for xx in cols])) for k in range(3)) if cols else None
    # epaisseur : coupe verticale a x = 300 CSS
    xi=int(300*f); vals=[]
    for j in range(int(45*f),int(58*f)):
        c=px[xi,j]; vals.append((j/f, c[0]-c[2], c))
    pic=max(v for _,v,_ in vals); fond=mediane([v for _,v,_ in vals if v<pic*0.3])
    mi=fond+(pic-fond)*0.5
    au=[y for y,v,_ in vals if v>=mi]
    coeur=[y for y,v,_ in vals if v>=fond+(pic-fond)*0.95]
    # trous
    trous=0
    if cols:
        for k in range(1,len(cols)):
            if cols[k]-cols[k-1]>1: trous+=1
    print("   %-6s y=%.2f CSS | couvre %d/%d colonnes echantillonnees (%.1f%%) | x %.1f..%.1f CSS | %d interruptions | couleur %s (dist a --braise %d, a --laiton %d) | ep. NOMINALE %.3f CSS CoEUR %.3f"
          %(cle,i/f,n,tot,100.0*n/tot, (cols[0]/f if cols else -1),(cols[-1]/f if cols else -1), trous, med, dist_max(med,BRAISE), dist_max(med,LAITON),
            (au[-1]-au[0]+1/f) if au else 0, (coeur[-1]-coeur[0]+1/f) if coeur else 0))

# ---- 2) les QUATRE `.chaud`
print("\n-- Etat `.chaud` : les QUATRE porteurs (temoin = CSS, --braise (224,102,74))")
def cadre_texte(cle, x0,y0,x1,y1, lum_min=90):
    im,f=ouvrir(cle,taire=True); px=im.load()
    P=[]
    for yy in range(int(y0*f),int(y1*f)):
        for xx in range(int(x0*f),int(x1*f)):
            c=px[xx,yy]
            if max(c)>=lum_min: P.append(c)
    return P
# boitier : deja mesure par le profil radial -> couleur au pic
for cle in ['j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load(); a=ANC[cle]
    best=None
    for j in range(720):
        th=2*math.pi*j/720
        for k in range(int(30*20),int(35*20)):
            r=k/20.0
            x=int(round((a['cx']+r*math.cos(th))*f)); y=int(round((a['cy']-r*math.sin(th))*f))
            c=px[x,y]; s=c[0]-c[2]
            if best is None or s>best[0]: best=(s,c,r)
    print("   [1] boitier   %-6s : pic du cerclage %s a r=%.2f  (dist --braise %d)"%(cle,best[1],best[2],dist_max(best[1],BRAISE)))
# filet : deja ci-dessus
# aile droite (.val) : "Aube"
print("   [3] aile droite (.val) : mode du coeur des glyphes")
for cle,(x0,y0,x1,y1) in [('canon',(300,20,392,44)),('j1920',(300,24,392,46)),('j2400',(300,24,392,46))]:
    P=cadre_texte(cle,x0,y0,x1,y1,110)
    v,fr=mode_couleur(P)
    print("      %-6s : %s (%.0f%% de %d px)  dist --braise %d | --creme %d"%(cle,v,100*fr,len(P),dist_max(v,BRAISE),dist_max(v,CREME)))
# heatpct : "Brulant" / "37%"
print("   [4] .heatpct (cadran) : mode du coeur des glyphes")
for cle,(x0,y0,x1,y1) in [('canon',(180,32,214,48)),('j1920',(172,42,222,58)),('j2400',(172,42,222,58))]:
    P=cadre_texte(cle,x0,y0,x1,y1,110)
    v,fr=mode_couleur(P)
    print("      %-6s : %s (%.0f%% de %d px)  dist --braise %d | --creme %d"%(cle,v,100*fr,len(P),dist_max(v,BRAISE),dist_max(v,CREME)))
