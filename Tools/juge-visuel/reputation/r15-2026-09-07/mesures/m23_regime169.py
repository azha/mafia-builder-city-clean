"""m23 — le regime 16:9 : ce que le joueur voit sans defiler, ce qu'il perd, indice de suite.
Controle positif : le paragraphe du panneau bas doit rendre 3 lignes a 1920 comme a 2400.
Controle negatif : la recherche d'ascenseur doit rendre 0 sur la marge GAUCHE (aucun ascenseur
                   n'y est jamais dessine) -> preuve que la sonde ne rend pas n'importe quoi.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
sys.path.insert(0,'.')
from m21_textes import bandes_texte

for nom,zone in (('capture-1080x2400.png',(80,1000,1592,1845)),('capture-1080x1920.png',(80,1000,1360,1622))):
    im=ouvrir(nom); res,f=bandes_texte(im,*zone)
    print(f"  [{nom}] panneau bas : {len(res)} bandes de texte")
    for r in res: print(f"    y{r['y0']}..{r['y1']} h={r['h']:3d} w={r['w']:4d} encre={r['encre']:5d} contraste={r['contraste']}")

print()
im=ouvrir('capture-1080x1920.png'); p=im.load()
print("  --- recherche d'un ASCENSEUR / indice de suite ---")
for lab,(x0,x1) in (("marge interne DROITE du cadre",(1035,1058)),("marge interne GAUCHE (ctrl negatif)",(21,44))):
    mx=0; det=[]
    for x in range(x0,x1+1):
        col=[lum(p[x,y]) for y in range(260,1620)]
        amp=max(col)-percentile(col,10)
        if amp>mx: mx=amp
        if amp>10: det.append((x,round(amp,1)))
    print(f"    {lab} : amplitude max = {mx:.1f} pts ; colonnes >10 pts : {det[:8]}")
print("  --- le contenu est-il COUPE au filet bas du cadre ? ---")
for y in range(1608,1626):
    n=sum(1 for x in range(25,1055) if lum(p[x,y])>45)
    print(f"    y={y} : {n} px d'encre")
print()
print("  --- ce qui est PERDU a 1920 : elements presents a 2400 et absents a 1920 ---")
j24=ouvrir('capture-1080x2400.png'); q=j24.load()
def est_or(c):
    r,g,b=c; return r>110 and (r-b)>45 and g>70 and g<r
n24=sum(1 for y in range(1882,1971) for x in range(40,1045) if est_or(q[x,y]))
n19=sum(1 for y in range(1630,1720) for x in range(40,1045) if est_or(p[x,y]))
print(f"    boite du CTA (or) : 2400 -> {n24} px ; meme bande sous le cadre a 1920 -> {n19} px")
