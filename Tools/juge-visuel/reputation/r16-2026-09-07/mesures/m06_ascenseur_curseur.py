# m06 : la barre a-t-elle un CURSEUR distinct de sa GLISSIERE ? geometrie exacte, et recouvrement chiffre.
import sys; sys.path.insert(0,'.')
from lib import *
im19 = ouvrir('capture-1080x1920.png'); p19 = im19.load()
im24 = ouvrir('capture-1080x2400.png'); p24 = im24.load()
OFF=232

print("\n--- A. transition claire/sombre le long de la barre (x=1002) ---")
prev=None
for y in range(1470,1640):
    v = lum(p19[1002,y])
    if prev is not None and abs(v-prev)>8:
        print("   rupture a y=%d : %.1f -> %.1f  (couleur %s -> %s)" % (y, prev, v, p19[1002,y-1], p19[1002,y]))
    prev=v
print("   luminance moyenne y300..1450 = %.1f" % (sum(lum(p19[1002,y]) for y in range(300,1451))/1151))
print("   luminance moyenne y1510..1620 = %.1f" % (sum(lum(p19[1002,y]) for y in range(1510,1621))/111))

print("\n--- B. largeur de chaque segment ---")
for nom, y in [("segment CLAIR", 900), ("segment SOMBRE", 1570)]:
    row = [lum(p19[x,y]) for x in range(980,1030)]
    lo = mediane(row[:8]); hi = max(row)
    seuil = 0.5*(lo+hi)
    xs=[980+i for i,v in enumerate(row) if v>seuil]
    print("   %-15s y=%d : x=%d..%d (l=%d px)  couleur=%s  fond=%s" % (nom,y,min(xs),max(xs),max(xs)-min(xs)+1, mediane_fenetre(p19,(min(xs)+max(xs))//2,y,1), mediane_fenetre(p19,975,y,2)))

print("\n--- C. proportions ---")
# bornes exactes de la barre
col=[lum(p19[1002,y]) for y in range(200,1700)]
haut=next(y for y in range(200,1700) if lum(p19[1002,y])>60)
bas =next(y for y in range(1699,200,-1) if lum(p19[1002,y])>60)
# frontiere clair/sombre
front=None
for y in range(haut,bas):
    if lum(p19[1002,y])>130 and lum(p19[1002,y+1])<=130: front=y
print("   barre entiere y=%d..%d = %d px" % (haut,bas,bas-haut+1))
print("   segment clair y=%d..%d = %d px  (%.1f %% de la barre)" % (haut,front,front-haut+1,100.0*(front-haut+1)/(bas-haut+1)))
print("   segment sombre y=%d..%d = %d px" % (front+1,bas,bas-front))
# hauteur totale du contenu (depuis 2400) : du haut du cadre au dernier contenu
print("   [pour comparaison] a 2400 le cadre va de 482 a 2109 (1628 px) et le dernier contenu (bas boite CTA) a 1970")
print("   -> contenu total depuis le rail haut = %d px ; visible a 1920 = %d px ; ratio = %.1f %%" % (1970-482+8, bas-haut+1, 100.0*(bas-haut+1)/(1970-482+8)))

print("\n--- D. RECOUVREMENT : que porte la bande x=997..1007 a 2400 (donc sous la barre) ? ---")
for nom, y19 in [("aparte 'ce qu il a absorbe'",709),("tuile 1 bord",800),("tuile 1 bord",810),("tuile 4 bord",1130)]:
    y24=y19+OFF
    f = mediane([lum(p24[x,y24]) for x in range(46,1034)])
    det=[(x, p24[x,y24], round(lum(p24[x,y24])-f,1)) for x in range(994,1012)]
    print("   %s  (y1920=%d / y2400=%d) fond=%.1f" % (nom,y19,y24,f))
    print("      " + " ".join("x%d:%s" % (x,c) for x,c,e in det if abs(e)>8))

print("\n--- E. bord droit des tuiles et de l aparte a 2400 (donc position du recouvrement) ---")
def bords(px,y,x0=520,x1=1050,marge=8):
    f=mediane([lum(px[x,y]) for x in range(46,1034)])
    xs=[x for x in range(x0,x1) if abs(lum(px[x,y])-f)>marge]
    return (min(xs),max(xs)) if xs else None
for nom,y24 in [("bord droit tuile 1 (y2400=1040)",1040),("bord droit tuile 4 (y2400=1360)",1360),("aparte ligne 1 (y2400=941)",941)]:
    print("   %-34s %s" % (nom, bords(p24,y24)))
