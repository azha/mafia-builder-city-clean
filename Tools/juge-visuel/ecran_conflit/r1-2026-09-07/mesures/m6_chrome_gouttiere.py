# m6 — gouttiere : bas du bandeau, haut du dock, rect libre ; et bornes du contenu.
# Controle positif : la largeur du bandeau doit valoir 1080 et sa hauteur ~143 px (52 CSS-HUD x 2,755).
# Controle negatif : au milieu du vide (y=1900) la ligne doit etre uniformement (13,13,13).
from PIL import Image
def med(im,x0,y0,x1,y1):
    px=im.load();R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    R.sort();G.sort();B.sort();n=len(R)//2;return (R[n],G[n],B[n])
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)
px=cap.load()
print("\n-- colonne x=25 (hors medaillon, hors cartes), mediane par bande de 6px --")
prev=None
for y in range(0,2400,6):
    c=med(cap,10,y,45,min(y+6,2400))
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>3:
        print(f"   y={y:5d} {c}")
    prev=c
print("\n-- CONTROLE NEGATIF : ligne y=1900 uniforme ? --")
row=[px[x,1900] for x in range(0,1080,60)]
print("   ",row)
print("\n-- filet sous le bandeau : colonne x=60, y 130..160 --")
print("   ",[px[60,y] for y in range(130,160)])
print("\n-- dock : bord haut, colonne x=25, y 2130..2180 --")
print("   ",[px[25,y] for y in range(2130,2180)])
