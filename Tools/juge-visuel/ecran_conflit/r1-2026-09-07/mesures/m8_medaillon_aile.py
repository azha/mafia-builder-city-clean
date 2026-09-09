# m8 — anneau du medaillon (pixel le plus sature), et localisation de l'aile droite (JOUR / phase).
# Controle positif : le filet mesure a (224,102,73) au centre = --braise a 1/255 (script m7) -> la sonde sait
#                    reconnaitre braise. Ici on cherche la meme teinte sur l'anneau.
# Controle negatif : au centre du cadran (x=540,y=95) il ne doit PAS y avoir de braise saturee.
from PIL import Image
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)
px=cap.load(); BRAISE=(224,102,74)
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
best=None
for y in range(0,200):
    for x in range(380,700):
        p=px[x,y]
        if p[0]>150 and p[0]-p[2]>60:
            s=p[0]-p[2]
            if best is None or s>best[0]: best=(s,p,x,y)
print("  anneau : pixel le plus 'braise' ->",best[1],"a",(best[2],best[3]),"  d(braise)=",d(best[1],BRAISE))
print("  CONTROLE NEGATIF centre du cadran (540,95) :",px[540,95])

print("\n-- aile droite : bbox d'encre, x 850..1060, y 10..130 --")
xs=[];ys=[]
for y in range(10,135):
    for x in range(850,1065):
        p=px[x,y]
        if sum(p)>170: xs.append(x);ys.append(y)
print("   bbox :",(min(xs),min(ys),max(xs),max(ys)) if xs else None)
print("\n-- lignes d'encre (compte par y) --")
for y in range(10,135):
    n=sum(1 for x in range(850,1065) if sum(px[x,y])>170)
    if n: print(f"    y={y:4d} n={n}")

print("\n== v2 : anneau SANS le filet (y<135) ==")
best=None
for y in range(0,135):
    for x in range(380,700):
        p=px[x,y]
        if p[0]>150 and p[0]-p[2]>60:
            s=p[0]-p[2]
            if best is None or s>best[0]: best=(s,p,x,y)
print("   ",best[1],"a",(best[2],best[3]),"  d(braise)=",d(best[1],BRAISE))
print("\n== couleur du tiret de l'aile droite (y=87..89) ==")
pool=[px[x,y] for y in range(86,91) for x in range(940,1040) if sum(px[x,y])>170]
pool.sort(key=lambda p:-sum(p)); print("   plus clairs :",pool[:5], " n=",len(pool))
print("== couleur de 'JOUR 50' ==")
pool=[px[x,y] for y in range(28,45) for x in range(940,1040) if sum(px[x,y])>170]
pool.sort(key=lambda p:-sum(p)); print("   plus clairs :",pool[:5], " n=",len(pool))
print("\n== ARGENT : valeur (or) et libelle ==")
pool=[px[x,y] for y in range(60,95) for x in range(180,600) if sum(px[x,y])>200]
pool.sort(key=lambda p:-sum(p)); print("   valeur, plus clairs :",pool[:5])
