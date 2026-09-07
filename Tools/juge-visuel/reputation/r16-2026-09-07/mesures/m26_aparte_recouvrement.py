# m26 : l'aparte 'ce qu'il a absorbe de vos regles' — retour a la ligne et recouvrement par la barre a 1920.
# Controle positif : a 1920 hors de la bande de la barre (x<=995) on doit retrouver les 2 memes lignes qu'a 2400.
import sys; sys.path.insert(0,'.')
from lib import *
def bandes(px,ya,yb,xa,xb,seuil):
    ys=[y for y in range(ya,yb) if sum(1 for x in range(xa,xb) if lum(px[x,y])>seuil)>=2]
    g=[]
    for y in ys:
        if g and y-g[-1][-1]<=2: g[-1].append(y)
        else: g.append([y])
    return [(a[0],a[-1]) for a in g]

im24=ouvrir('capture-1080x2400.png'); p24=im24.load()
im19=ouvrir('capture-1080x1920.png'); p19=im19.load()
imr=ouvrir('reference-1080x2102.png'); pr=imr.load()

print("   REF   aparte, x=790..1000 :", bandes(pr,880,970,790,1000,70))
print("   2400  aparte, x=790..1035 :", bandes(p24,920,995,790,1035,70))
print("   1920  aparte, x=790..995 (a GAUCHE de la barre) :", bandes(p19,688,763,790,995,70))
print("   1920  aparte, x=790..1035 (barre incluse)       :", bandes(p19,688,763,790,1035,70))

print("\n   extension DROITE de l'encre de l'aparte (hors bord du panneau x=1033) :")
for etiq,px,bandes_ in [('2400',p24,[(931,954),(958,981)]), ('1920',p19,[(699,722),(726,749)])]:
    for (a,b) in bandes_:
        xs=[x for x in range(790,1030) if any(lum(px[x,y])>70 for y in range(a,b+1))]
        print("      %s ligne y=%d..%d : encre jusqu'a x=%d" % (etiq,a,b,max(xs) if xs else -1))
print("   la barre occupe x=997..1007 a 1920 -> recouvrement = %d px de l'encre de l'aparte" % (1007-997+1))

print("\n   colonnes d'encre de la ligne 1 de l'aparte, x=985..1010 :")
for etiq,px,y0,y1 in [('2400',p24,931,954),('1920',p19,699,722)]:
    print("      %s :" % etiq, " ".join("x%d:%s"%(x,px[x,(y0+y1)//2]) for x in range(990,1012)))
