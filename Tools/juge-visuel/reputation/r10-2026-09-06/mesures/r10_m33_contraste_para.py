# r10-m33 : contraste du paragraphe .pann, mesure sur la LIGNE 2 qui ne porte AUCUN mot dore
#  (verifie par r10_m27 : 0 px d'or sur cette ligne des deux cotes).
# Controle positif : la couleur d'encre trouvee doit etre le jeton creme2 (185,173,146).
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
def rl(c):
    o=[]
    for v in c:
        s=v/255.0; o.append(s/12.92 if s<=0.04045 else ((s+0.055)/1.055)**2.4)
    return 0.2126*o[0]+0.7152*o[1]+0.0722*o[2]
def ratio(a,b):
    x,y=rl(a)+0.05,rl(b)+0.05; return max(x,y)/min(x,y)
for k,(p,x0,y0,box,fp) in {"REF":(D+"reference-1080x2102.png",21,452,(69,1371,963,1395),(80,1440)),
                           "CAP":(D+"capture-1080x2400.png",18,18,(66,1373,955,1398),(80,1445))}.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    vals=[px[x0+u,y0+v] for u in range(box[0],box[2]) for v in range(box[1],box[3])]
    vals.sort(key=lambda c:-(c[0]+c[1]+c[2])); t=vals[:max(1,len(vals)//10)]
    enc=tuple(sorted(c[i] for c in t)[len(t)//2] for i in range(3))
    f=[px[x0+fp[0]+dx,y0+fp[1]+dy] for dx in range(-5,6) for dy in range(-5,6)]
    fond=tuple(sorted(c[i] for c in f)[len(f)//2] for i in range(3))
    print(f"{k} taille={im.size}  ligne 2 du paragraphe : encre={enc} (jeton creme2 (185,173,146)) "
          f"fond={fond}  ratio={ratio(enc,fond):.2f}")
