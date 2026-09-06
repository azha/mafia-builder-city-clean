# m10 — LE LOSANGE DU CHROME SUR LE TITRE (1920) + l'enseigne aux deux resolutions.
# OR := r>120, g>90, b<120, r>b+55, r>=g.  On compare le bloc « enseigne » (filet haut du cadre ->
#   filet or sous le sous-titre) : 482..693 a 2400 et 162..373 a 1920, soit 212 px des deux cotes.
# Controle positif : la LARGEUR d'encre du titre doit etre identique aux deux resolutions.
# Controle negatif : la sonde d'or ne doit rien trouver dans le fond du panneau d'enseigne.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def est_or(c):
    r,g,b=c
    return r>120 and g>90 and b<120 and r>b+55 and r>=g

a=ouvrir('capture-1080x2400.png'); b=ouvrir('capture-1080x1920.png')
pa,pb=px(a),px(b)
def titre(p,y0,y1,nom):
    rows={}
    for y in range(y0,y1):
        xs=[x for x in range(60,1020) if est_or(p[x,y])]
        if len(xs)>4: rows[y]=(min(xs),max(xs),len(xs))
    ys=sorted(rows)
    seg=[]
    for y in ys:
        if seg and y-seg[-1][-1]<=2: seg[-1].append(y)
        else: seg.append([y])
    print(f"  {nom} : blocs d'or dans l'enseigne :")
    for s in seg:
        xs0=min(rows[y][0] for y in s); xs1=max(rows[y][1] for y in s)
        print(f"     y {s[0]}..{s[-1]} ({s[-1]-s[0]+1} px) x {xs0}..{xs1} ({xs1-xs0+1} px),"
              f" {sum(rows[y][2] for y in s)} px d'encre")
    return seg,rows
print("\n=== 2400 (le losange du chrome tombe dans la bande morte) ===")
sa,ra=titre(pa,486,690,'2400')
print("=== 1920 (le cadre remonte de 320 px : le chrome tombe DEDANS) ===")
sb,rb=titre(pb,166,370,'1920')
print("\n  Le losange (x531..548, y215..231 a 1920) recouvre-t-il de l'encre du TITRE ?")
n2400=sum(1 for y in range(215,232) for x in range(531,549) if est_or(pa[x,y+320]))
n1920=sum(1 for y in range(215,232) for x in range(531,549) if est_or(pb[x,y]))
print(f"   px d'or dans cette fenetre : contenu SEUL (2400, decale) = {n2400} ;"
      f" contenu+chrome (1920) = {n1920}  -> le losange ajoute {n1920-n2400} px d'or")
print(f"   distance verticale du losange a l'encre du titre a 1920 :"
      f" bas du losange 231, haut du titre {sb[0][0] if sb else '?'}")
print("\n  [controle negatif] px d'or dans le fond du panneau d'enseigne (x 100..200, y 200..250, 1920) :",
      sum(1 for y in range(200,251) for x in range(100,201) if est_or(pb[x,y])))
