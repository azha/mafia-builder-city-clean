# m05 : profil fin de la barre + ce qu'elle RECOUVRE (par comparaison avec 2400, meme repere de cadre).
# Repere : rail HAUT du cadre 2400=482, 1920=250 -> offset 232 ; verifie par 3 ancres internes.
import sys; sys.path.insert(0,'.')
from lib import *

im19 = ouvrir('capture-1080x1920.png'); p19 = im19.load()
im24 = ouvrir('capture-1080x2400.png'); p24 = im24.load()
OFF = 232  # y24 = y19 + 232

print("\n--- CONTROLE de l'offset (ancres or internes) ---")
for nom,a19,a24 in [("filet or du titre",457,690),("haut carte portrait",672,904),("bas carte portrait",1326,1558)]:
    print("   %-22s 1920:y=%d  2400:y=%d  ecart=%d (attendu %d)" % (nom,a19,a24,a24-a19,OFF))

print("\n--- A. profil fin de la barre (x=1002), tous les 20 px ---")
out=[]
for y in range(246, 1640, 20):
    out.append("%d:%.0f" % (y, lum(p19[1002,y])))
print("   " + " ".join(out))
vals=[lum(p19[1002,y]) for y in range(255,1625)]
print("   corps y255..1624 : min=%.1f max=%.1f  amplitude=%.1f pts" % (min(vals),max(vals),max(vals)-min(vals)))
# y a-t-il une portion NETTEMENT plus claire (curseur) ?
seuil = 0.5*(min(vals)+max(vals))
print("   rangees au-dessus de la mi-amplitude : %d / %d" % (sum(1 for v in vals if v>seuil), len(vals)))

print("\n--- B. ce que la barre RECOUVRE : contenu a x=997..1007 sur la planche 2400 ---")
from collections import Counter
c = Counter()
for y19 in range(255, 1625):
    y24 = y19 + OFF
    f = mediane([lum(p24[x,y24]) for x in range(46,1034)])
    enc = sum(1 for x in range(997,1008) if abs(lum(p24[x,y24])-f) > 8)
    if enc: c[enc]+=1
tot = sum(c.values())
print("   rangees (sur 1370) ou la bande x997..1007 porte de l'ENCRE a 2400 : %d (%.1f%%)" % (tot, 100.0*tot/1370))
print("   distribution du nombre de colonnes encrees :", sorted(c.items()))

print("\n--- C. quel contenu ? bornes verticales des rangees recouvertes ---")
runs=[]
prev=None
for y19 in range(255,1625):
    y24=y19+OFF
    f = mediane([lum(p24[x,y24]) for x in range(46,1034)])
    enc = sum(1 for x in range(997,1008) if abs(lum(p24[x,y24])-f) > 8)
    if enc>=3:
        if prev is not None and y19-prev<=3: runs[-1][1]=y19
        else: runs.append([y19,y19])
        prev=y19
print("   plages (repere 1920) ou >=3 colonnes sur 11 sont encrees a 2400 :")
for a,b in runs:
    if b-a>=2:
        print("      y1920=%4d..%-4d (%3d px)  y2400=%4d..%-4d  couleur a 2400 = %s" % (a,b,b-a+1,a+OFF,b+OFF, mediane_fenetre(p24,1002,(a+b)//2+OFF,1)))

print("\n--- D. bord DROIT du contenu par zone, a 2400 et 1920 ---")
def bord_droit(px, y, x0=46, x1=1057, marge=8):
    f = mediane([lum(px[x,y]) for x in range(x0,x1)])
    xs=[x for x in range(x0,x1) if abs(lum(px[x,y])-f)>marge]
    return max(xs) if xs else None
for nom, y19 in [("panneau de titre",300),("boite compteur 3",550),("aparte 'ce qu'il a absorbe'",710),("tuile 'col ouvert'",800),("tuile 'gants sales'",1130),("panneau bas",1450)]:
    b19 = bord_droit(p19,y19); b24 = bord_droit(p24,y19+OFF)
    print("   %-30s 1920: %s   2400: %s" % (nom, b19, b24))
