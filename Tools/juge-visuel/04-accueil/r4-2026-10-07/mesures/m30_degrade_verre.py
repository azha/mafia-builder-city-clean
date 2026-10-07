# m30 — le panneau a-t-il son DEGRADE vertical ? (la maquette : 180deg #0c1320ef -> #080d17f6)
# On echantillonne des bandes SANS texte, de haut en bas du panneau, cote gauche (x 58..90).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def med(px,x0,y0,x1,y1):
    c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in c)
CAS=[('REF',B+"r2-2026-10-07/reference/cadre-4-la-suite.png",832,1615),
     ('J1920',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",835,1443),
     ('J2400',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1240,1850)]
for nom,ch,ya,yb in CAS:
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n  {nom} [{im.size}] panneau y {ya}..{yb}, colonne x 58..90 (hors texte)")
    n=6
    for i in range(n):
        y0=int(ya+(yb-ya)*i/n); y1=int(ya+(yb-ya)*(i+1)/n)
        c=med(px,58,y0,90,y1)
        print(f"    tranche {i+1}/{n} y {y0}..{y1} : RGB {c}  lum={lum(c):.2f}")
