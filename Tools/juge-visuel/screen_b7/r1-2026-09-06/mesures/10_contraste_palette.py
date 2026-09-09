"""10 - Contrastes WCAG (doctrine : >=3:1 grands textes, >=4,5:1 petits) et palette globale.
Controle positif : le contraste de #eae0c8 sur #000000 doit valoir 15,3:1 (valeur connue).
Controle negatif : #111823 sur #111823 doit valoir 1,00:1."""
from PIL import Image
from statistics import median

def L(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    r,g,b=c[:3]; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def ratio(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)

print(f"[+] #eae0c8 sur #000000 = {ratio((234,224,200),(0,0,0)):.2f}:1  (attendu ~15,3)")
print(f"[-] #111823 sur #111823 = {ratio((17,24,35),(17,24,35)):.2f}:1  (attendu 1,00)")
print()
paires = [
 ("REF titre or_vif / .enseigne",      (242,201,107),(16,21,30)),
 ("CAP titre #ffd240 / panneau",       (255,210,64), (22,22,28)),
 ("REF sous-titre creme2 / .enseigne", (185,173,146),(20,26,34)),
 ("CAP sous-titre creme2 / panneau",   (185,173,146),(22,22,28)),
 ("REF .pi i muet / .pi",              (138,151,156),(17,24,35)),
 ("CAP eyebrow carte creme2 / carte",  (185,173,146),(22,22,28)),
 ("REF .pann b creme / .pann",         (234,224,200),(17,24,35)),
 ("CAP titre panneau #ffd240 / panneau",(255,210,64),(22,22,28)),
 ("REF corps creme2 / .pann",          (185,173,146),(17,24,35)),
 ("CAP corps creme2 / panneau",        (185,173,146),(22,22,28)),
 ("REF verdict or_vif / .pi",          (242,201,107),(17,24,35)),
 ("CAP phrase creme / carte",          (234,224,200),(22,22,28)),
 ("REF cle #6b737d / .pi",             (107,115,125),(17,24,35)),
]
for n,a,b in paires:
    print(f"   {n:38s} {ratio(a,b):5.2f}:1")
print()
print("=== PALETTE GLOBALE (quantifiee 12 couleurs, zone de CONTENU seulement) ===")
def palette(path, box, nom):
    im=Image.open(path).convert('RGB'); print(f"  ouvre {path}: {im.size}  zone={box}")
    z=im.crop(box); tot=z.width*z.height
    q=z.quantize(colors=10, method=Image.MEDIANCUT).convert('RGB')
    cs=sorted(q.getcolors(100000), reverse=True)[:6]
    print(f"  -- {nom} (aire {tot} px)")
    for n,c in cs:
        print(f"       {c}  {100.0*n/tot:5.2f}%")
    # luminance moyenne + densite d'encre
    p=z.load(); s=0; enc=0
    for y in range(0,z.height,3):
        for x in range(0,z.width,3):
            l=L(p[x,y]); s+=l
            if l>0.035: enc+=1
    n=len(range(0,z.height,3))*len(range(0,z.width,3))
    print(f"       luminance moyenne={s/n:.4f}   densite d'encre (L>0.035)={100.0*enc/n:.1f}%")
palette('../reference-1080x2102.png',(24,434,1056,2082),"REFERENCE zone de contenu")
palette('../capture-1080x2400.png',(0,143,1080,2193),"CAPTURE zone de contenu")
