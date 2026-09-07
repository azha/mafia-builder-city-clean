#!/usr/bin/env python3
# m15 — verifications finales : (a) le liege de la capture est-il VRAIMENT d'une
#       seule teinte (fenetre propre, loin de la ficelle et des fiches) ?
#       (b) somme des zones == hauteur de contenu, des deux cotes (falsifiable du
#       decoupage lui-meme) ; (c) recherche d'un texte COUPE ou hors cadre.
# Controle positif (a) : la meme fenetre sur la REFERENCE doit rendre BEAUCOUP de
#       teintes (le liege est texture) -- sinon la sonde ne voit pas la texture.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)

print("\n--- (a) teintes du liege, fenetres PROPRES ---")
def teintes(im,x0,y0,x1,y1,nom):
    px=im.load(); s={}
    for y in range(y0,y1):
        for x in range(x0,x1): 
            c=px[x,y]; s[c]=s.get(c,0)+1
    n=(x1-x0)*(y1-y0)
    top=sorted(s.items(),key=lambda t:-t[1])[:3]
    print(f"  {nom:46s} n={n:6d}  teintes distinctes = {len(s):5d}   dominantes: " +
          ", ".join("#%02x%02x%02x(%.1f%%)"%(c[0],c[1],c[2],100*v/n) for c,v in top))
teintes(REF, 700, 900, 900, 1100, "REF liege 200x200 (entre fiches, hors fil)")
teintes(CAP, 130, 800, 330,  900, "CAP liege 200x100 (sous le fil, hors fiches)")
teintes(CAP, 700, 600, 900,  680, "CAP liege 200x80  (a droite, hors fiches)")

print("\n--- (b) FALSIFIABLE DU DECOUPAGE : somme des zones == hauteur de contenu ---")
def somme(nom, H, zones):
    s=sum(b-a for _,a,b in zones)
    print(f"  {nom} : contenu H={H} px ; somme des zones = {s} px ; ecart = {H-s} px  -> {'OK' if H==s else 'INCOHERENT'}")
    for lib,a,b in zones: print(f"      {lib:28s} {b-a:5d} px  {(b-a)/3.6:6.1f} CSS  {100*(b-a)/H:5.1f} %")
somme("REFERENCE (434..2102)", 2102-434,
      [("entete",434,604),("planche (liege)",604,1425),("lecture",1425,1673),("bas",1673,2102)])
somme("CAPTURE   (143..2179)", 2179-143,
      [("titre + sous-titre",143,524),("planche (brun)",524,956),("lecture",956,1240),
       ("VOS COURRIERS (en trop)",1240,1690),("perso",1690,1890),("CTA + legende",1890,2110),
       ("gouttiere basse",2110,2179)])

print("\n--- (c) TEXTE COUPE / HORS CADRE : encre touchant un bord de l'ecran ou du dock ---")
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
px=CAP.load()
for nom,x in [("bord GAUCHE x=0..3",0),("bord DROIT x=1076..1079",1076)]:
    n=sum(1 for y in range(143,2179) for xx in range(x,x+4) if L(px[xx,y])>=70)
    print(f"  {nom} : {n} px clairs (>=70 L) dans la zone de contenu")
n=sum(1 for x in range(4,1076) for y in range(2170,2182) if L(px[x,y])>=70)
print(f"  bande 2170..2181 (frontiere contenu/dock) : {n} px clairs")
n=sum(1 for x in range(4,1076) for y in range(143,152) if L(px[x,y])>=70)
print(f"  bande 143..151   (juste sous le bandeau)  : {n} px clairs  (medaillon du chrome attendu)")

print("\n--- (d) rappel des ecarts d'ECHELLE typographiques mesures (m10) ---")
for lib,r in [("titre",1.438),("sous-titre",1.421),(".lecture b (chaine identique)",1.157),
              (".lecture u (hauteur)",1.15),("legende du CTA (chaine identique)",1.076),
              ("nom du lieutenant",1.074),(".fiche b",1.000),(".fiche i",0.840)]:
    print(f"    {lib:36s} x{r:.3f}  ({100*(r-1):+5.1f} %)")
print("    => dispersion de -16 % a +44 % : ce n'est PAS un facteur d'echelle unique.")

# --- (a bis) REPRISE : la fenetre (130,800)-(330,900) tombait sur le PAPIER de la
# fiche basse (100 % #eae0c8). Fenetres reprises dans le liege NU de la capture :
# au-dessus de la premiere fiche (524..575) et sous la seconde (904..956).
print("\n--- (a bis) liege NU de la capture, fenetres reprises ---")
teintes(CAP, 100, 530, 1000, 570, "CAP liege au-dessus de la fiche haute")
teintes(CAP, 100, 910, 1000, 950, "CAP liege sous la fiche basse")
teintes(REF, 100, 620, 1000, 660, "CTRL+ REF liege au-dessus de la fiche gauche")
