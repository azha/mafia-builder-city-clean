# -*- coding: utf-8 -*-
"""Bandes d'ENCRE (texte) dans une zone : y0..y1 de chaque ligne, bbox x, hauteur.
Sert aux hauteurs de capitale et aux rythmes internes.
CONTROLE POSITIF : dans le bon de la REFERENCE la sonde DOIT trouver >=5 bandes (h4 + 4 valeurs).
CONTROLE NEGATIF : sur une bande vide (ref y 1300..1400) elle DOIT rendre 0."""
from PIL import Image
def bandes(path, x0,y0,x1,y1, fond, seuil=45, minfrac=0.004):
    im=Image.open(path).convert("RGB"); W,H=im.size
    px=im.load()
    n=(x1-x0+1)
    prof=[]
    for y in range(y0,y1+1):
        c=0
        for x in range(x0,x1+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: c+=1
        prof.append(c/n)
    out=[];s=None
    for i,v in enumerate(prof):
        if v>=minfrac and s is None: s=i
        elif v<minfrac and s is not None:
            out.append((y0+s,y0+i-1)); s=None
    if s is not None: out.append((y0+s,y1))
    res=[]
    for (a,b) in out:
        xs=[]
        for y in range(a,b+1):
            for x in range(x0,x1+1):
                p=px[x,y]
                if max(abs(p[i]-fond[i]) for i in range(3))>seuil: xs.append(x)
        if xs: res.append((a,b,b-a+1,min(xs),max(xs)))
    return im.size,res

print("=== REFERENCE : interieur du bon (x 90..990, y 645..1225), fond papier #efe7d6")
sz,r=bandes("../reference-1080x2102.png",90,645,990,1225,(239,231,214))
print("  taille image",sz)
for b in r: print("   y=%4d..%4d h=%3d  x=%4d..%4d"%b)
print()
print("=== CAPTURE : interieur du bon (x 90..990, y 610..1052), fond papier #eae0c8")
sz,c=bandes("../capture-1080x2400.png",90,610,990,1052,(234,224,200))
print("  taille image",sz)
for b in c: print("   y=%4d..%4d h=%3d  x=%4d..%4d"%b)
print()
print("=== REFERENCE : entete + zone haute (x 40..1040, y 434..640), fond #1e1b16")
sz,r2=bandes("../reference-1080x2102.png",40,434,1040,640,(30,27,22))
for b in r2: print("   y=%4d..%4d h=%3d  x=%4d..%4d"%b)
print()
print("=== CAPTURE : zone titre (x 40..1040, y 200..607), fond #0d0d0d")
sz,c2=bandes("../capture-1080x2400.png",40,200,1040,607,(13,13,13))
for b in c2: print("   y=%4d..%4d h=%3d  x=%4d..%4d"%b)
print()
print("=== REFERENCE : bas (x 40..1040, y 1787..2101), fond #141a21")
sz,r3=bandes("../reference-1080x2102.png",40,1787,1040,2085,(20,26,33))
for b in r3: print("   y=%4d..%4d h=%3d  x=%4d..%4d"%b)
print()
print("=== CAPTURE : bas (x 40..1040, y 1060..1560), fond #0d0d0d")
sz,c3=bandes("../capture-1080x2400.png",40,1060,1040,1560,(13,13,13))
for b in c3: print("   y=%4d..%4d h=%3d  x=%4d..%4d"%b)
print()
sz,neg=bandes("../reference-1080x2102.png",90,1300,990,1400,(21,19,17))
print("CONTROLE NEGATIF (ref y1300..1400, fond nu) : %d bande(s)"%len(neg))
print("CONTROLE POSITIF (bon de la reference) : %d bandes trouvees (>=5 attendu)"%len(r))
