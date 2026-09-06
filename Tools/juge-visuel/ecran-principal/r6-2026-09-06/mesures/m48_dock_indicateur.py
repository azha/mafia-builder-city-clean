# m48 — F09 : l'indicateur d'onglet actif et la pastille sont-ils ABSENTS, ou seulement d'une autre
#   couleur que le laiton ? Deux sondes :
#   (a) CAPACITE : la sonde "dore" trouve-t-elle du dore AILLEURS sur la MEME capture ?
#   (b) FORME : amplitude (pic - mediane) sous chaque rond et au coin haut-droit de chaque rond,
#       sans hypothese de couleur. Controle POSITIF : la reference doit rendre une grande amplitude.
from lib import *
def gold(im,x0,y0,x1,y1,label,s):
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1)
         if (lambda c:c[0]-c[2]>45 and c[0]>120)(im.getpixel((x,y)))]
    print(f"    {label}: {len(pts)} px dores"
          + (f"  x {min(p[0] for p in pts)/s:.1f}..{max(p[0] for p in pts)/s:.1f} y {min(p[1] for p in pts)/s:.1f}..{max(p[1] for p in pts)/s:.1f} CSS" if pts else ""))
    return len(pts)
def amp(im,x0,y0,x1,y1,label,s):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    m=median(ls); pk=max(ls); mn=min(ls)
    print(f"    {label}: mediane L={m:6.1f} pic {pk:6.1f} min {mn:6.1f}  AMPLITUDE={pk-m:6.1f}")
    return pk-m
print("== m48a CAPACITE de la sonde doree sur les MEMES captures ==")
c=load(CAP19); c24=load(CAP24); r=load(REF)
gold(c,0,120,1080,150,'JEU 1920 — filet du bandeau (doit trouver)',S_CAP)
gold(c,40,1440,360,1620,'JEU 1920 — bouton OR de la fiche (doit trouver)',S_CAP)
gold(c,160,1660,920,1840,'JEU 1920 — TOUTE la bande du dock',S_CAP)
gold(c24,160,2140,920,2320,'JEU 2400 — TOUTE la bande du dock',S_CAP)
gold(r,160,1817,1010,2088,'REF   — TOUTE la bande du dock (controle positif)',S_REF)
print()
print("== m48b FORME, sans hypothese de couleur : sous chaque rond (bande de 8 CSS) ==")
print("  REFERENCE (le rond ACTIF est EMPIRE : un trait laiton 14x2 CSS y est attendu)")
for i,cx in enumerate((94,162,230,298)):
    x0=int((cx-10)*S_REF); x1=int((cx+10)*S_REF)
    amp(r,x0,1988,x1,2004,f'    ref sous rond {i+1} (x {cx-10}..{cx+10} CSS, y 662,7..668,0)',S_REF)
print("  JEU 1920")
for i,cx in enumerate((94,162,230,298)):
    x0=int((cx-10)*S_CAP); x1=int((cx+10)*S_CAP)
    amp(c,x0,1826,x1,1842,f'    jeu sous rond {i+1}',S_CAP)
print()
print("== m48c FORME : coin haut-droit de chaque rond (pastille attendue sur FAMILLE au canon) ==")
for i,cx in enumerate((94,162,230,298)):
    x0=int((cx+13)*S_REF); x1=int((cx+26)*S_REF)
    amp(r,x0,1838,x1,1862,f'    ref coin rond {i+1}',S_REF)
for i,cx in enumerate((94,162,230,298)):
    x0=int((cx+13)*S_CAP); x1=int((cx+26)*S_CAP)
    amp(c,x0,1686,x1,1710,f'    jeu coin rond {i+1}',S_CAP)
