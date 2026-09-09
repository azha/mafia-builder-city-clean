# m20 — l'objet du coin haut-gauche : la PLANCHE montre une fleche retour blanche ;
# la capture PRINCIPALE montre a la place un trait a volute tres sombre.
# (Deux campagnes = deux mondes : on CONSTATE, on ne conclut a aucune regression.)
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def relL(p):
    def f(c):
        c/=255.0
        return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def contraste(a,b):
    la,lb=relL(a),relL(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
for nom,seuil in [('capture-1080x2400.png',18),('capture-planche-1080x2400.png',60)]:
    im=Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load()
    print(f'--- {nom} {im.size} (seuil lum>{seuil})')
    fond=px[5,60]
    xs=[];ys=[];cols=[]
    for y in range(35,95):
        for x in range(0,140):
            p=px[x,y]
            if lum(p)>seuil: xs.append(x);ys.append(y);cols.append(p)
    if not xs: print('   aucune encre'); continue
    cols.sort(key=lum); hi=cols[int(len(cols)*0.92)]
    print('   bbox x=%d..%d y=%d..%d (%dx%d px)  n=%d  fond=%s  couleur_p92=%s  contraste=%.2f:1'%(
        min(xs),max(xs),min(ys),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,len(xs),fond,hi,contraste(hi,fond)))
    print('   touche-t-il le bord gauche de l ecran (x=0) ?', min(xs)==0)
print()
print('CONTROLE : la maquette ne pose AUCUN ornement dans .barre .aile (elle n a que .lib et .val).')

# -- suite : isoler la VOLUTE sombre de la capture principale (exclure l'or du montant)
print()
print('--- volute sombre, capture principale : encre NON-OR, x0..90, y40..90')
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load()
fond=px[5,60]
def est_or(p):
    r,g,b=p; return r>120 and g>90 and b<150 and (r-b)>45
xs=[];ys=[];cols=[]
for y in range(40,92):
    for x in range(0,92):
        p=px[x,y]
        if lum(p)-lum(fond)>6 and not est_or(p): xs.append(x);ys.append(y);cols.append(p)
cols.sort(key=lum); hi=cols[int(len(cols)*0.92)]
print('   bbox x=%d..%d y=%d..%d (%dx%d px = %.1fx%.1f CSS-HUD)  n=%d  couleur_p92=%s  contraste/fond=%.2f:1'%(
   min(xs),max(xs),min(ys),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,(max(xs)-min(xs)+1)/2.755,(max(ys)-min(ys)+1)/2.755,len(xs),hi,contraste(hi,fond)))
print('   touche le bord gauche x=0 :', min(xs)==0)
print('   CONTROLE NEGATIF meme sonde sur la PLANCHE (qui montre une fleche blanche) :')
im2=Image.open(os.path.join(D,'capture-planche-1080x2400.png')).convert('RGB'); q=im2.load()
f2=q[5,60]
xs2=[(x,y) for y in range(40,92) for x in range(0,92) if lum(q[x,y])-lum(f2)>6 and not est_or(q[x,y])]
print('     n=%d px'%len(xs2), (' bbox x=%d..%d'%(min(p[0] for p in xs2),max(p[0] for p in xs2))) if xs2 else '')
