# m4 — geometrie verticale : bord haut/bas du panneau, plaque TRANCHER, separateurs, dock.
# Methode : la bordure du panneau a une couleur distincte (~(33,38,47)) nettement plus CLAIRE
# que l'interieur (~(12,18,30)). On scanne la colonne x=100 (hors texte, hors boutons).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':B+"r2-2026-10-07/reference/cadre-4-la-suite.png",
     'J1920':B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",
     'J2400':B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,ch in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {ch.split('/')[-1]} {im.size} ===")
    for x in (56, 540, 1024):
        # cherche les lignes ou la colonne passe par la couleur de bordure claire
        cands=[y for y in range(im.height) if abs(px[x,y][0]-33)<10 and abs(px[x,y][1]-38)<10 and abs(px[x,y][2]-47)<10]
        # regroupe
        gr=[];cur=[cands[0]] if cands else []
        for y in cands[1:]:
            if y-cur[-1]<=2: cur.append(y)
            else: gr.append((cur[0],cur[-1])); cur=[y]
        if cur: gr.append((cur[0],cur[-1]))
        print(f"  colonne x={x} : bordures (33,38,47)+-10 ->", [g for g in gr if g[1]-g[0]<40][:20])
