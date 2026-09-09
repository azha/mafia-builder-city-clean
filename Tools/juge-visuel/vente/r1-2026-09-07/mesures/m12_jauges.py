# m12 — JAUGES : segments de la capture (Caisse/Marge) vs .jg et .marge de la reference.
# Controle positif : la reference doit rendre EXACTEMENT 4 segments pour .jg (Oskar, tous allumes).
# Controle negatif : une bande sans jauge (reference y=1000, x=760..1030) doit rendre 0 segment.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def segments(im,px,y,x0,x1,seuil):
    on=[x for x in range(x0,x1) if lum(px[x,y])>seuil]
    segs=[]
    if on:
        deb=on[0]; prev=on[0]
        for x in on[1:]:
            if x-prev>1: segs.append((deb,prev)); deb=x
            prev=x
        segs.append((deb,prev))
    return segs

print('== REFERENCE ==')
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT', im.size)
# .jg d'Oskar : a droite, y ~ 905..925 (sous le statut y888..899)
for y in [905,910,915,920]:
    s=segments(im,px,y,760,1035,60)
    print(f'  .jg Oskar y={y} : {len(s)} segments {s}')
# .marge d'Oskar : dans la petite ligne, apres le texte (x~470..560), y 917..945
for y in [925,930,935]:
    s=segments(im,px,y,455,570,60)
    print(f'  .marge Oskar y={y} : {len(s)} segments {s}')
print('  CONTROLE NEGATIF (y=1000, x760..1030, entre deux rangees) :', segments(im,px,1000,760,1030,60))
# hauteur du .jg
ys=[y for y in range(895,950) if len(segments(im,px,y,760,1035,60))>=3]
print('  .jg hauteur = %d px (%.2f CSS) y=%d..%d'%(len(ys),len(ys)/3.6,min(ys),max(ys)))
# couleur d'un segment allume / eteint
print('  .jg segment 1 (allume) rgb=',px[800,912],'  segment eteint (Mira, y=1040) rgb=',px[960,1040])

print()
print('== CAPTURE ==')
im2=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); q=im2.load()
print('OUVERT', im2.size)
for y in [440,445,450,455,460]:
    s=segments(im2,q,y,180,380,40)
    print(f'  Caisse y={y} : {len(s)} segments {s}')
for y in [486,490,495,500,505]:
    s=segments(im2,q,y,180,380,40)
    print(f'  Marge  y={y} : {len(s)} segments {s}')
# hauteur d'un pip
ys=[y for y in range(425,480) if len(segments(im2,q,y,180,380,40))>=2]
print('  pip Caisse : hauteur = %d px (%.2f CSS) y=%d..%d'%(len(ys),len(ys)/3.6,min(ys),max(ys)))
# creux : un pip est-il PLEIN ou CREUX ?
print('  coupe verticale au centre du 1er pip (x=195) y=432..470 :')
print('   ',[(y,round(lum(q[195,y]),1)) for y in range(432,470,2)])
print('  couleur du trait du pip allume =',q[186,449],'  pip eteint =',q[310,449])
