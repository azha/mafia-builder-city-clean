# m2 — reperes fins : bord haut/gauche/droit du panneau, filet or, plaque TRANCHER, dock.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':B+"r2-2026-10-07/reference/cadre-4-la-suite.png",
     'J1920':B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",
     'J2400':B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def ligne(im,y,x0,x1,pas=1):
    px=im.load(); return [lum(px[x,y]) for x in range(x0,x1,pas)]

for nom,ch in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {ch.split('/')[-1]} {im.size} ===")
    # 1) FILET OR : ligne la plus "jaune" (R-B eleve) dans la zone 700..1400
    y0,y1 = (700,900) if nom=='REF' else ((700,900) if nom=='J1920' else (1100,1300))
    best=[]
    for y in range(y0,y1):
        s=0; n=0
        for x in range(200,900,2):
            p=px[x,y]; s+= (p[0]-p[2]); n+=1
        best.append((s/n,y))
    best.sort(reverse=True)
    print("  filet or (R-B max) 3 meilleures lignes :", [(f"y={y}",f"R-B={v:.1f}") for v,y in best[:3]])
    yor=best[0][1]
    # etendue horizontale du filet : pixels ou R-B > 30
    xs=[x for x in range(0,1080) if (px[x,yor][0]-px[x,yor][2])>30]
    if xs: print(f"  filet or y={yor} : x {min(xs)}..{max(xs)}  largeur={max(xs)-min(xs)+1}px  couleur centre={px[(min(xs)+max(xs))//2,yor]}")
    else: print(f"  filet or y={yor} : aucun pixel R-B>30")
    # epaisseur : colonne au centre du filet
    if xs:
        xc=(min(xs)+max(xs))//2
        ep=[y for y in range(yor-15,yor+15) if (px[xc,y][0]-px[xc,y][2])>30]
        print(f"  epaisseur du filet a x={xc} : {len(ep)} px  (y {min(ep)}..{max(ep)})" if ep else "  epaisseur: 0")
    # 2) BORD GAUCHE/DROIT du panneau : ligne horizontale traversant l'interieur du panneau
    yint = {'REF':1000,'J1920':1060,'J2400':1460}[nom]
    l=ligne(im,yint,0,1080)
    # le panneau est plus sombre que le decor : cherche la plus longue plage sombre centrale
    seuil = 30
    print(f"  ligne interieure y={yint} : lum x=0..1079 (echantillon tous les 60) :",
          " ".join(f"{x}:{l[x]:.0f}" for x in range(0,1080,60)))
