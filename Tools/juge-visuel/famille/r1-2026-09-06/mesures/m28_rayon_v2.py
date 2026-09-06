# m28 — rayon du coin haut-gauche, mesure sur le PANNEAU (discriminant B-R>=10, deja controle en m2).
# Controle : l'ombre portee et le fond de feuille rendent B-R<10, donc ils ne sont pas comptes comme panneau.
from PIL import Image
import os,math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def br(p): return p[2]-p[0]
def arc(im,ytop,xleft,S,label,n=45):
    px=im.load(); pts=[]
    for d in range(n):
        y=ytop+d; x=xleft
        while x<xleft+90 and br(px[x,y])<10: x+=1
        pts.append((d/S,(x-xleft)/S))
    best=None
    for r10 in range(60,400):
        r=r10/10.0; err=0; k=0
        for d,ins in pts:
            if d>=r: continue
            err+=(r-math.sqrt(max(0.0,2*r*d-d*d))-ins)**2; k+=1
        if k>5 and (best is None or err/k<best[0]): best=(err/k,r)
    print('  %-24s r=%.1f CSS (err %.2f) | insets d/inset : %s'%(
        label,best[1],best[0],' '.join('%.1f/%.1f'%(d,i) for d,i in pts[::4])))
arc(ref,910,97,2.0,'REF rang2')
arc(cap,1109,104,1.88036,'CAP rang2')
arc(ref,1260,97,2.0,'REF rang3')
arc(cap,1488,104,1.88036,'CAP rang3')
arc(ref,273,47,2.0,'REF don-rang')
arc(cap,515,57,1.88036,'CAP don-rang')
