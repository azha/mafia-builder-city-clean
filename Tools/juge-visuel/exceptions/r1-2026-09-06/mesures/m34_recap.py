# m34 — récapitulatif chiffré (toutes les grandeurs citées dans le rapport passent par ici).
from util import *
print("== m34 récapitulatif ==")
ref=ouvrir(REF); cap=ouvrir(CAP); capsc=ouvrir(CAPSC)
print(f"  teintes distinctes, contenu dessiné : CAP y1280..2130 = {len(cap.crop((0,1280,1080,2130)).getcolors(1<<24))}"
      f"   RÉF y216..2100 = {len(ref.crop((0,216,1080,2100)).getcolors(1<<24))}")
print(f"  teintes distinctes, écran entier    : CAP = {len(cap.getcolors(1<<24))}   RÉF = {len(ref.getcolors(1<<24))}")
print(f"  bandeau capture : panneau (13,20,26) jusqu'à y=142, filet rouge y138..142, fond y143 = {mediane_fenetre(cap,900,143,1)}")
print(f"  dock capture : dégradé à partir de y≈2156 ; hauteur = {2400-2156} px")
print(f"  marges latérales : CAP pavé/CTA/filet x0=36 x1=1043 (gouttière 36/36) ; RÉF x0=39 x1≈1041 (gouttière 39/39)")
# aire des masses saumon
px=cap.load(); n=sum(1 for y in range(1280,2130) for x in range(1080)
                     if abs(px[x,y][0]-255)<8 and abs(px[x,y][1]-90)<8 and abs(px[x,y][2]-77)<8)
print(f"  aire saumon (255,90,77) dans le contenu dessiné : {n} px = {n/918000*100:.1f} %")
pr=ref.load(); m=sum(1 for y in range(216,2100) for x in range(1080)
                     if abs(pr[x,y][0]-217)<14 and abs(pr[x,y][1]-204)<14 and abs(pr[x,y][2]-169)<14)
print(f"  aire crème (217,204,169) dans le contenu réf   : {m} px = {m/2034720*100:.1f} %")
