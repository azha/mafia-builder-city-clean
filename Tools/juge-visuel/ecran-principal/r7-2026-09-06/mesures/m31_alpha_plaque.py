# -- m31 : ALPHA EFFECTIF de la plaque de fiche, mesure directement.
#    Deux captures 1080x2400 du MEME commit : d24 = district SANS fiche, c24 = district AVEC fiche.
#    Sous la plaque : R = a*C + (1-a)*B. Pente de R en fonction de B ⇒ (1-a).
#    Controle positif : hors plaque, les deux images doivent etre IDENTIQUES (pente 1, ecart 0).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
s=sc('c24'); A=img('d24'); B=img('c24'); da=A.load(); db=B.load()
def zone(box,nom):
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    n=0; diff=0
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            n+=1
            if da[xp,yp]!=db[xp,yp]: diff+=1
    print("  %-40s n=%6d  pixels differents : %d (%.2f %%)"%(nom,n,diff,100*diff/n))
print("=== CONTROLE POSITIF : hors plaque, les deux captures 2400 doivent etre identiques ===")
zone((0,0,392,60),'bandeau entier')
zone((0,120,392,300),'art, haut d ecran')
zone((0,790,392,871),'dock')
print("=== zone de la plaque ===")
zone((15,600,378,766),'plaque de fiche')
print()
print("=== regression R = f(B) sur le fond de la plaque (pixels non-encre : L(R)<45 et L(B) quelconque) ===")
pts=[]
for yp in range(int(604*s),int(762*s)):
    for xp in range(int(17*s),int(376*s)):
        r=db[xp,yp]; b=da[xp,yp]
        if lum(r)<48 and max(r)<70:   # exclut l'encre et les boutons
            pts.append((b,r))
n=len(pts)
print("  n =",n)
for c,nom in [(0,'R'),(1,'G'),(2,'B')]:
    xs=[p[0][c] for p in pts]; ys=[p[1][c] for p in pts]
    mx=sum(xs)/n; my=sum(ys)/n
    sxx=sum((x-mx)**2 for x in xs); sxy=sum((x-mx)*(y-my) for x,y in zip(xs,ys))
    a=sxy/sxx if sxx else 0; b0=my-a*mx
    # correlation
    syy=sum((y-my)**2 for y in ys)
    rho=sxy/math.sqrt(sxx*syy) if sxx*syy else 0
    print("   canal %s : pente = %.4f  ⇒ opacite apparente 1-pente = %.4f ; ordonnee %.2f ; correlation r=%.3f ; fond moyen %.1f ⇒ resultat moyen %.1f"
          %(nom,a,1-a,b0,rho,mx,my))
