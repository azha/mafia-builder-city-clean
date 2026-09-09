# m21 — LARGEURS : panneau elastique, tuiles, gouttiere carte->tuiles, marges d'ecran.
# Filet de panneau : (42,54,72) REF / (42,53,73) JEU, tolerance 8.
# Controle positif : la gouttiere carte->tuiles doit valoir 36 px des deux cotes (grandeur ETABLIE r12 #3).
# Controle negatif : la sonde de filet dans un aplat (fond de carte) doit rendre 0 colonne.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
def cols_filet(im,filet,y0,y1,x0=0,x1=1080):
    p=px(im)
    c=[x for x in range(x0,x1) if sum(1 for y in range(y0,y1) if dist(p[x,y],filet)<=8) > 0.6*(y1-y0)]
    g=[]
    for x in c:
        if g and x==g[-1][-1]+1: g[-1].append(x)
        else: g.append([x])
    return [(s[0],s[-1]) for s in g]
def rows_filet(im,filet,x0,x1,y0,y1):
    p=px(im)
    r=[y for y in range(y0,y1) if sum(1 for x in range(x0,x1) if dist(p[x,y],filet)<=8) > 0.6*(x1-x0)]
    g=[]
    for y in r:
        if g and y==g[-1][-1]+1: g[-1].append(y)
        else: g.append([y])
    return [(s[0],s[-1]) for s in g]
print("\n=== panneau elastique : rails verticaux (bande y au niveau des tuiles) ===")
print("  REF :", cols_filet(ref,(42,54,72),1010,1090))
print("  JEU :", cols_filet(cap,(42,53,73),1005,1080))
print("\n=== tuile 1 : rails verticaux ===")
print("  REF :", cols_filet(ref,(42,54,72),1005,1095,500,1030))
print("  JEU :", cols_filet(cap,(42,53,73),1002,1084,500,1030))
print("\n=== carte portrait (filet or) et gouttiere vers les tuiles ===")
print("  REF : carte 82..505 ; tuile gauche ->", cols_filet(ref,(42,54,72),1005,1095,500,1030)[0])
print("  JEU : carte 78..502 ; tuile gauche ->", cols_filet(cap,(42,53,73),1002,1084,500,1030)[0])
print("\n=== marges d'ecran du cadre ===")
print("  REF : cadre 21..1058 -> marge gauche 21, marge droite", 1079-1058)
print("  JEU : cadre 18..1061 -> marge gauche 18, marge droite", 1079-1061)
print("\n  [controle negatif] sonde de filet dans le fond de la carte (REF x100..160, y1000..1080) :",
      cols_filet(ref,(42,54,72),1000,1080,100,160))
