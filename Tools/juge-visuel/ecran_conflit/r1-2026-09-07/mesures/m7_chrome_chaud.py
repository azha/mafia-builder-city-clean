# m7 — temoin .tel.chaud : filet du bandeau, boitier du medaillon, .heatpct, aile droite.
# Jetons CSS attendus : --braise #e0664a (224,102,74) ; --creme #eae0c8 (234,224,200) ; --creme-2 #b9ad92.
# Controle positif : le BOITIER du medaillon doit ressortir braise (le dossier le dit visible).
# Controle negatif : le fond du bandeau ne doit PAS etre braise.
from PIL import Image
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)
px=cap.load()
BRAISE=(224,102,74); CREME=(234,224,200)
def dist(a,b): return max(abs(a[i]-b[i]) for i in range(3))

print("\n(1) FILET sous le bandeau : pixel le plus vif de la colonne, par x")
for x in range(20,1080,90):
    best=max(((px[x,y],y) for y in range(136,150)), key=lambda t:sum(t[0]))
    print(f"   x={x:4d}  {best[0]} a y={best[1]}   d(braise)={dist(best[0],BRAISE)}")

print("\n(2) BOITIER du medaillon (anneau) : balayage horizontal a y=90 (hauteur du centre)")
row=[(x,px[x,90]) for x in range(370,720,5)]
vifs=[(x,c) for x,c in row if c[0]>120 and c[0]>c[2]+40]
print("   pixels 'braise' trouves :",vifs[:6],"...",vifs[-6:] if len(vifs)>6 else "")
if vifs: print("   d(braise) sur le plus vif :",dist(max(vifs,key=lambda t:t[1][0])[1],BRAISE), max(vifs,key=lambda t:t[1][0])[1])

print("\n(3) .heatpct  = le mot 'Brulant' : mediane des 30 pixels les plus clairs")
pool=[px[x,y] for y in range(96,125) for x in range(455,640)]
pool.sort(key=lambda p:-sum(p))
top=pool[:40]
R=sorted(p[0] for p in top);G=sorted(p[1] for p in top);B=sorted(p[2] for p in top)
enc=(R[20],G[20],B[20])
print("   encre mesuree :",enc," d(braise)=",dist(enc,BRAISE)," d(creme)=",dist(enc,CREME))

print("\n(4) .aile.droite .val = le tiret : mediane des pixels les plus clairs de la zone")
pool=[px[x,y] for y in range(55,80) for x in range(960,1010)]
pool.sort(key=lambda p:-sum(p)); top=pool[:30]
R=sorted(p[0] for p in top);G=sorted(p[1] for p in top);B=sorted(p[2] for p in top)
enc=(R[15],G[15],B[15]); print("   encre mesuree :",enc," d(braise)=",dist(enc,BRAISE)," d(creme)=",dist(enc,CREME))

print("\n(5) CONTROLE NEGATIF : fond du bandeau (x=25,y=20..40)")
pool=[px[x,y] for y in range(20,40) for x in range(15,45)]
R=sorted(p[0] for p in pool);G=sorted(p[1] for p in pool);B=sorted(p[2] for p in pool);n=len(R)//2
print("   ",(R[n],G[n],B[n])," d(braise)=",dist((R[n],G[n],B[n]),BRAISE))
