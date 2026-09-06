# m5 — les PANNEAUX (don-rang + rangs) : bornes verticales et horizontales, par le discriminant B-R>=12
# (le fond de feuille a B-R = 5 (ref) / 6 (cap) ; le degrade des panneaux monte a 15-20).
# Controle positif : la largeur du don-rang doit valoir ~513 CSS des deux cotes (valeur CSS 560-2*23.5).
# Controle negatif : le fond de feuille ne doit produire AUCUNE bande.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF',ref.size,'CAP',cap.size)
REF=dict(im=ref,x0=0,x1=1119,y0=0,f=2.0)
CAP=dict(im=cap,x0=13,x1=1065,y0=232,f=1053/560)
def bandes(S,seuil=12,minw=200):
    px=S['im'].load(); out=[]; prev=False
    for y in range(S['y0'], min(S['im'].size[1], S['y0']+int(940*S['f']))):
        n=sum(1 for x in range(S['x0'],S['x1'],2) if px[x,y][2]-px[x,y][0]>=seuil)
        on = n*2>minw
        if on and not prev: a=y
        if (not on) and prev: out.append((a,y-1))
        prev=on
    return out
for nom,S in (('REFERENCE',REF),('CAPTURE',CAP)):
    px=S['im'].load(); f=S['f']
    print(f'\n===== {nom} (f={f:.5f}) — panneaux =====')
    for a,b in bandes(S):
        ym=(a+b)//2
        xs=[x for x in range(S['x0'],S['x1']+1) if px[x,ym][2]-px[x,ym][0]>=12]
        # bornes horizontales = premier/dernier
        print(f'  y {a}..{b} | CSS y {(a-S["y0"])/f:6.1f}..{(b-S["y0"])/f:6.1f} h={(b-a+1)/f:5.1f}'
              f' | x {xs[0]}..{xs[-1]} | CSS x {(xs[0]-S["x0"])/f:6.1f}..{(xs[-1]-S["x0"])/f:6.1f} larg={(xs[-1]-xs[0]+1)/f:6.1f}')
