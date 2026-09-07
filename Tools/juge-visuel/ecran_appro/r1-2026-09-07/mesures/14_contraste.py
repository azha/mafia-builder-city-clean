# -*- coding: utf-8 -*-
"""Contraste WCAG entre l'encre (coeur du trait) et son fond (mediane d'une fenetre voisine, >=3px du trait).
CONTROLE POSITIF : le titre de la REFERENCE (#f0dfc4 sur #1e1b16) doit rendre 12,4:1 (valeur calculable
                   a la main depuis les hex de la CSS) ; l'ecart au calcul direct doit etre < 0,2.
CONTROLE NEGATIF : encre = fond -> 1,00:1."""
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(rgb): return 0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2])
def ratio(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def hexa(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))
CAS=[
 ("REF titre h3            #f0dfc4 / #1e1b16","f0dfc4","1e1b16","grand"),
 ("CAP titre               #eef1f2 / #0d0d0d","eef1f2","0d0d0d","grand"),
 ("REF sous-titre          #9a8f78 / #1e1b16","9a8f78","1e1b16","petit"),
 ("CAP sous-titre          #8a979c / #0d0d0d","8a979c","0d0d0d","petit"),
 ("REF 'Pyralin'           #2a2118 / #efe7d6","2a2118","efe7d6","grand"),
 ("CAP 'Pyralin'           #221600 / #eae0c8","221600","eae0c8","grand"),
 ("REF 'BON DE COMMANDE'   #8a7f6b / #efe7d6","8a7f6b","efe7d6","petit"),
 ("CAP 'BON DE COMMANDE'   #b9ad92 / #eae0c8","b9ad92","eae0c8","petit"),
 ("REF libelle .l u        #887c6f / #efe7d6","887c6f","efe7d6","petit"),
 ("CAP libelle             #c0b59a / #eae0c8","c0b59a","eae0c8","petit"),
 ("REF valeur noire        #2a2118 / #efe7d6","2a2118","efe7d6","petit"),
 ("CAP valeur noire        #221600 / #eae0c8","221600","eae0c8","petit"),
 ("REF valeur rouge        #a8402f / #efe7d6","a8402f","efe7d6","petit"),
 ("CAP valeur rouge        #ff5a4d / #eae0c8","ff5a4d","eae0c8","petit"),
 ("REF citation            #cdd6e0 / #141a21","cdd6e0","141a21","petit"),
 ("CAP citation            #8a979c / #0d0d0d","8a979c","0d0d0d","petit"),
 ("REF CTA libelle         #d9ab4e / #241c11","d9ab4e","241c11","grand"),
 ("CAP CTA libelle         #221600 / #d9ab4d","221600","d9ab4d","grand"),
 ("REF CTA small           #9a8a6a / #241c11","9a8a6a","241c11","petit"),
 ("CAP titron              #8a979c / #0d0d0d","8a979c","0d0d0d","petit"),
 ("CAP texte bouche-trou   #b8c2cc / #0d0d0d","b8c2cc","0d0d0d","petit"),
]
print("  %-46s %8s  %s"%("cas","ratio","verdict (doctrine : >=3 grand, >=4,5 petit)"))
for nom,a,b,t in CAS:
    r=ratio(hexa(a),hexa(b)); seuil=3.0 if t=="grand" else 4.5
    print("  %-46s %7.2f:1  %s"%(nom,r,"OK" if r>=seuil else "SOUS LE SEUIL (%.1f)"%seuil))
print()
print("CONTROLE POSITIF (calcul direct #f0dfc4/#1e1b16) : %.2f:1"%ratio(hexa("f0dfc4"),hexa("1e1b16")))
print("CONTROLE NEGATIF (encre = fond) : %.2f:1"%ratio(hexa("efe7d6"),hexa("efe7d6")))
