# m24 — couche globale : palette quantifiee, luminance, densite d'encre, et TRANSLUCIDITE
# du panneau (ecart-type de son interieur hors texte : un verre qui laisse voir le decor varie).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def globale(ch,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    q=im.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    from collections import Counter
    c=Counter(q.getdata()); n=im.width*im.height
    print(f"\n  {t} [{im.size}]")
    print("    palette (8 couleurs) :", ", ".join(f"{k} {100*v/n:.1f}%" for k,v in c.most_common(8)))
    vals=[lum(px[x,y]) for y in range(0,im.height,4) for x in range(0,im.width,4)]
    vals.sort(); m=len(vals)
    print(f"    luminance moyenne={sum(vals)/m:.2f}  mediane={vals[m//2]:.1f}  p90={vals[int(m*.9)]:.1f}  p99={vals[int(m*.99)]:.1f}")
    enc=100*sum(1 for v in vals if v>70)/m
    print(f"    densite d'encre (lum>70) = {enc:.2f} %")
def verre(ch,x0,y0,x1,y1,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    m=sum(vals)/len(vals); sd=(sum((v-m)**2 for v in vals)/len(vals))**0.5
    print(f"  {t:52s} moy={m:6.2f}  ecart-type={sd:5.2f}  min={min(vals):.1f} max={max(vals):.1f}  n={len(vals)}")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
globale(R,"REF cadre-4"); globale(J,"JEU 1080x1920"); globale(K,"JEU 1080x2400")
print("\n  TRANSLUCIDITE du panneau — bande sans texte, pleine largeur interieure :")
verre(R,60,1250,1020,1330,"REF   bande y1250..1330 (entre sous-titre 2 et sep 2)")
verre(J,60,1212,1020,1240,"J1920 bande y1212..1240 (avant sep 2)")
verre(K,60,1620,1020,1646,"J2400 bande y1620..1646 (avant sep 2)")
verre(R,60,1560,1020,1615,"REF   bande basse du panneau y1560..1615")
verre(J,60,1415,1020,1445,"J1920 bande basse du panneau y1415..1445")
print("\n  TRANSLUCIDITE de la plaque TRANCHER :")
verre(R,520,1690,1020,1710,"REF   plaque y1690..1710")
verre(J,520,1500,1020,1525,"J1920 plaque y1500..1525")
print("\n  NEAR-BLACK du decor (seuil lum<10 et <12), zone de decor propre a chaque image :")
for nom,ch,ya,yb in (("REF",R,170,816),("J1920",J,170,745),("J2400",K,170,1150)):
    im=Image.open(ch).convert('RGB'); px=im.load()
    vals=[lum(px[x,y]) for y in range(ya,yb,2) for x in range(60,1020,3)]
    n=len(vals)
    print(f"   {nom:6s} y{ya}..{yb} : moy={sum(vals)/n:5.2f}  <10 : {100*sum(1 for v in vals if v<10)/n:5.1f} %   <12 : {100*sum(1 for v in vals if v<12)/n:5.1f} %  n={n}")
