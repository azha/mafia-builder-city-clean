# m16 — la bande .entete de la reference (surface propre + filet 1px) et son homologue dans la capture.
# Controle positif : le filet doit valoir #3d3024 (61,48,36) et la bande #20180f (32,24,15).
# Controle negatif : au meme rang dans la CAPTURE, aucune discontinuite ne doit exister (fond plat).
from PIL import Image
ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)
p=ref.load()
print("\nREFERENCE colonne x=700, y 425..690 (haut du .cfl6 -> corps)")
prev=None
for y in range(425,692):
    c=p[700,y]
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>2:
        print(f"   y={y:5d} {c}")
    prev=c
q=cap.load()
print("\nCAPTURE colonne x=700, y 144..690 (sous le bandeau -> cartes) : ruptures >2/255")
prev=None
for y in range(144,700):
    c=q[700,y]
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>2:
        print(f"   y={y:5d} {c}")
    prev=c
