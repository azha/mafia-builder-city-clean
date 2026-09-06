# m16 — graisse par TAUX DE REMPLISSAGE de la bbox du MEME glyphe a la MEME hauteur (mesure valide
# la ou le fut ne l'est pas : le 'P' a mi-hauteur croise sa panse, m15 ligne 2 est donc REJETEE)
# Controle positif : le 'a' du titre de panneau fait 26 px de haut des DEUX cotes -> comparaison licite
# Controle negatif : une bbox prise dans le fond doit rendre un taux ~0
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def taux(px,x0,x1,y0,y1,fond,tol,tag):
    n=0;tot=0
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            tot+=1
            if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol: n+=1
    print("   %-34s bbox %dx%d  encre=%5.1f %%"%(tag,x1-x0+1,y1-y0+1,100.0*n/tot))
    return 100.0*n/tot
print("\n### 'a' du TITRE DE PANNEAU — meme lettre, meme hauteur (26 px) des deux cotes")
a=taux(pr,112,140,1717,1742,(16,23,34),50,"REF 'a' de 'Jamais'  (CSS 700)")
b=taux(pc,113,137,1877,1902,(22,22,28),50,"CAP 'a' de 'Pas'")
print("      => %+.1f %% de remplissage relatif"%(100.0*(b-a)/a))
print("\n### 'L' du TITRE — meme lettre (hauteurs 45 / 51, taux normalise par la bbox)")
a=taux(pr,326,365,515,559,(12,18,28),50,"REF 'L'  (CSS 700)")
b=taux(pc,344,384,305,355,(22,22,28),50,"CAP 'L'")
print("      => %+.1f %% de remplissage relatif"%(100.0*(b-a)/a))
print("\n### 'E' de ETAPES — meme lettre (18 / 22)")
a=taux(pr,157,167,757,774,(10,16,24),40,"REF 'E'  (CSS 700)")
b=taux(pc,127,138,540,561,(22,22,28),40,"CAP 'E'")
print("      => %+.1f %% de remplissage relatif"%(100.0*(b-a)/a))
print("\n### 'C' du KICKER — meme lettre (16 / 21)")
a=taux(pr,89,102,1663,1678,(16,23,34),40,"REF 'C'  (CSS 700)")
b=taux(pc,83,99,1821,1841,(22,22,28),40,"CAP 'C'")
print("      => %+.1f %% de remplissage relatif"%(100.0*(b-a)/a))
print("\n### CONTROLE NEGATIF : bbox dans le fond")
taux(pr,600,640,1640,1655,(16,23,34),50,"REF fond du panneau")
taux(pc,700,740,2050,2070,(22,22,28),50,"CAP fond du panneau")
