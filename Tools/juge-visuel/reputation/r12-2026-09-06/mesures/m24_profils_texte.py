import sys; sys.path.insert(0,'.')
from lib import *
print("=== m24 : profils de rangees d'encre — sous-titre de l'enseigne, libelles de compteur ===")
def profil(im,x0,y0,x1,y1,frac=0.5):
    p=px(im)
    L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//5]; haut=plat[-max(1,len(plat)//100)]
    s=fond+frac*(haut-fond)
    return [(y0+j, sum(1 for v in r if v>=s)) for j,r in enumerate(L)], round(fond,1), round(haut,1), round(s,1)
def bornes(pr, seuil):
    ys=[y for y,n in pr if n>=seuil]
    return (min(ys),max(ys),max(ys)-min(ys)+1) if ys else None

ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
for nom, im, x0,y0,x1,y1 in [
   ('REF sous-titre L1 (x 240..470)', ref, 240,582,470,616),
   ('JEU sous-titre L1 (x 246..478)', cap, 246,618,478,652),
   ('REF libelle compteur 1',         ref, 78,766,318,800),
   ('JEU libelle compteur 1',         cap, 70,792,312,826),
   ('REF chiffres compteur 1',        ref, 150,715,260,772),
   ('JEU chiffres compteur 1',        cap, 152,740,256,796),
]:
    pr,fond,haut,s = profil(im,x0,y0,x1,y1)
    b=bornes(pr,3)
    print(f"  {nom}: fond={fond} encre={haut} seuil={s}  bornes(>=3px)={b}")
    print("     " + " ".join(f"{y}:{n}" for y,n in pr if n>0))
