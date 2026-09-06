#!/usr/bin/env python3
"""m10 - LA CARTE (element heros) : bbox, matiere de fond, bord.
REF : carte creme -> detecteur luminance haute (le meme que m09, qui a fait ses preuves).
CAP : panneau sombre a bord or -> detecteur du bord or.
Controle positif : le detecteur creme retrouve dans la REF une aire >> 0 dans la zone carte.
Controle negatif : le meme detecteur creme sur la zone carte de la CAPTURE.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def contraste(a,b):
    def lin(c):
        c/=255.0
        return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    def rl(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
    l1,l2=rl(a),rl(b)
    if l1<l2: l1,l2=l2,l1
    return (l1+0.05)/(l2+0.05)
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def est_creme(p): return L(p)>150 and p[0]>p[2] and abs(p[0]-p[1])<40
def aire(im,pred,y0,y1,x0=0,x1=None):
    px=im.load(); W=im.size[0]; x1=x1 or W
    xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): xs.append(x);ys.append(y);n+=1
    return (min(xs),min(ys),max(xs),max(ys),n) if xs else None

b=aire(ref,est_creme,760,1560,0,760)
print(f"[REF] CONTROLE POSITIF carte creme : bbox x={b[0]}..{b[2]} y={b[1]}..{b[3]}  L={b[2]-b[0]+1} H={b[3]-b[1]+1}  aire={b[4]} px -> {'OK' if b[4]>100000 else 'ECHEC'}")
pr=ref.load()
ech=[pr[x,y] for y in range(1180,1215) for x in range(200,600)]
med=(statistics.median(p[0] for p in ech),statistics.median(p[1] for p in ech),statistics.median(p[2] for p in ech))
print(f"[REF] matiere de la carte (mediane x200-600 y1180-1215) = {med}  lum={L(med):.1f}")
# titre de la carte : px le plus sombre
z=[pr[x,y] for y in range(990,1180) for x in range(240,840)]
print(f"[REF] encre du titre (px le plus sombre) = {min(z,key=L)}  contraste/carte = {contraste(min(z,key=L),med):.2f}:1")

print()
b2=aire(cap,est_creme,1270,1700,0,700)
print(f"[CAP] CONTROLE NEGATIF meme detecteur creme, zone carte y1270-1700 x0-700 : "
      + (f"aire={b2[4]} px bbox={b2[:4]}" if b2 else "AUCUN px creme"))
pc=cap.load()
ech2=[pc[x,y] for y in range(1290,1320) for x in range(300,600)]
med2=(statistics.median(p[0] for p in ech2),statistics.median(p[1] for p in ech2),statistics.median(p[2] for p in ech2))
print(f"[CAP] matiere de la carte (mediane x300-600 y1290-1320) = {med2}  lum={L(med2):.1f}")
z2=[pc[x,y] for y in range(1425,1520) for x in range(75,700)]
clair=max(z2,key=L)
print(f"[CAP] encre du titre (px le plus clair) = {clair}  contraste/carte = {contraste(clair,med2):.2f}:1")
# bord or de la carte capture
def est_or(p): return p[0]>90 and p[0]>1.6*p[2] and p[1]>0.55*p[0] and p[1]<0.95*p[0]
b3=aire(cap,est_or,1260,1720,0,700)
print(f"[CAP] bord OR de la carte : bbox x={b3[0]}..{b3[2]} y={b3[1]}..{b3[3]}  L={b3[2]-b3[0]+1} H={b3[3]-b3[1]+1}")
