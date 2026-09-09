#!/usr/bin/env python3
"""(a) Couleurs d'encre des textes (mediane des pixels les plus opaques du glyphe).
(b) Texture (ecart-type de luminance) de la bande HAUTE : art de district (REF) vs aplat (CAP).
(c) Liseré interne clair de .sv-plaque (inset 0 1px 0 #ffffff0d).
Controle positif (a) : '.sv-plaque .tenu.vous b' doit valoir #8fdfe4 en REFERENCE (<=6).
Controle negatif (a) : '.sv-plaque .q b' (#eef3f9) doit en DIFFERER de >6."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
def H(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))
def encre(im,x0,y0,x1,y1,frac=0.10):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum,reverse=True)
    k=max(1,int(len(ps)*frac)); sel=ps[:k]
    return tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3))
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
print("\n=== (a) COULEURS D'ENCRE (mediane du decile le plus clair du glyphe) ===")
T=[("h3 titre",           (51,477,988,521),  (48,277,984,322),  "#eef3f9"),
   ("p sous-titre",       (51,541,876,568),  (47,340,873,366),  "#8d99a6"),
   ("jeton b (or)",       (180,677,447,703), (174,467,610,500), "#d9ab4e"),
   ("jeton i",            (574,718,989,741), (684,474,995,498), "#9a8a6a"),
   ("plaque q b",         (154,885,385,912), (149,649,379,676), "#eef3f9"),
   ("plaque q i",         (154,928,420,952), (149,693,414,717), "#8d99a6"),
   ("plaque tenu.vous b", (915,895,989,912), (922,658,995,675), "#8fdfe4"),
   ("plaque tenu i",      (843,928,990,946), (751,697,995,714), "#8d99a6"),
   ("sv-dit italique",    (51,1826,1027,1857),(43,1894,1023,1925),"#cdd6e0"),
  ]
print(f"{'texte':22s} {'REF':>20s}  d(CSS) {'CAP':>20s}  d(REF,CAP)")
for nom,rb,cb,css in T:
    a=encre(ref,*rb); b=encre(cap,*cb)
    print(f"{nom:22s} {hx(a)} {str(a):>15s} {d(a,H(css)):>3d}  {hx(b)} {str(b):>15s} {d(a,b):>6d}   CSS {css}")
print("\n  CTA (etats DIFFERENTS : REF = .sv-geste actif ; CAP = .sv-geste.mort)")
a=encre(ref,95,1975,691,2002); b=encre(cap,89,2032,700,2059)
print(f"   libelle  REF {hx(a)} {a}  vs CSS actif #d9ab4e ecart={d(a,H('#d9ab4e'))}")
print(f"            CAP {hx(b)} {b}  vs CSS .mort #8b6a6a ecart={d(b,H('#8b6a6a'))}")
a=encre(ref,701,1979,986,2003); b=encre(cap,706,2035,1027,2060)
print(f"   small    REF {hx(a)} {a}  vs CSS actif #9a8a6a ecart={d(a,H('#9a8a6a'))}")
print(f"            CAP {hx(b)} {b}  vs CSS .mort #7a6060 ecart={d(b,H('#7a6060'))}")
b=encre(cap,47,1232,762,1258)
print(f"\n  titron (CAP seul) {hx(b)} {b}  vs CSS .sv-titron #7e8b98 ecart={d(b,H('#7e8b98'))}")

print("\n=== (b) TEXTURE de la bande HAUTE (ecart-type de luminance, pas de 2 px) ===")
def sigma(im,x0,y0,x1,y1):
    px=im.load(); vs=[lum(px[x,y]) for y in range(y0,y1,2) for x in range(x0,x1,2)]
    m=sum(vs)/len(vs); return m,(sum((v-m)**2 for v in vs)/len(vs))**0.5,len(vs)
for nom,im,box in (("REF bande scene (y 230..430)",ref,(20,230,1060,430)),
                   ("CAP bande tete  (y 150..270)",cap,(20,150,1060,270)),
                   ("REF fond panneau vide (temoin plat)",ref,(200,1500,900,1700)),
                   ("CAP fond panneau vide (temoin plat)",cap,(200,1400,900,1600))):
    m,s,n=sigma(im,*box); print(f"   {nom:38s} moyenne={m:6.2f}  sigma={s:6.2f}  n={n}")

print("\n=== (c) LISERE INTERNE de .sv-plaque (inset 0 1px 0 #ffffff0d) ===")
def bande(im,y,x0,x1):
    px=im.load(); vs=[px[x,y] for x in range(x0,x1)]; vs.sort(key=lum); return vs[len(vs)//2]
print("   REF plaque1, lignes juste sous la bordure haute (851..853) :")
for y in range(852,862): print(f"     y={y} {hx(bande(ref,y,600,720))}")
print("   CAP plaque1, lignes juste sous la bordure haute (616..619) :")
for y in range(617,627): print(f"     y={y} {hx(bande(cap,y,600,720))}")
