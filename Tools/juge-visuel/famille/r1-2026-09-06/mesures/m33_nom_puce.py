# m33 — ecart vertical NOM -> PUCE, sur les rangs a puce CYAN des deux cotes (temoins homologues).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
creme=lambda p: p[0]>150 and p[1]>140 and 15<=p[0]-p[2]<=70
cy   =lambda p: p[2]-p[0]>12 and p[2]>45 and p[1]>=p[0]
def span(im,x0,y0,x1,y1,pred,S,OY,label):
    px=im.load(); ys=[y for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    if not ys: print('   %s : RIEN'%label); return None
    v=((min(ys)-OY)/S,(max(ys)-OY)/S)
    print('   %-28s CSS y=%.1f..%.1f (h=%.2f)'%(label,v[0],v[1],v[1]-v[0]))
    return v
print('\nREF rang1 (bande CSS 252.5..353.0) — nom "Comptable" + puce DELEGUE')
n=span(ref,300,530,700,600,creme,2.0,0,'nom'); c=span(ref,295,595,560,680,cy,2.0,0,'puce (contour cyan)')
print('   => ecart nom(bas) -> puce(haut) = %.2f CSS'%(c[0]-n[1]))
print('\nREF rang3 (bande CSS 629.5..728.5) — nom "Blanchiment" + puce DELEGUE')
n=span(ref,300,1285,700,1358,creme,2.0,0,'nom'); c=span(ref,295,1358,560,1425,cy,2.0,0,'puce')
print('   => ecart = %.2f CSS'%(c[0]-n[1]))
print('\nCAP rang1 (bande CSS 264.3..363.8) — nom "Cuisinier" + puce RECENT')
n=span(cap,245,1520,700,1590,creme,1.88036,232,'(place-holder)')
n=span(cap,245,750,700,1590,creme,1.88036,232,'(trop large - ignore)')
print('\nCAP rang1 fenetres serrees')
n=span(cap,245,750,700,808,creme,1.88036,232,'nom'); c=span(cap,240,808,560,890,cy,1.88036,232,'puce')
print('   => ecart = %.2f CSS'%(c[0]-n[1]))
print('\nCAP rang3 fenetres serrees')
n=span(cap,245,1508,700,1572,creme,1.88036,232,'nom'); c=span(cap,240,1572,560,1650,cy,1.88036,232,'puce')
print('   => ecart = %.2f CSS'%(c[0]-n[1]))
