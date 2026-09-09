# m02 — trouver l'ENCRE OR (jeton f2c96b / d9ab4e) des deux cotes : bbox, colonnes, lignes.
# Controle positif : le jeton f2c96b doit etre trouve dans la REFERENCE (le titre "La vente" est or).
# Controle negatif : un jeton BLEU NUIT (#0e1420) ne doit PAS etre classe or.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def est_or(p):
    r,g,b = p
    return r>120 and g>90 and b<150 and (r-b)>45 and (r-g)>=8 and (g-b)>20

def carto(nom, y0=0, y1=None, etiquette=''):
    im = Image.open(os.path.join(D,nom)).convert('RGB'); w,h = im.size
    if y1 is None: y1 = h
    px = im.load()
    print(f'--- {nom} taille={im.size} bande y={y0}..{y1}')
    lignes=[]
    for y in range(y0,y1):
        c=0; xs=[]
        for x in range(w):
            if est_or(px[x,y]): c+=1; xs.append(x)
        lignes.append((y,c,min(xs) if xs else None,max(xs) if xs else None))
    # regrouper en bandes d'or
    bandes=[]; deb=None
    for y,c,a,b in lignes:
        if c>=3 and deb is None: deb=y
        elif c<3 and deb is not None:
            bandes.append((deb,y-1)); deb=None
    if deb is not None: bandes.append((deb,y1-1))
    print(f'  bandes d\'or ({len(bandes)}) :')
    for (a,b) in bandes:
        sub=[l for l in lignes if a<=l[0]<=b]
        xa=min(l[2] for l in sub if l[2] is not None); xb=max(l[3] for l in sub if l[3] is not None)
        tot=sum(l[1] for l in sub)
        print(f'    y {a}..{b} (h={b-a+1})  x {xa}..{xb} (w={xb-xa+1})  px_or={tot}')
    return bandes

print('CONTROLE POSITIF est_or(#f2c96b) =', est_or((0xf2,0xc9,0x6b)), ' est_or(#d9ab4e) =', est_or((0xd9,0xab,0x4e)))
print('CONTROLE NEGATIF est_or(#0e1420) =', est_or((0x0e,0x14,0x20)), ' est_or(#7fd4d9) =', est_or((0x7f,0xd4,0xd9)), ' est_or(#eae0c8 creme) =', est_or((0xea,0xe0,0xc8)))
print()
carto('reference-1080x2102.png')
print()
carto('capture-1080x2400.png')
