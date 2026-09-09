#!/usr/bin/env python3
# m10 — comparaison de CHAINES IDENTIQUES presentes dans les deux images.
#   Meme texte + meme police (DejaVu, aucune substitution) => la largeur d'encre
#   est une mesure DIRECTE du corps. Aucune hypothese sur le ratio capHeight.
# Controle positif : la fiche b ("...d'ou ca part" en dessous) a des hauteurs de
#   bande deja mesurees egales (24 px des deux cotes en m08) -> la chaine
#   "D'OU CA PART" doit sortir a peu pres EGALE ; si tout sortait +40 %, l'instrument
#   mesurerait autre chose.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def bbox(im, x0,y0,x1,y1, mode, seuil):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            v=L(px[x,y])
            if (mode=='clair' and v>=seuil) or (mode=='sombre' and v<=seuil):
                xs.append(x);ys.append(y)
    if not xs: return None
    return (min(xs),min(ys),max(xs),max(ys))

paires = [
 # (libelle, chaine, (im,box,mode,seuil) REF, idem CAP)
 ("fiche i  bas-gauche", "D'OU CA PART",
   (REF,(80,770,420,800),'sombre',120), (CAP,(130,640,420,665),'sombre',120)),
 ("fiche i  droite",     "OU CA VA",
   (REF,(255,1310,520,1345),'sombre',120), (CAP,(600,700,810,730),'sombre',120)),
 ("lecture u ligne1",    "LE CHEMIN",
   (REF,(45,1470,260,1500),'clair',90),  (CAP,(45,980,260,1012),'clair',90)),
 ("lecture u ligne2",    "A TRAVERSER",
   (REF,(45,1532,300,1562),'clair',90),  (CAP,(45,1045,300,1078),'clair',90)),
 ("lecture u ligne3",    "CETTE ROUTE",
   (REF,(45,1598,300,1630),'clair',90),  (CAP,(45,1110,300,1142),'clair',90)),
 ("lecture b ligne1",    "droit - le plus court",
   (REF,(600,1470,1040,1505),'clair',90),(CAP,(560,980,1040,1020),'clair',90)),
 ("lecture b ligne2",    "aucune riviere",
   (REF,(600,1532,1040,1566),'clair',90),(CAP,(560,1045,1040,1080),'clair',90)),
 ("legende CTA",         "a pied . ca vide le stock du labo",
   (REF,(560,1972,1040,2006),'clair',80),(CAP,(45,2062,1040,2098),'clair',80)),
 ("role du lieutenant",  "LA REGULATION (+ '. J9' cote REF)",
   (REF,(196,1764,470,1794),'clair',80), (CAP,(176,1762,470,1790),'clair',80)),
]
print("\n%-22s %-34s | %-26s | %-26s | %s" % ("element","chaine","REFERENCE (x0,y0,x1,y1) w x h","CAPTURE  (x0,y0,x1,y1) w x h","ratio l / h"))
print("-"*150)
for lib, ch, (ir,br,mr,sr), (ic,bc,mc,sc) in paires:
    a=bbox(ir,*br,mr,sr); b=bbox(ic,*bc,mc,sc)
    if a is None or b is None:
        print("%-22s %-34s | %s | %s |" % (lib,ch, "INTROUVABLE" if a is None else a, "INTROUVABLE" if b is None else b)); continue
    wa,ha=a[2]-a[0]+1,a[3]-a[1]+1; wb,hb=b[2]-b[0]+1,b[3]-b[1]+1
    print("%-22s %-34s | %-16s %3dx%-3d | %-16s %3dx%-3d | l x%.3f  h x%.3f"
          % (lib,ch,str(a),wa,ha,str(b),wb,hb,wb/wa,hb/ha))

print("\n--- TITRE et SOUS-TITRE (chaines DIFFERENTES : on compare la hauteur de la CAPITALE seule) ---")
def capitale(im,x0,y0,x1,y1,mode,seuil,nom):
    bb=bbox(im,x0,y0,x1,y1,mode,seuil)
    if bb is None: print(f"  {nom}: rien"); return None
    h=bb[3]-bb[1]+1
    print(f"  {nom:46s} bbox={bb} h={h:3d} px = {h/3.6:5.2f} CSS  w={bb[2]-bb[0]+1} px")
    return h
hr=capitale(REF, 48,470, 80,515,'clair',100, "REF titre : 'L' de \"L'envoi de ce soir\" (12px)")
hc=capitale(CAP, 52,285, 96,345,'clair',100, "CAP titre : 'C' de \"C'est livre\"")
print(f"    => rapport hauteur de capitale du TITRE : x{hc/hr:.3f}")
hr2=capitale(REF, 48,538, 70,572,'clair',95,  "REF sous-titre : 'O' de \"On choisit\" (7px)")
hc2=capitale(CAP, 52,398, 82,442,'clair',95,  "CAP sous-titre : 'L' de \"La marchandise\"")
print(f"    => rapport hauteur de capitale du SOUS-TITRE : x{hc2/hr2:.3f}")
hr3=capitale(REF,196,1714,232,1752,'clair',90, "REF nom : 'L' de \"Lt. Rin\" (10px Serif)")
hc3=capitale(CAP,176,1718,212,1756,'clair',90, "CAP nom : 'D' de \"Dima\"")
print(f"    => rapport hauteur de capitale du NOM : x{hc3/hr3:.3f}")
hr4=capitale(REF, 85,725,120,760,'sombre',120,"REF fiche b : 'A' de \"Atelier\" (9px Serif)")
hc4=capitale(CAP,135,598,162,632,'sombre',120,"CAP fiche b : 'L' de \"L'entrepot\"")
print(f"    => rapport hauteur de capitale de la FICHE : x{hc4/hr4:.3f}")
