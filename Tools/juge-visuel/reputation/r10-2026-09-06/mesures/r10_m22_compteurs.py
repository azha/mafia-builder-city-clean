# r10-m22 : compteurs .fen — couleur du chiffre, couleur du tiret, halo (text-shadow 0 0 8px cyan99).
#  Halo mesure en DELTA sur le fond de la fenetre, par distance au glyphe (profil horizontal a
#  mi-hauteur des chiffres, entre le bord de la fenetre et le premier pixel de chiffre).
# Controle positif : la couleur au COEUR du chiffre doit rendre le jeton cyan #7fd4d9 en REF.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452),"CAP":(D+"capture-1080x2400.png",18,18)}
CY=(127,212,217)
CFG={"REF":{"f1":(149,217,272,310),"f3":(817,885,272,310),"lab":(66,300,328,346),"fenb":(32,337)},
     "CAP":{"f1":(154,217,266,304),"f3":(834,882,287,291),"lab":(69,303,323,341),"fenb":(31,339)}}
def med(px,x0,y0,u0,u1,v0,v1):
    vals=[px[x0+u,y0+v] for u in range(u0,u1+1) for v in range(v0,v1+1)]
    L=sorted(vals,key=lambda c:-(c[0]+c[1]+c[2]))
    top=L[:max(1,len(L)//12)]
    return tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
for k,(p,x0,y0) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load(); C=CFG[k]
    print(f"\n=== {k} taille={im.size}")
    a=med(px,x0,y0,*C['f1'][:2],*C['f1'][2:])
    b=med(px,x0,y0,*C['f3'][:2],*C['f3'][2:])
    l=med(px,x0,y0,*C['lab'][:2],*C['lab'][2:])
    print(f"  chiffres « 00 » (fenetre 1) : {a}   (jeton cyan {CY}, d={max(abs(a[i]-CY[i]) for i in range(3))})")
    print(f"  fenetre 3 (« 00 » ou « — ») : {b}   d(cyan)={max(abs(b[i]-CY[i]) for i in range(3))}"
          f"   d(chiffres f1)={max(abs(b[i]-a[i]) for i in range(3))}")
    print(f"  libelle « REGLES DONNEES »  : {l}")
    # halo : profil a mi-hauteur des chiffres de la fenetre 1
    v=(C['f1'][2]+C['f1'][3])//2; u0=C['f1'][0]
    ub=C['fenb'][0]
    base=sum(0.2126*px[x0+u,y0+v][0]+0.7152*px[x0+u,y0+v][1]+0.0722*px[x0+u,y0+v][2]
             for u in range(ub+8,ub+20))/12
    print(f"  HALO : fond de fenetre L={base:.1f} ; luminance a d px a GAUCHE du 1er pixel de chiffre (u={u0}) :")
    print("    "+"  ".join(f"d={d}:{0.2126*px[x0+u0-d,y0+v][0]+0.7152*px[x0+u0-d,y0+v][1]+0.0722*px[x0+u0-d,y0+v][2]-base:+.1f}"
                            for d in (2,4,6,9,12,16,22,30)))
