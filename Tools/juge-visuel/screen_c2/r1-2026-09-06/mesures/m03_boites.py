# m03 — reperage des boites : scanlines verticales et horizontales, transitions de luminance
# Controle positif REF : cerne dore mesure y=452..2078 -> bln6 = 462 CSS x3,6 = 1663 px (valeur CSS connue)
# Controle negatif : une scanline dans le vide de la capture (x=540, y 700..1700) ne doit produire AUCUNE transition
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def vscan(px,x,y0,y1,seuil,tag):
    print("  [V] %s x=%d  y=%d..%d"%(tag,x,y0,y1))
    prev=L(px[x,y0])
    for y in range(y0+1,y1):
        c=L(px[x,y])
        if abs(c-prev)>seuil:
            print("      y=%4d  %5.1f -> %5.1f   rgb %s -> %s"%(y,prev,c,px[x,y-1],px[x,y]))
        prev=c
def hscan(px,y,x0,x1,seuil,tag):
    print("  [H] %s y=%d  x=%d..%d"%(tag,y,x0,x1))
    prev=L(px[x0,y])
    for x in range(x0+1,x1):
        c=L(px[x,y])
        if abs(c-prev)>seuil:
            print("      x=%4d  %5.1f -> %5.1f   rgb %s -> %s"%(x,prev,c,px[x-1,y],px[x,y]))
        prev=c
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); print("REF",ref.size); pr=ref.load()
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); print("CAP",cap.size); pc=cap.load()
print("--- REFERENCE ---")
vscan(pr,540,420,700,6,"colonne centre: cerne + enseigne + compteurs")
hscan(pr,470,0,1080,6,"ligne dans le cerne haut")
hscan(pr,700,0,1080,6,"ligne dans les compteurs")
vscan(pr,540,2000,2102,6,"bas: cerne bas")
print("--- CAPTURE ---")
vscan(pc,540,120,700,6,"colonne centre: bandeau + enseigne + compteurs")
hscan(pc,290,0,1080,6,"ligne dans l'enseigne")
hscan(pc,450,0,1080,6,"ligne dans les compteurs")
vscan(pc,540,1700,2400,6,"bas: pann + dock")
print("CTRL- vide capture x=540 y=700..1700 :")
vscan(pc,540,700,1700,6,"vide")
print("   (aucune ligne ci-dessus = controle negatif OK)")
