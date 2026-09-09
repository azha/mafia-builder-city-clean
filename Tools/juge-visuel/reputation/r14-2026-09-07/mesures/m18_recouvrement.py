"""m18 — recouvrement du CHROME et du CONTENU a 1920 : comptes d'OR etrangers.
Or = meme filtre qu'en m01. On compte les px d'or DANS le panneau d'enseigne
(y195..365, x24..1056 a 1920) et on les attribue : titre (le titre EST or) vs chrome.
Discriminant : a 2400 le meme panneau, aux memes offsets, ne contient QUE le titre.
On compare les deux inventaires colonne par colonne.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir

def est_or(p):
    r, g, b = p
    return r > 130 and (r-b) > 50 and b < 120 and g < r and g > b

im19 = ouvrir('../capture-1080x1920.png'); p19 = im19.load()
im24 = ouvrir('../capture-1080x2400.png'); p24 = im24.load()
# panneau d'enseigne : offsets identiques aux deux resolutions (m04)
# 1920 : cadre 162 -> panneau y191..365 ; 2400 : cadre 482 -> panneau y511..685
def inventaire(px, y0, y1, nom):
    tot = 0; par_y = {}
    for y in range(y0, y1+1):
        n = sum(1 for x in range(24, 1057) if est_or(px[x, y]))
        if n: par_y[y] = n; tot += n
    print(f"   {nom} : {tot} px d'or dans le panneau d'enseigne (y{y0}..{y1})")
    return par_y, tot

a19, t19 = inventaire(p19, 191, 365, '1920')
a24, t24 = inventaire(p24, 511, 685, '2400')
print(f"   ecart 1920 - 2400 = {t19 - t24} px d'or")
print("\n   rangees (offset depuis le haut du panneau) ou 1920 a de l'or et 2400 n'en a pas :")
for k in range(0, 175):
    n19 = a19.get(191+k, 0); n24 = a24.get(511+k, 0)
    if n19 - n24 > 3:
        print(f"      off={k:3d}  1920:{n19:4d}  2400:{n24:4d}  (+{n19-n24})")
# le losange recouvre-t-il l'encre du titre ?
print("\n   encre du TITRE a 2400 dans la fenetre du losange (off 24..40, x531..548) :")
n = sum(1 for k in range(24, 41) for x in range(531, 549) if est_or(p24[x, 511+k]))
print(f"      2400 : {n} px d'or  -> {'le losange se pose SUR du titre' if n else 'le losange se pose sur du VIDE'}")
print("   encre du titre a 2400 sur toute la bande du losange (off 24..40, x480..600) :")
n2 = sum(1 for k in range(24, 41) for x in range(480, 601) if est_or(p24[x, 511+k]))
print(f"      {n2} px d'or")
