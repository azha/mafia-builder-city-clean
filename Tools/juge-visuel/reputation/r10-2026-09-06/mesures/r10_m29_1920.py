# r10-m29 : la capture 1080x1920 — le cadre y est-il identique a celui de 1080x2400 ?
#  Et le contenu tient-il dans le cadre (rien de coupe, rien hors ecran) ?
# Controle positif : le nombre de pixels compares est imprime ; un pixel volontairement decale
#  (decalage de 1 px) doit rendre un compte NON nul.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
a=Image.open(D+"capture-1080x1920.png").convert("RGB"); b=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("1920:",a.size," 2400:",b.size)
pa,pb=a.load(),b.load()
n=0; diff=0; mx=0
for v in range(0,1660):
    for u in range(0,1080):
        n+=1
        d=max(abs(pa[u,v][i]-pb[u,v][i]) for i in range(3))
        if d: diff+=1; mx=max(mx,d)
print(f"  zone comparee y 0..1659 : {n} px  -> {diff} differents (delta max {mx})")
n2=sum(1 for v in range(0,1660,3) for u in range(0,1077,3)
       if max(abs(pa[u,v][i]-pb[u+3,v][i]) for i in range(3))>0)
print(f"  CONTROLE POSITIF (2400 decale de 3 px en x) : {n2} differents -> l'instrument discrimine")
# bas de l'ecran 1920 : y du dernier pixel non-fond
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
for k,im in (("1920",a),("2400",b)):
    px=im.load(); W,H=im.size
    last=max(v for v in range(H) if any(lum(px[u,v])>40 for u in range(0,W,2)))
    print(f"  {k}: derniere ligne d'encre (L>40) a y={last} / {H}  -> marge basse {H-1-last} px "
          f"({100*(H-1-last)/H:.1f} % de l'ecran)")
    print(f"       premiere ligne d'encre a y={min(v for v in range(H) if any(lum(px[u,v])>40 for u in range(0,W,2)))}")
