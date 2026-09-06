# m31 — (a) volutes du bandeau  (b) indicateur d'onglet actif + pastille du dock
# Chaque sonde porte son CONTROLE POSITIF (elle DOIT trouver sur la reference).
from lib import *
def count_ink(im,x0,y0,x1,y1,s,label,thr_abs=None,ref_bg=None):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//4]; pk=max(ls)
    thr= thr_abs if thr_abs else bg+0.5*(pk-bg)
    n=sum(1 for v in ls if v>=thr)
    xs=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
    ex = (min(p[0] for p in xs)/s,max(p[0] for p in xs)/s,min(p[1] for p in xs)/s,max(p[1] for p in xs)/s) if xs else None
    print(f"    {label}: fond L={bg:.1f} pic L={pk:.1f} seuil {thr:.1f} -> n={n} px"
          + (f"  x {ex[0]:.2f}..{ex[1]:.2f} y {ex[2]:.2f}..{ex[3]:.2f} CSS" if ex else ""))
    return n
print("== m31a volutes du bandeau (fenetres CSS x 4..29 / 363..388, y 18..30) ==")
r=load(REF)
# CONTROLE POSITIF sur la reference
count_ink(r,12,54,87,90,S_REF,'REF volute GAUCHE  (controle positif)')
count_ink(r,1089,54,1164,90,S_REF,'REF volute DROITE  (controle positif)')
for p,nm in [(CAP19,'JEU 1920'),(CAP24,'JEU 2400'),(DIS24,'JEU district 2400')]:
    im=load(p)
    count_ink(im,11,50,80,83,S_CAP,f'{nm} volute GAUCHE')
    count_ink(im,1000,50,1069,83,S_CAP,f'{nm} volute DROITE')

print("\n== m31b indicateur d'onglet ACTIF (barre laiton sous un rond) + pastille (disque or) ==")
def gold_px(im,x0,y0,x1,y1,s,label):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1)
         if (lambda c: c[0]-c[2]>45 and c[0]>120)(im.getpixel((x,y)))]
    if not pts: print(f"    {label}: 0 px laiton/or"); return 0
    print(f"    {label}: {len(pts)} px  x {min(p[0] for p in pts)/s:.2f}..{max(p[0] for p in pts)/s:.2f} "
          f"y {min(p[1] for p in pts)/s:.2f}..{max(p[1] for p in pts)/s:.2f} CSS  couleur {im.getpixel(pts[len(pts)//2])}")
    return len(pts)
# canon : dock y 605.7..695.9 CSS -> px 1817..2088 ; barre active sous EMPIRE ~ y 663..666 CSS
gold_px(r,180,1980,1000,2010,S_REF,'REF barre active + pastille (controle positif, dock entier)')
for p,nm in [(CAP19,'JEU 1920'),(CAP24,'JEU 2400')]:
    im=load(p)
    y0,y1=(1780,1840) if nm=='JEU 1920' else (2260,2320)
    gold_px(im,160,y0,920,y1,S_CAP,f'{nm} bande sous les ronds')
    y0b,y1b=(1660,1780) if nm=='JEU 1920' else (2140,2260)
    gold_px(im,160,y0b,920,y1b,S_CAP,f'{nm} bande des ronds (pastille)')
