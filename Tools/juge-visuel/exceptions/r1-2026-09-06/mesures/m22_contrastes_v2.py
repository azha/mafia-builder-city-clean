# m22 — contrastes, v2. L'ENCRE n'est plus un pixel deviné : dans la boîte d'une ligne de texte,
# le FOND est la couleur la plus fréquente, l'ENCRE est la couleur la plus fréquente parmi celles
# dont la luminance s'écarte le plus du fond (≥ 0,5 % des px de la boîte).
# Contrôle positif : le tampon de la RÉFÉRENCE doit rendre encre #93402c sur fond #d9cca9 (valeurs
#   du CSS) ⇒ 4,2:1 environ. Contrôle négatif : une boîte de fond PUR doit rendre 1,00:1.
from util import *
from collections import Counter
print("== m22 contrastes (v2) ==")
def encre_fond(im, boite):
    sub=im.crop(boite); cols=sub.getcolors(1<<24); cols.sort(reverse=True)
    tot=sum(c for c,_ in cols); fond=cols[0][1]
    cand=[(c,rgb) for c,rgb in cols if c/tot>=0.005]
    if len(cand)<2: return fond,fond,tot
    best=max(cand[1:], key=lambda t: abs(lum(t[1])-lum(fond)))
    return best[1], fond, tot
cas=[
 ("RÉF tampon (contrôle +)",      REF,(200,1735,900,1790),"grand"),
 ("CAP bande vide (contrôle −)",  CAP,(200,600,900,700),  "grand"),
 ("RÉF .ligne-soir",              REF,(160,660,920,700),  "grand"),
 ("RÉF .attendant b 'Lt. Kane'",  REF,(130,1040,270,1080),"grand"),
 ("RÉF .attendant small",         REF,( 70,1090,330,1160),"petit"),
 ("RÉF .bulle .qui b",            REF,(335,1235,510,1280),"grand"),
 ("RÉF .bulle p",                 REF,(335,1440,910,1490),"grand"),
 ("RÉF .filet.lien",              REF,( 65,1970,430,2005),"grand"),
 ("RÉF .filet small",             REF,(530,1975,840,2005),"petit"),
 ("CAP titre",                    CAP,( 70,1290,1010,1332),"grand"),
 ("CAP nom rangée 1",             CAP,( 45,1528,375,1568),"grand"),
 ("CAP tag rangée 1",             CAP,( 90,1573,320,1602),"petit"),
 ("CAP méta bulle",               CAP,(300,1660,950,1700),"petit"),
 ("CAP slug",                     CAP,(300,1710,710,1755),"grand"),
 ("CAP CTA grand",                CAP,(105,1865,975,1912),"grand"),
 ("CAP CTA sous-titre",           CAP,(370,1918,715,1950),"petit"),
 ("CAP 'Escalades archivées'",    CAP,(360,2025,730,2065),"grand"),
 ("CAP 'à relire…'",              CAP,(380,2070,700,2100),"petit"),
]
for lbl,P,b,taille in cas:
    im=Image.open(P).convert("RGB")
    e,f,n=encre_fond(im,b)
    r=contraste(e,f); s=3.0 if taille=="grand" else 4.5
    print(f"  {lbl:30s} boîte={b} encre={e} fond={f} -> {r:5.2f}:1 (seuil {s}) {'OK' if r>=s else '*** SOUS LE SEUIL'}")
