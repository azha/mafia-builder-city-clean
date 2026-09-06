"""13 - Finitions : filet or de bas d'enseigne, coins (rayon), et le losange en trop.
Controle positif : le filet or de la reference (y663..669) doit etre trouve par le balayage."""
from PIL import Image
def load(p):
    im=Image.open(p).convert('RGB'); print(f"ouvre {p}: {im.size}"); return im
ref=load('../reference-1080x2102.png'); cap=load('../capture-1080x2400.png')
orf=lambda c: abs(c[0]-176)<30 and abs(c[1]-141)<30 and abs(c[2]-62)<30
def lignes_or(im,y0,y1,nom):
    p=im.load(); out=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(0,1080,2) if orf(p[x,y][:3]))
        if n>150: out.append((y,n))
    print(f"  {nom}: lignes a >150/540 px or : {[y for y,_ in out]}")
lignes_or(ref,434,2082,"REF zone de contenu")
lignes_or(cap,143,2193,"CAP zone de contenu")
print()
print("COINS (rayon) : 12 premiers px de la diagonale du coin haut-gauche de chaque panneau")
p=cap.load()
for nom,(x0,y0) in [("CAP panneau titre",(39,282)),("CAP carte 1",(39,501)),("CAP panneau bas",(39,1611))]:
    print(f"   {nom}: ", [ (d, p[x0+d,y0+d]) for d in range(0,7)])
q=ref.load()
for nom,(x0,y0) in [("REF .pann",(50,1576)),("REF .fen 1",(84,695))]:
    print(f"   {nom}: ", [ (d, q[x0+d,y0+d]) for d in range(0,7)])
print()
print("LOSANGE en trop (capture) : bbox et couleur")
xs=[(x,y) for y in range(205,245) for x in range(480,600) if max(q_ for q_ in cap.getpixel((x,y)))>60]
print("   px>60 :", (min(x for x,_ in xs),min(y for _,y in xs),max(x for x,_ in xs),max(y for _,y in xs)),
      " couleur centre =", cap.getpixel((540,223)))
