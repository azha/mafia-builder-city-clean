import sys; sys.path.insert(0,'.')
from lib import *
print("=== m37 : bande ou le visage touche le FOND sans contour ni coiffe ===")
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
CAS=[('REF','../reference-1080x2102.png',(17,24,35),1099,1232),
     ('JEU','../capture-1080x2400.png',  (13,22,34),1118,1257)]
for nom,f,fondc,ytop,ybot in CAS:
    im=ouvrir(f); p=px(im); h=ybot-ytop+1
    nues=[]
    for y in range(ytop,ybot+1):
        xs=[x for x in range(140,420) if peau(p[x,y])]
        if len(xs)<20: continue
        a,b=min(xs),max(xs)
        # les 3 px a gauche de la peau sont-ils le FOND de la carte ?
        gauche = all(all(abs(p[a-k,y][i]-fondc[i])<=4 for i in range(3)) for k in (1,2,3))
        droite = all(all(abs(p[b+k,y][i]-fondc[i])<=4 for i in range(3)) for k in (1,2,3))
        if gauche or droite: nues.append((y,gauche,droite))
    if nues:
        ys=[y for y,_,_ in nues]
        print(f"  {nom} : {len(nues)} rangees ou la peau touche le fond sans contour"
              f" — y {min(ys)}..{max(ys)} = {100*(min(ys)-ytop)/h:.0f} % a {100*(max(ys)-ytop)/h:.0f} % de la hauteur du visage")
        print(f"        (cotes : gauche {sum(1 for _,g,_ in nues if g)} rangees, droite {sum(1 for _,_,d in nues if d)})")
    else:
        print(f"  {nom} : AUCUNE rangee — le visage est cerne sur toute sa hauteur.")
