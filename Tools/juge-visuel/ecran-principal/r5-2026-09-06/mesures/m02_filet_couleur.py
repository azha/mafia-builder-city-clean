# Grandeur : COULEUR et EPAISSEUR du filet de bas de bandeau, sur une plage de colonnes propres.
# Convention de bord declaree : (a) NOMINALE = toutes les lignes au-dessus de mi-amplitude ;
#                               (b) COEUR    = lignes a >= 90% de l'amplitude.
# Controle positif : sur la REFERENCE, la couleur de coeur doit tomber sur --laiton (176,141,62) a <=6/255.
from common import *
from collections import Counter
def mesure(im,cols,y0,y1,scale,label):
    px=im.load(); cnt=Counter(); nom=[]; coeur=[]
    for x in cols:
        prof=[(y,px[x,y]) for y in range(y0,y1)]
        Ls=[lum(c) for _,c in prof]
        base=sorted(Ls)[len(Ls)//4]  # quartile bas = fond
        pic=max(Ls)
        if pic-base<15: continue
        half=base+(pic-base)*0.5; nine=base+(pic-base)*0.9
        n=[y for (y,c),L in zip(prof,Ls) if L>=half]
        k=[(y,c) for (y,c),L in zip(prof,Ls) if L>=nine]
        if n: nom.append(len(n))
        for y,c in k: cnt[c]+=1; coeur.append(len(k))
    print(f'  {label}: colonnes utiles={len(nom)}  epaisseur NOMINALE med={sorted(nom)[len(nom)//2]} px = {sorted(nom)[len(nom)//2]/scale:.2f} CSS ; COEUR med={sorted(coeur)[len(coeur)//2]} px = {sorted(coeur)[len(coeur)//2]/scale:.2f} CSS')
    print(f'    couleurs de coeur les + frequentes : {cnt.most_common(4)}')
    return cnt.most_common(1)[0][0]
r=op(REF)
cr=mesure(r,range(400,470),140,172,REF_S,'REF filet (x 400..470 px)')
print(f'  CONTROLE POSITIF : ecart au --laiton (176,141,62) = {tuple(a-b for a,b in zip(cr,(176,141,62)))}')
c=op(C19)
cc=mesure(c,range(660,900),150,178,CAP_S,'CAP1920 filet (x 660..900 px)')
c2=op(C24)
cc2=mesure(c2,range(660,900),150,178,CAP_S,'CAP2400 district filet')
t=op(T24)
ct=mesure(t,range(660,900),130,160,CAP_S,'TEMOIN famille filet')
print()
print(f'  ECART CAP1920 vs canon laiton : {tuple(a-b for a,b in zip(cc,(176,141,62)))}')
def hue(c):
    mx,mn=max(c),min(c)
    if mx==mn: return 0
    if mx==c[0]: h=60*((c[1]-c[2])/(mx-mn)%6)
    elif mx==c[1]: h=60*((c[2]-c[0])/(mx-mn)+2)
    else: h=60*((c[0]-c[1])/(mx-mn)+4)
    return h
for n,c in [('canon --laiton',(176,141,62)),('REF mesure',cr),('CAP1920',cc),('CAP2400',cc2),('TEMOIN',ct)]:
    print(f'    {n:16s} {c}  teinte={hue(c):5.1f} deg  satur={(max(c)-min(c))/max(c):.3f}')
