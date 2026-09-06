# m11 — rails d'urgence de la RÉFÉRENCE (couleur = codage d'urgence) et de la CAPTURE.
# Contrôle positif : le CSS donne .rail = 34x3 CSS => 122,4 x 10,8 px ; l'instrument doit
#   retrouver ~122 px de large. Contrôle négatif : les 3 rails de la réf ne sont PAS tous de la
#   même couleur (braise / braise / or) — si la sonde les rend identiques, elle est aveugle.
from util import *
print("== m11 rails d'urgence ==")
ref=ouvrir(REF); pr=ref.load()
# rails : bandes saturées sous les médaillons, y ~1000..1080
def runs(y, test):
    out=[];cur=None
    for x in range(1080):
        if test(pr[x,y]):
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur and cur[1]-cur[0]>40: out.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>40: out.append(tuple(cur))
    return out
sature=lambda c: (max(c)-min(c))>40 and max(c)>110
for y in range(990,1090,4):
    r=runs(y,sature)
    if r: print(f"   y={y} runs={r}  couleurs={[mediane_fenetre(ref,(a+b)//2,y,2) for a,b in r]}")
print("  -- profil vertical au centre de chaque rail --")
for cx in (198,462,700):
    col=[(y,pr[cx,y]) for y in range(995,1075,3)]
    print(f"   x={cx}: {col}")
