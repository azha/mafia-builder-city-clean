# m12 — etat : hauteur de capitale du R de "Repos", couleur des deux lignes, casse du libelle.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
ink=lambda p: p[0]>120 and p[1]>110
def firstglyph(im,x0,y0,x1,y1,S,label):
    px=im.load()
    for x in range(x0,x1):
        col=[y for y in range(y0,y1) if ink(px[x,y])]
        if col: break
    # etendre jusqu au premier creux
    xs=[]; 
    for xx in range(x,x1):
        c=[y for y in range(y0,y1) if ink(px[xx,y])]
        if not c: break
        xs.append(xx)
    ys=[y for xx in xs for y in range(y0,y1) if ink(px[xx,y])]
    print('  %-30s 1er glyphe x=%d..%d  y=%d..%d  capitale=%.2f CSS  largeur=%.2f CSS'%(
        label,xs[0],xs[-1],min(ys),max(ys),(max(ys)-min(ys)+1)/S,(xs[-1]-xs[0]+1)/S))
def colour(im,x0,y0,x1,y1,label,n=40):
    px=im.load(); ps=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if ink(p): ps.append((p[0]+p[1]+p[2],p))
    ps.sort(reverse=True); sel=[p for _,p in ps[:n]]
    if not sel: print('  %-30s RIEN'%label); return
    print('  %-30s %s  (n=%d)'%(label,tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3)),len(ps)))
print('\nREF rang2 : "Repos" (y 975..1015) / "ETAT" (y 1020..1047)')
firstglyph(ref,910,975,1060,1016,2.0,'REF R de Repos')
colour(ref,910,975,1060,1016,'REF couleur "Repos"')
colour(ref,940,1020,1060,1048,'REF couleur libelle')
print('\nCAP rang2 : "Repos" (y 1170..1206) / "Etat" (y 1212..1237)')
firstglyph(cap,855,1170,1010,1207,1.88036,'CAP R de Repos')
colour(cap,855,1170,1010,1207,'CAP couleur "Repos"')
colour(cap,900,1212,1010,1238,'CAP couleur libelle')
