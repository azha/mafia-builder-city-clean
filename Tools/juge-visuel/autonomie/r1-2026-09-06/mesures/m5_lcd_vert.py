# m5 — l'ECRAN LCD VERT, trait d'identite n1 de cet ecran.
# Detecteur: G > R+8 et G > B+8  (vert franc). Controle NEGATIF integre: on le passe
# aussi sur le bandeau HUD de la reference, ou l'on SAIT qu'il n'y a pas de LCD.
from PIL import Image
def scan(path, label, y0, y1):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s' % (path, im.size))
    xs=[];ys=[];n=0
    for y in range(y0,min(y1,im.height)):
        for x in range(im.width):
            r,g,b=px[x,y]
            if g>r+8 and g>b+8:
                n+=1; xs.append(x); ys.append(y)
    print('  %s : %d px verts sur %d  = %.3f %%' % (label, n, (min(y1,im.height)-y0)*im.width,
          100.0*n/max(1,(min(y1,im.height)-y0)*im.width)))
    if n: print('     bbox x %d..%d (w=%d)  y %d..%d (h=%d)' % (min(xs),max(xs),max(xs)-min(xs)+1,min(ys),max(ys),max(ys)-min(ys)+1))
    return n

print('=== REFERENCE ===')
nref = scan('../reference-1080x2102.png','contenu (y 229..2102)',229,2102)
print('--- CONTROLE NEGATIF: bandeau HUD de la reference (y 0..229), sans LCD attendu ---')
scan('../reference-1080x2102.png','bandeau HUD',0,229)
print()
print('=== CAPTURE ===')
ncap = scan('../capture-1080x2400.png','rect libre (y 143..2179)',143,2179)
print()
print('VERDICT DETECTEUR: reference=%d px verts / capture=%d px verts' % (nref,ncap))
