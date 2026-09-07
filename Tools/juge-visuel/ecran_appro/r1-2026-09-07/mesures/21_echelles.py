# -*- coding: utf-8 -*-
"""ECHELLE DES BOITES vs ECHELLE DU TYPE : rapport capture/reference pour des grandeurs de BOITE
(largeurs, marges) et pour des HAUTEURS DE CAPITALE.
CONTROLE POSITIF : la largeur de l'ecran est 1080 des deux cotes -> rapport 1,000 exactement.
CONTROLE NEGATIF : les hauteurs d'image (2102 vs 2400) ne DOIVENT PAS servir de reference d'echelle."""
from PIL import Image
def cap(path,xa,xb,ya,yb,fond,seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load(); ys=[]
    for y in range(ya,yb+1):
        for x in range(xa,xb+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: ys.append(y); break
    return (min(ys),max(ys),max(ys)-min(ys)+1) if ys else None
REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
print("OUVERT",REF,Image.open(REF).size,"|",CAP,Image.open(CAP).size)
PAPR=(239,231,214);PAPC=(234,224,200)
lr=cap(REF, 91,119, 900,940, PAPR); lc=cap(CAP,104,130, 885,930, PAPC)
print("\n  libelle 'LE' (majuscules sans accent) : REF %s  CAP %s"%(lr,lc))
BOITES=[("largeur de l'ecran",1080,1080),("largeur du bon",980,966),("largeur du CTA",980,966),
        ("marge laterale du bon",50,57),("padding gauche du bon",41,48),("padding haut du bon",41,47),
        ("pas des lignes du bon",68,75),("hauteur du CTA",105,137)]
TYPES=[("titre (cap)",33,50),("sous-titre (cap)",19,30),("'Pyralin' (cap)",27,39),
       ("'BON DE COMMANDE' (cap)",16,21),("libelle 'LE' (cap)",lr[2],lc[2]),("CTA 'EN' (cap)",25,29)]
print("\n  --- BOITES : rapport capture / reference ---")
for n,a,b in BOITES: print("    %-26s %5d -> %5d   x%.3f"%(n,a,b,b/a))
print("  --- TYPE : rapport capture / reference ---")
for n,a,b in TYPES: print("    %-26s %5d -> %5d   x%.3f"%(n,a,b,b/a))
bo=[b/a for n,a,b in BOITES]; ty=[b/a for n,a,b in TYPES]
print("\n  mediane BOITES = %.3f (min %.3f max %.3f)"%(sorted(bo)[len(bo)//2],min(bo),max(bo)))
print("  mediane TYPE   = %.3f (min %.3f max %.3f)"%(sorted(ty)[len(ty)//2],min(ty),max(ty)))
print("  CONTROLE POSITIF : largeur d'ecran 1080/1080 = %.3f"%(1080/1080))
print("  CONTROLE NEGATIF : hauteurs d'image 2400/2102 = %.3f -> ce rapport n'est PAS l'echelle du contenu"%(2400/2102))
