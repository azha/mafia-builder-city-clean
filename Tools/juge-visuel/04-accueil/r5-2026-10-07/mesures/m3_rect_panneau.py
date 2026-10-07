# m3 — rectangle du panneau LA SUITE, par PLATITUDE locale (le decor est bruite, le panneau est un aplat).
# Controle positif : la largeur du panneau REF doit etre ~= 926..980 px et le panneau doit couvrir
# plusieurs centaines de lignes ; controle negatif : la bande du DECOR doit etre classee non-plate.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

def carte_plate(im, pas=2, seuil=2.0):
    px=im.load(); w,h=im.size
    plat=[[0]*((w+pas-1)//pas) for _ in range((h+pas-1)//pas)]
    for yi,y in enumerate(range(0,h,pas)):
        for xi,x in enumerate(range(0,w,pas)):
            vals=[]
            for dy in (-3,0,3):
                for dx in (-3,0,3):
                    yy=min(max(y+dy,0),h-1); xx=min(max(x+dx,0),w-1)
                    vals.append(lum(px[xx,yy]))
            m=sum(vals)/9
            v=(sum((t-m)**2 for t in vals)/9)**0.5
            plat[yi][xi]=1 if v<seuil else 0
    return plat,pas

def rect(im,nom,ymin_frac):
    plat,pas=carte_plate(im)
    H=len(plat); W=len(plat[0]); h=im.size[1]
    y0i=int(H*ymin_frac)
    lignes=[(yi,sum(plat[yi])) for yi in range(H)]
    # une ligne "de panneau" : >70% de colonnes plates
    cand=[yi for yi,c in lignes if c>0.70*W and yi>y0i]
    print(f'  {nom}: lignes plates >70% : {len(cand)} ; premiere y={cand[0]*pas if cand else None} derniere y={cand[-1]*pas if cand else None}')
    # bornes laterales sur la tranche mediane du panneau
    if cand:
        mid=cand[len(cand)//2]
        row=plat[mid]
        g=next(xi for xi in range(W) if all(row[k] for k in range(xi,min(xi+6,W))))
        d=next(xi for xi in range(W-1,-1,-1) if all(row[k] for k in range(max(xi-5,0),xi+1)))
        print(f'      tranche y={mid*pas}: x {g*pas}..{d*pas}  largeur {(d-g)*pas}')
    return cand,pas

print('== REF ==');  rect(charge(REF),'REF',0.40)
print('== JEU1920 =='); rect(charge(J19),'JEU1920',0.40)
print('== JEU2400 =='); rect(charge(J24),'JEU2400',0.40)
