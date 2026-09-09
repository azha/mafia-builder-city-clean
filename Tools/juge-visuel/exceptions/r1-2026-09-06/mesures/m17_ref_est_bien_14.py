# m17 — contrôle d'IDENTITÉ de la référence : le dossier affirme que reference-⑨ est le cadre #14
# de la série 4. v4-14.png est ce même cadre rendu à ×3 (900 px). En ramenant la référence à 900 px,
# les deux doivent coïncider ; v4-16/17/18 (autres états) doivent, eux, DIFFÉRER nettement.
from util import *
print("== m17 la référence est-elle bien le cadre #14 ? ==")
ref=ouvrir(REF)
r9=ref.resize((900,int(round(2102*900/1080))), Image.LANCZOS)
print(f"  référence ramenée à {r9.size}")
import os
for nom in ("v4-14.png","v4-16.png","v4-17.png","v4-18.png"):
    im=ouvrir(os.path.join(D,nom))
    h=min(r9.size[1], im.size[1])
    a=r9.crop((0,0,900,h)).load(); b=im.crop((0,0,900,h)).load()
    d=0; n=0
    for y in range(0,h,3):
        for x in range(0,900,3):
            ca,cb=a[x,y],b[x,y]
            d+=abs(ca[0]-cb[0])+abs(ca[1]-cb[1])+abs(ca[2]-cb[2]); n+=1
    print(f"     {nom}: écart moyen L1 par px = {d/n:.2f}/765  (n={n})")
