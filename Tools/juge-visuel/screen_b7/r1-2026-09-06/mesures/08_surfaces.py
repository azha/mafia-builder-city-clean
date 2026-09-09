"""08 - Surfaces : remplissage et BORD des panneaux, et l'axe bleu (B-R) des surfaces.
Controle positif : le remplissage de .pann de la reference doit rendre #111823 (17,24,35),
valeur du jeton 'carte' de chassis6.py. Controle negatif : le fond du .tel (#0b1016) doit
rendre (11,16,22) et NON (17,24,35)."""
from PIL import Image
from statistics import median
def load(p):
    im=Image.open(p).convert('RGB'); print(f"ouvre {p}: {im.size}"); return im
def m(im,x0,y0,x1,y1):
    p=im.load(); R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=p[x,y][:3]; R.append(r);G.append(g);B.append(b)
    return (int(median(R)),int(median(G)),int(median(B)))
ref=load('../reference-1080x2102.png'); cap=load('../capture-1080x2400.png')
print("[+] REF .pann fill      =", m(ref,300,1690,340,1740), "attendu (17,24,35) #111823 'carte'")
print("[-] REF fond .tel       =", m(ref,30,2090,50,2100), "attendu (11,16,22) #0b1016 'fond'")
print()
print("REF surfaces (B-R = degre de bleu) :")
for nom,box in [(".enseigne haut",(300,470,700,478)),(".enseigne bas",(300,645,700,655)),
                (".fen creux",(150,745,300,755)),(".elast fond",(150,1250,900,1300)),
                (".pi fond",(150,940,330,960)),(".pann",(300,1690,340,1740)),
                (".cta6 carte2",(120,1912,220,1930))]:
    c=m(ref,*box); print(f"   {nom:16s} {c}  B-R={c[2]-c[0]:+3d}")
print("CAP surfaces :")
for nom,box in [("panneau titre",(120,300,300,320)),("carte 1",(120,520,300,532)),
                ("carte 2",(120,770,300,782)),("carte 3",(120,1030,300,1042)),
                ("panneau bas",(120,1625,300,1638)),("fond ecran",(120,1300,900,1400))]:
    c=m(cap,*box); print(f"   {nom:16s} {c}  B-R={c[2]-c[0]:+3d}")
print()
print("BORDS : 6 px de part et d'autre du bord gauche des panneaux")
p=ref.load()
print("   REF .pann  y=1700 x46..56 :", [p[x,1700] for x in range(46,57)])
print("   REF .fen   y=760  x80..92 :", [p[x,760] for x in range(80,93)])
print("   REF .elast y=1300 x46..58 :", [p[x,1300] for x in range(46,59)])
q=cap.load()
print("   CAP carte1 y=560  x33..47 :", [q[x,560] for x in range(33,48)])
print("   CAP titre  y=350  x33..47 :", [q[x,350] for x in range(33,48)])
print("   CAP carte1 haut x=540 y495..508 :", [q[540,y] for y in range(495,509)])
