# m17 — "energie" d'un trait 1px : integrale de (pixel - fond) sur une coupe perpendiculaire,
# divisee par le facteur d'echelle => grandeur comparable entre 1120px(x2.0) et 1080px(x1.88036).
# Controle POSITIF : le meme calcul sur le SEPARATEUR de tete (laiton, opaque) doit donner ~egal.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def energie(im,xs,y0,y1,bg,S,label,chan=0):
    px=im.load(); vals=[]
    for x in xs:
        s=0
        for y in range(y0,y1):
            s+=max(0,px[x,y][chan]-bg[chan])
        vals.append(s)
    vals.sort()
    # on garde le quartile haut (les "pleins" du pointille), median dessus
    hi=vals[int(len(vals)*0.75):]
    m=sorted(hi)[len(hi)//2] if hi else 0
    print('  %-34s energie/px-CSS = %6.1f   (max=%d, median global=%d, n=%d)'%(label,m/S,vals[-1],vals[len(vals)//2],len(vals)))
    return m/S
print('\nCONTROLE POSITIF — separateur de tete (laiton opaque, 1px)')
energie(ref,range(300,800),225,238,(22,25,27),2.0,'REF separateur')
energie(cap,range(300,800),468,482,(22,22,28),1.88036,'CAP separateur')
print('\n1. trait pointille du cadre .vide (#ffffff22)')
energie(ref,range(250,1000),732,744,(22,25,27),2.0,'REF vide#1 bord haut')
energie(cap,range(240,960),941,955,(22,22,28),1.88036,'CAP vide#1 bord haut')
print('\n2. anneau du bouton retour (#ffffff26) — coupe horizontale au centre')
def energie_h(im,ys,x0,x1,bg,S,label,chan=0):
    px=im.load(); vals=[]
    for y in ys:
        s=0
        for x in range(x0,x1):
            s+=max(0,px[x,y][chan]-bg[chan])
        vals.append(s)
    vals.sort(); hi=vals[int(len(vals)*0.5):]
    m=sorted(hi)[len(hi)//2]
    print('  %-34s energie/px-CSS = %6.1f   (max=%d, n=%d)'%(label,m/S,vals[-1],len(vals)))
    return m/S
energie_h(ref,range(110,140),48,62,(22,25,27),2.0,'REF retour bord gauche')
energie_h(cap,range(320,360),57,72,(27,26,29),1.88036,'CAP retour bord gauche')
print('\n3. contour de la puce cyan (#7fd4d955) — coupe horizontale, canal B')
energie_h(ref,range(1380,1400),300,314,(18,25,36),2.0,'REF puce bord gauche (B)',2)
energie_h(cap,range(1600,1625),295,309,(17,22,34),1.88036,'CAP puce bord gauche (B)',2)
