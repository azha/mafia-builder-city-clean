# m3 — (a) le fond est-il un DEGRADE ou un APLAT ? (b) les cartes ont-elles un BORD ?
# Controle positif : sur la REFERENCE, le fond .cfl6 doit varier (gradient CSS 180deg) et
#                    la carte #2 doit montrer un bord #3d3024 (61,48,36) sur son contour.
# Controle negatif : si la meme sonde rend "plat" sur la reference, la sonde est fausse.
from PIL import Image
def med(im,x0,y0,x1,y1):
    px=im.load();R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    R.sort();G.sort();B.sort();n=len(R)//2;return (R[n],G[n],B[n])

ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)

print("\n(a) FOND — colonne x=[20..50], mediane par bande de 20px")
print("  REFERENCE (zone de corps 440..2090, hors cartes -> x=20..50 est la gouttiere gauche)")
for y in range(450,2090,150):
    print(f"    y={y:5d}  {med(ref,20,y,50,y+20)}")
print("  CAPTURE (zone de contenu 150..2150)")
for y in range(160,2160,150):
    print(f"    y={y:5d}  {med(cap,20,y,50,y+20)}")

print("\n(b) BORD DE CARTE — profil horizontal a travers le bord gauche")
print("  REFERENCE carte #2 (Tarcum), y=1330 : x de 40 a 70")
px=ref.load()
print("   ", [px[x,1330] for x in range(40,72)])
print("  CAPTURE carte #2 (Tarcum), y=930 : x de 40 a 70")
px=cap.load()
print("   ", [px[x,930] for x in range(40,72)])

print("\n(c) BORD HAUT de carte — profil vertical")
px=ref.load()
print("  REFERENCE carte #2 top, x=500, y de 1258 a 1285")
print("   ", [px[500,y] for y in range(1258,1286)])
px=cap.load()
print("  CAPTURE carte #2 top, x=500, y de 848 a 875")
print("   ", [px[500,y] for y in range(848,876)])
