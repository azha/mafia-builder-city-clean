# m5 — rythme vertical du panneau LA SUITE : bord haut, separateurs, bord bas, bandes de texte.
# Separateur = ligne horizontale plus CLAIRE que l'interieur, traversant x=120..900.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",780,1700),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",790,1500),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1190,1900)}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
res={}
for nom,(ch,y0,y1) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {ch.split('/')[-1]} {im.size} ===")
    # profil : moyenne de luminance sur une bande horizontale SANS texte (x 120..420 est du texte)
    # on prend x 150..900 mais on cherche les lignes PLATES (ecart-type faible) et CLAIRES
    lignes=[]
    for y in range(y0,y1):
        vals=[lum(px[x,y]) for x in range(150,900,5)]
        m=sum(vals)/len(vals)
        sd=(sum((v-m)**2 for v in vals)/len(vals))**0.5
        lignes.append((y,m,sd))
    # separateur : m eleve par rapport aux voisins a +-6 px, et sd faible
    for y,m,sd in lignes:
        i=y-y0
        if i<8 or i>len(lignes)-9: continue
        voisins=[lignes[i-8][1],lignes[i-7][1],lignes[i+7][1],lignes[i+8][1]]
        if m-sum(voisins)/4 > 2.0 and sd < 12:
            print(f"   ligne claire plate y={y}  lum={m:.1f} (voisins {sum(voisins)/4:.1f}) sd={sd:.1f}  RGB@x=300:{px[300,y]} @x=800:{px[800,y]}")
