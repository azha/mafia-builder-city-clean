# -*- coding: utf-8 -*-
"""COULEURS : medianes de fenetres a >=8 px de tout bord, des deux cotes.
CONTROLE POSITIF : la bordure basse de l'enseigne de la REFERENCE doit rendre (176,141,62)=#b08d3e a +-4.
CONTROLE NEGATIF : deux fenetres de la REFERENCE choisies dans des boites DIFFERENTES (.fen #0a0e16 et
                   .pann/.ct #111823) doivent rendre des valeurs DIFFERENTES (>=6/canal)."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)
def hexa(c): return "#%02x%02x%02x"%c

ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("ref", ref.size, " cap", cap.size)

print("\n--- REFERENCE #113 (cadre nominal) ---")
Z=[("fond .hrz6 tres haut (sous cerne)",  (300,462,760,476)),
   ("fond .hrz6 gouttiere G (x=30..44)",  (30,900,44,1200)),
   ("fond .hrz6 bas (sous cta)",          (300,2040,760,2058)),
   ("bord .cerne (or)",                   (400,452,700,455)),
   ("bord haut .enseigne (ardoise)",      (300,481,700,484)),
   ("bord bas .enseigne (or 2px)",        (300,641,700,646)),
   ("fond .enseigne",                     (620,490,760,510)),
   ("bord .fen (ardoise)",                (120,679,300,682)),
   ("fond .fen (interieur)",              (300,700,340,740)),
   ("chiffre compteur (cyan)",            (160,710,176,730)),
   ("bord .elast (ardoise)",              (300,825,700,828)),
   ("fond .elast (entre 2 cartes)",       (300,1075,700,1080)),
   ("fond .ct (carte)",                   (700,1120,900,1160)),
   ("bord .cta6 (or)",                    (400,1902,700,1905)),
   ("fond .cta6",                         (330,1975,700,1988)),
   ("titre 'L' encre (or)",               (348,525,368,550)),
  ]
for n,(a,b,c,d) in Z: print("   %-36s %s  %s" % (n, med(ref,a,b,c,d), hexa(med(ref,a,b,c,d))))

print("\n--- CAPTURE etat-vide (ecran SEUL) ---")
Z=[("fond ecran haut (y=200..240)",       (300,200,760,240)),
   ("fond ecran gouttiere G (x=20..40)",  (20,900,40,1200)),
   ("fond ecran bas (y=2200..2280)",      (300,2200,760,2280)),
   ("fond ecran tres bas (y=2340..2390)", (300,2340,760,2390)),
   ("bord haut .enseigne (or)",           (300,279,700,282)),
   ("bord bas .enseigne (or)",            (300,459,700,462)),
   ("fond .enseigne",                     (700,300,800,325)),
   ("bord .fen (or)",                     (120,495,300,498)),
   ("fond .fen (interieur)",              (300,510,340,535)),
   ("chiffre compteur (cyan)",            (160,550,176,570)),
   ("bord .elast (or)",                   (300,678,700,682)),
   ("fond .elast (vide, y=1200)",         (300,1150,700,1250)),
   ("fond bloc paliers",                  (700,760,900,860)),
   ("bord .pann (or)",                    (300,1853,700,1856)),
   ("fond .pann",                         (700,1870,900,1900)),
   ("titre 'L' encre (or)",               (340,345,362,368)),
  ]
for n,(a,b,c,d) in Z: print("   %-36s %s  %s" % (n, med(cap,a,b,c,d), hexa(med(cap,a,b,c,d))))

print()
p=med(ref,300,641,700,646); print("CONTROLE POSITIF bord bas enseigne REF =",p,hexa(p),"attendu (176,141,62) #b08d3e")
a=med(ref,300,700,340,740); b=med(ref,700,1120,900,1160)
print("CONTROLE NEGATIF REF .fen",a,hexa(a)," vs .ct",b,hexa(b)," ecart max/canal =",max(abs(a[i]-b[i]) for i in range(3)))
