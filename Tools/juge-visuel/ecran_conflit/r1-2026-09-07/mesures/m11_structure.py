# m11 — structure : presence de l'ECU, rythme vertical, taille du vide.
# Controle positif : sur la REFERENCE l'ecu de la carte #2 doit etre trouve (26x30 CSS = 93,6 x 108 px).
# Controle negatif : la meme sonde dans la carte de la CAPTURE doit rendre "uniforme".
from PIL import Image
def uniforme(im,box,tol=6):
    px=im.load();ref=px[box[0]+2,box[1]+2];mx=0
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            p=px[x,y];mx=max(mx,max(abs(p[i]-ref[i]) for i in range(3)))
    return mx,ref
ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)

print("\n(1) ECU — bande gauche interieure de la carte #2")
print("   REFERENCE  x 84..184, y 1280..1420 -> ecart max/fond :",uniforme(ref,(84,1280,184,1420)))
print("   CAPTURE    x 60..160, y 870..1010  -> ecart max/fond :",uniforme(cap,(60,870,160,1010)))
print("   CAPTURE    bande x 57..92 (avant le texte), y 866..1015 :",uniforme(cap,(58,866,92,1015)))

print("\n(2) RYTHME VERTICAL — frontieres majeures et ecarts")
frR=[('haut .cfl6',434),('bas entete',638),('haut .ordre',677),('bas .ordre',1003),
     ('titron',1037),('carte1 haut',1084),('carte1 bas',1249),('carte2 haut',1267),('carte2 bas',1431),
     ('carte3 haut',1449),('carte3 bas',1614),('carte4 haut',1632),('carte4 bas (coupe)',1787),
     ('haut .bas',1790),('CTA haut',1938),('CTA bas',2043),('bas .tel',2098)]
prev=None
for n,y in frR:
    print(f"   REF {n:20s} y={y:5d}" + (f"   +{y-prev}" if prev is not None else ""));prev=y
frC=[('bas bandeau',143),('titre haut',293),('titre bas',340),('sous-titre haut',405),('sous-titre bas',473),
     ('titron haut',529),('titron bas',556),('mention haut',585),('mention bas',638),
     ('carte1 haut',666),('carte1 bas',835),('carte2 haut',857),('carte2 bas',1026),
     ('carte3 haut',1048),('carte3 bas',1217),('carte4 haut',1239),('carte4 bas',1408),
     ('titron2 haut',1456),('titron2 bas',1483),('message haut',1521),('message bas',1551),
     ('explic haut',1587),('explic bas',1643),('haut du dock',2160),('bas ecran',2400)]
prev=None
print()
for n,y in frC:
    print(f"   CAP {n:20s} y={y:5d}" + (f"   +{y-prev}" if prev is not None else ""));prev=y

print("\n(3) VIDE — derniere encre du contenu -> haut du dock")
print("   CAPTURE : 1643 -> 2160 = 517 px = 143,6 CSS = 21,5 % de la hauteur d'ecran")
print("   REFERENCE : derniere encre 2043 (bas du CTA) -> bas du .cfl6 2098 = 55 px = 15,3 CSS")
