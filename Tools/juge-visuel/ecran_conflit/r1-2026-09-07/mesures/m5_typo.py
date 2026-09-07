# m5 — hauteur de CAPITALE mesuree sur l'encre (bbox verticale d'une lettre capitale isolee).
# Controle positif : REFERENCE .fam .id b = 700 9.5px 'DejaVu Serif' -> cap ~0,73*9,5=6,9 CSS = 25 px.
# Controle negatif : la meme sonde sur une bande SANS texte doit rendre None.
from PIL import Image
def bbox_ink(im,x0,y0,x1,y1,bg,tol=30):
    px=im.load();ys=[];xs=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if max(abs(p[i]-bg[i]) for i in range(3))>tol: ys.append(y);xs.append(x)
    if not ys: return None
    return (min(xs),min(ys),max(xs),max(ys),max(ys)-min(ys)+1,max(xs)-min(xs)+1)

ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)

print("\n== REFERENCE ==  (x0,y0,x1,y1,hauteur,largeur)")
tests_ref=[
 ("h3 'L' de 'Le coup'",        ref,(46,480,72,530),(32,24,15)),
 ("h3 mot entier 'Le coup'",    ref,(46,480,330,530),(32,24,15)),
 ("titron LES QUATRE... ",      ref,(46,1030,900,1060),(30,22,16)),
 ("fam#2 'T' de Tarcum",        ref,(209,1310,232,1350),(36,28,20)),
 ("fam#2 'Tarcum' entier",      ref,(207,1305,380,1350),(36,28,20)),
 ("fam#2 sous-titre 'le port'", ref,(207,1350,600,1380),(36,28,20)),
 ("fam#2 hist 'jamais'",        ref,(740,1305,940,1350),(36,28,20)),
 ("CONTROLE NEGATIF bande vide",ref,(60,1256,900,1264),(28,21,16)),
]
for nom,im,(a,b,c,d),bg in tests_ref: print(f"  {nom:30s} {bbox_ink(im,a,b,c,d,bg)}")

print("\n== CAPTURE ==")
tests_cap=[
 ("titre 'L' de 'Le conflit'",  cap,(56,285,96,350),(13,13,13)),
 ("titre 'Le conflit' entier",  cap,(50,285,600,350),(13,13,13)),
 ("titron LES QUATRE FAMILLES", cap,(56,525,600,560),(13,13,13)),
 ("fam#2 'T' de Tarcum",        cap,(88,890,120,930),(34,42,46)),
 ("fam#2 'Tarcum' entier",      cap,(85,885,300,930),(34,42,46)),
 ("fam#2 sous-titre 'le port'", cap,(85,930,600,960),(34,42,46)),
 ("fam#2 3e ligne 'on n'y'",    cap,(85,970,600,1005),(34,42,46)),
 ("CONTROLE NEGATIF bande vide",cap,(60,1800,900,1900),(13,13,13)),
]
for nom,im,(a,b,c,d),bg in tests_cap: print(f"  {nom:30s} {bbox_ink(im,a,b,c,d,bg)}")
