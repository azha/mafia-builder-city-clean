#!/usr/bin/env python3
# m14 — composition des deux etiquettes : largeur, decalage lateral, alignement du texte.
# Controle positif : sur la REFERENCE les deux fiches doivent avoir des bords GAUCHES
#   differents (l'une a left:14px, l'autre a right:14px) -> l'instrument doit voir
#   un decalage non nul. Controle negatif : sur la capture, s'il sort zero, c'est
#   une information, pas une panne -> on le verifie sur les DEUX bords.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def bords_papier(im,y,seuil=175):
    px=im.load(); W,_=im.size
    on=[x for x in range(2,W-2) if L(px[x,y])>=seuil]
    return (on[0],on[-1]) if on else None

print("\n--- BORDS des etiquettes (papier clair) ---")
print("  REFERENCE :")
for lib,y in [("fiche gauche (milieu)",760),("fiche droite (milieu)",1280)]:
    b=bords_papier(REF,y); print(f"    {lib:26s} y={y} : x {b}  largeur={b[1]-b[0]+1} px = {(b[1]-b[0]+1)/3.6:5.1f} CSS")
print("  CAPTURE :")
for lib,y in [("fiche haute (milieu)",640),("fiche basse (milieu)",840)]:
    b=bords_papier(CAP,y); print(f"    {lib:26s} y={y} : x {b}  largeur={b[1]-b[0]+1} px = {(b[1]-b[0]+1)/3.6:5.1f} CSS")

print("\n--- DECALAGE LATERAL entre les deux etiquettes (composition en diagonale ?) ---")
a=bords_papier(REF,760); b=bords_papier(REF,1280)
print(f"    REFERENCE : bord gauche {a[0]} vs {b[0]} -> decalage {b[0]-a[0]:+d} px = {(b[0]-a[0])/3.6:+.1f} CSS")
print(f"                bord droit  {a[1]} vs {b[1]} -> decalage {b[1]-a[1]:+d} px = {(b[1]-a[1])/3.6:+.1f} CSS")
a=bords_papier(CAP,640); b=bords_papier(CAP,840)
print(f"    CAPTURE   : bord gauche {a[0]} vs {b[0]} -> decalage {b[0]-a[0]:+d} px = {(b[0]-a[0])/3.6:+.1f} CSS")
print(f"                bord droit  {a[1]} vs {b[1]} -> decalage {b[1]-a[1]:+d} px = {(b[1]-a[1])/3.6:+.1f} CSS")

print("\n--- ALIGNEMENT du texte DANS chaque etiquette (encre sombre sur papier) ---")
def encre_x(im,y0,y1,x0,x1,seuil=120):
    px=im.load()
    on=[x for x in range(x0,x1) if any(L(px[x,y])<=seuil for y in range(y0,y1))]
    return (on[0],on[-1]) if on else None
def rap(nom, papier, encre):
    g=encre[0]-papier[0]; d=papier[1]-encre[1]
    al = "GAUCHE" if g<d*0.5 else ("DROITE" if d<g*0.5 else "centre/justifie")
    print(f"    {nom:34s} papier x {papier}  encre x {encre}  marge G={g:4d} px  marge D={d:4d} px  -> {al}")
p=bords_papier(REF,760);   rap("REF fiche gauche : titre", p, encre_x(REF,725,760,p[0],p[1]))
p=bords_papier(REF,790);   rap("REF fiche gauche : 'D'OU CA PART'", p, encre_x(REF,770,798,p[0],p[1]))
p=bords_papier(REF,1240);  rap("REF fiche droite : titre", p, encre_x(REF,1225,1265,p[0],p[1]))
p=bords_papier(REF,1320);  rap("REF fiche droite : 'OU CA VA'", p, encre_x(REF,1300,1335,p[0],p[1]))
p=bords_papier(CAP,610);   rap("CAP fiche haute : titre", p, encre_x(CAP,598,632,p[0],p[1]))
p=bords_papier(CAP,650);   rap("CAP fiche haute : 'D'OU CA PART'", p, encre_x(CAP,640,664,p[0],p[1]))
p=bords_papier(CAP,820);   rap("CAP fiche basse : titre", p, encre_x(CAP,805,840,p[0],p[1]))
p=bords_papier(CAP,860);   rap("CAP fiche basse : 'OU CA VA'", p, encre_x(CAP,845,872,p[0],p[1]))

print("\n--- POSITION des etiquettes DANS le panneau ---")
print("    REFERENCE panneau x 4..1076 (1072 px) ; y 604..1425 (821 px)")
print("    CAPTURE   panneau x 58..1022 (964 px) ; y 524..956 (432 px)")
for nom,(px_,py_,w,h),(bx0,by0,bx1,by1) in [
    ("REF fiche gauche",(4,604,1072,821),(51,670,850,829)),
    ("REF fiche droite",(4,604,1072,821),(238,1190,1026,1357)),
    ("CAP fiche haute", (58,524,964,432),(108,575,971,719)),
    ("CAP fiche basse", (58,524,964,432),(108,770,971,904)),
]:
    print(f"    {nom:18s} : gauche={100*(bx0-px_)/w:5.1f} %  droite={100*(px_+w-bx1)/w:5.1f} %  "
          f"haut={100*(by0-py_)/h:5.1f} %  bas={100*(py_+h-by1)/h:5.1f} %  largeur={100*(bx1-bx0)/w:5.1f} % du panneau")
