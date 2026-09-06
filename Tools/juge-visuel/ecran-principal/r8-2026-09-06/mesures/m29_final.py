# -*- coding: utf-8 -*-
"""m29 - titre de fiche (etendue + capitale), gouttiere, bandes unies a 2400, couche globale.
Origines : haut de plaque canon 424.52 / jeu 425.39 (1920) / 599.61 (2400)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
TOP={'canon':424.52,'j1920':425.39,'j2400':599.61}
print("=== m29 ===")
print("\n-- TITRE de la fiche (canon `.titre` x 30..362 ; .serif 16px or-vif)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load(); t=TOP[cle]
    o0,o1=(19.0,34.0)
    enc=[(xx/f,yy/f) for yy in range(int((t+o0)*f),int((t+o1)*f)) for xx in range(int(20*f),int(372*f))
         if (px[xx,yy][0]-px[xx,yy][2])>=55 and px[xx,yy][0]>=140]
    xs=[e[0] for e in enc]
    # capitale : mode des runs verticaux
    hs=[]
    for xx in range(int(20*f),int(372*f)):
        col=[yy for yy in range(int((t+o0)*f),int((t+o1)*f)) if (px[xx,yy][0]-px[xx,yy][2])>=55 and px[xx,yy][0]>=140]
        if not col: continue
        hs.append((max(col)-min(col)+1)/f)
    from collections import Counter
    m=Counter(round(h*4)/4.0 for h in hs).most_common(4)
    print("   %-6s : encre or x %.2f..%.2f (largeur %.2f) ; marges dans `.titre`(30..362) : g %.2f / d %.2f ; capitales (mode) %s"
          %(cle,min(xs),max(xs),max(xs)-min(xs),min(xs)-30.0,362.0-max(xs),m))

print("\n-- GOUTTIERE : le contenu reste-t-il entre le bandeau et le dock ?")
print("   canon .barre 0..52 (filet 51-52) ; .dock 605.70..695.87 ; .fiche 424.52..593.71")
for cle in ['j1920','j2400']:
    im,f=ouvrir(cle,taire=True)
    h=696.88 if cle=='j1920' else 871.06
    top=TOP[cle]
    print("   %-6s : plaque %.2f..%.2f ; bas d'ecran %.2f ; dock (haut estime %.2f) => jour plaque/dock %.2f CSS ; jour filet/plaque %.2f CSS"
          %(cle,top,top+169.50,h,h-90.17,(h-90.17)-(top+169.50),top-52.0))

print("\n-- BANDES UNIES a 1080x2400 (r7 m14 : panneau (34,38,49) de y 51.90 a 87.11)")
im,f=ouvrir('j2400'); px=im.load()
xi=int(300*f)
pr=[(j/f,px[xi,j]) for j in range(int(50*f),int(92*f))]
runs=[];prev=None;deb=None
for y,c in pr:
    if prev is None or dist_max(c,prev)>6:
        if deb is not None: runs.append((deb,y,prev))
        deb=y
    prev=c
runs.append((deb,pr[-1][0],prev))
for a,b,c in runs:
    if b-a>1.0: print("     y %.2f..%.2f (%.2f CSS) : %s"%(a,b,b-a,c))
print("   bas : ")
pr=[(j/f,px[xi,j]) for j in range(int(778*f),int(871*f))]
print("     y 778..871 a x=300 : %s"%(" ".join("%.0f:%s"%(y,c) for y,c in pr[::int(6*f)])))

print("\n-- COUCHE GLOBALE (bandeau 0..52 CSS ; plaque de fiche) : L moyen et %% de pixels > L 90")
def couche(cle,x0,y0,x1,y1):
    im,f=ouvrir(cle,taire=True); px=im.load()
    P=[px[xx,yy] for yy in range(int(y0*f),int(y1*f),2) for xx in range(int(x0*f),int(x1*f),2)]
    Ls=[L(c) for c in P]
    return sum(Ls)/len(Ls), 100.0*sum(1 for v in Ls if v>90)/len(Ls), len(P)
for nom,zones in [('bandeau',{'canon':(0,0,392,51),'j1920':(0,0,392,51),'j2400':(0,0,392,51)}),
                  ('plaque', {'canon':(13,424.5,379,594),'j1920':(12,425.4,379,595),'j2400':(12,599.6,379,769)}),
                  ('dock',   {'canon':(0,605.7,392,695.9),'j1920':(0,606.7,392,696.9),'j2400':(0,780.9,392,871)})]:
    s=[]
    for cle,z in zones.items():
        m,p,n=couche(cle,*z); s.append("%s L=%.1f (%.1f%% >90)"%(cle,m,p))
    print("   %-8s : %s"%(nom,"   ".join(s)))
