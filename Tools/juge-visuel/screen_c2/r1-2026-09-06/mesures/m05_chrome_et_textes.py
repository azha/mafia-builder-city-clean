# m05 — bandeau/dock de la capture, et hauteurs de capitale (bbox d'encre du 1er glyphe capital)
# Controle positif : bandeau capture attendu 52 CSS-HUD x2,755 = 143 px (derive du code, ecrit au dossier)
# Controle negatif : la routine de cap-height sur une bande vide doit rendre None
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

print("\n### CAPTURE : bandeau (colonne x=100, hors manometre)")
prev=L(pc[100,0])
for y in range(1,320):
    c=L(pc[100,y])
    if abs(c-prev)>8: print("   y=%4d %5.1f -> %5.1f  rgb %s -> %s"%(y,prev,c,pc[100,y-1],pc[100,y]))
    prev=c
print("\n### CAPTURE : dock (colonne x=100 et x=258, y=2100..2400)")
for X in (100,258):
    print("  x=%d"%X); prev=L(pc[X,2100])
    for y in range(2101,2400):
        c=L(pc[X,y])
        if abs(c-prev)>6: print("     y=%4d %5.1f -> %5.1f rgb %s -> %s"%(y,prev,c,pc[X,y-1],pc[X,y]))
        prev=c

def cap_h(px,x0,x1,y0,y1,fond,tol,label):
    """bbox d'encre + extent du premier groupe de colonnes encrees (1er glyphe)"""
    def ink(p): return max(abs(p[i]-fond[i]) for i in range(3))>tol
    cols=[x for x in range(x0,x1) if any(ink(px[x,y]) for y in range(y0,y1))]
    if not cols: print("   %-28s AUCUNE ENCRE"%label); return None
    # premier groupe de colonnes contigues = 1er glyphe
    g0=cols[0]; g1=g0
    for x in cols[1:]:
        if x==g1+1: g1=x
        else: break
    rows=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in range(g0,g1+1))]
    rowsall=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in cols)]
    print("   %-28s 1er glyphe x=%d..%d  h_cap=%d px  | encre totale x=%d..%d (w=%d) y=%d..%d (h=%d)"
          %(label,g0,g1,rows[-1]-rows[0]+1,cols[0],cols[-1],cols[-1]-cols[0]+1,rowsall[0],rowsall[-1],rowsall[-1]-rowsall[0]+1))
    return rows[-1]-rows[0]+1

print("\n### HAUTEURS DE CAPITALE")
FR=(13,18,28); FC=(22,22,28)
print(" REFERENCE (fond enseigne ~#0d1119) :")
cap_h(pr,60,1020,495,575,FR,26,"titre 'La filiere' (L)")
cap_h(pr,60,1020,585,615,FR,26,"sous-titre 'OU EN EST...'")
cap_h(pr,60,350,690,740,(10,14,22),26,"compteur 1 chiffres '04'")
cap_h(pr,60,350,745,775,(10,14,22),22,"compteur 1 libelle 'ETAPES'")
print(" CAPTURE (fond boite #16161c) :")
cap_h(pc,60,1020,270,340,FC,26,"titre 'La filiere' (L)")
cap_h(pc,60,1020,370,400,FC,26,"sous-titre 'LA FILIERE NE...'")
cap_h(pc,60,320,480,560,FC,26,"compteur 1 chiffres '00'")
cap_h(pc,60,320,545,580,FC,22,"compteur 1 libelle 'ETAPES'")
print(" CTRL- capture, bande vide y=1000..1100 :")
cap_h(pc,60,1020,1000,1100,(13,13,13),6,"vide (doit dire AUCUNE ENCRE)")
