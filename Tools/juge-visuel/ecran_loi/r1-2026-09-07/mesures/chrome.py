# Chrome : bandeau + medaillon + dock, capture vs canon HUD, normalises en CSS-HUD.
# Echelles (dossier) : canon 1176 px = 392 CSS -> x3,000 ; capture 1080 px = 392 CSS -> x2,755.
# Controle positif : la largeur totale doit rendre 392,0 CSS des DEUX cotes.
# Controle negatif : la hauteur totale doit DIFFERER (canon 2091/3=697 CSS ; capture 2400/2,755=871 CSS).
from PIL import Image
import statistics as st
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
can=Image.open('../hud-canon-1176.png').convert('RGB'); print('canon  ',can.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
SC={'canon':1176/392.0,'capture':1080/392.0}
print('CONTROLE POSITIF largeur CSS : canon %.1f  capture %.1f'%(1176/SC['canon'],1080/SC['capture']))
print('CONTROLE NEGATIF hauteur CSS : canon %.1f  capture %.1f'%(2091/SC['canon'],2400/SC['capture']))
print()
def col(im,x,y0,y1):
    px=im.load(); return [(y,px[x,y]) for y in range(y0,y1)]
# --- filet du bandeau ---
print('filet du bandeau, colonne x=1/8 de largeur :')
for nom,im,s in [('canon',can,SC['canon']),('capture',cap,SC['capture'])]:
    px=im.load(); w,h=im.size; x=w//8
    best=[]
    for y in range(1,300):
        c=px[x,y]; p=px[x,y-1]
        if abs(lum(c)-lum(p))>25: best.append((y,p,c))
    print('  %-8s ruptures: %s' % (nom, best[:6]))
print()
# --- medaillon : bbox du disque clair au centre haut ---
print('medaillon : bbox de l anneau (pixels satures) dans la bande du haut')
for nom,im,s in [('canon',can,SC['canon']),('capture',cap,SC['capture'])]:
    px=im.load(); w,h=im.size
    xs=[];ys=[]
    for y in range(0,320):
        for x in range(int(w*0.28),int(w*0.72)):
            c=px[x,y]
            mx,mn=max(c),min(c)
            if mx>110 and mx-mn>45: xs.append(x); ys.append(y)
    if xs:
        print('  %-8s x %d..%d (%d px = %.1f CSS)  y %d..%d (%d px = %.1f CSS)  centre x=%.1f CSS'
              %(nom,min(xs),max(xs),max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/s,
                min(ys),max(ys),max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/s,(min(xs)+max(xs))/2/s))
print()
# --- valeur ARGENT : bbox de l encre claire a gauche ---
print('ARGENT (valeur) : bbox de l encre a gauche du medaillon')
for nom,im,s,yr in [('canon',can,SC['canon'],(60,130)),('capture',cap,SC['capture'],(45,100))]:
    px=im.load(); w,h=im.size; xs=[];ys=[]
    for y in range(*yr):
        for x in range(0,int(w*0.52)):
            if lum(px[x,y])>90: xs.append(x); ys.append(y)
    if xs: print('  %-8s x %d..%d -> %.1f..%.1f CSS   y %d..%d'%(nom,min(xs),max(xs),min(xs)/s,max(xs)/s,min(ys),max(ys)))
print()
# --- dock ---
print('dock : bandes d encre du bas')
for nom,im,s in [('canon',can,SC['canon']),('capture',cap,SC['capture'])]:
    px=im.load(); w,h=im.size
    fond=st.median([lum(px[x,h-40]) for x in range(0,w,3)])
    runs=[];cur=None
    for y in range(int(h*0.80),h):
        m=max(lum(px[x,y]) for x in range(0,w,2))
        if m>fond+14:
            if cur is None: cur=y
        else:
            if cur is not None: runs.append((cur,y-1)); cur=None
    if cur is not None: runs.append((cur,h-1))
    print('  %-8s fondL=%.0f  bandes: %s'%(nom,fond,[(a,b,round(a/s,1),round(b/s,1)) for a,b in runs]))
