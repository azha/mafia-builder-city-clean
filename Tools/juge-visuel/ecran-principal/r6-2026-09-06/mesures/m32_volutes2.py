# m32 — volutes : critere ABSOLU = AMPLITUDE (pic - mediane) dans la fenetre.
# Controle POSITIF : la reference DOIT donner une grande amplitude. Controle NEGATIF :
#   une fenetre de bandeau VIDE (x 200..250 CSS, y 18..24) doit donner une petite amplitude sur les DEUX.
from lib import *
def amp(im,x0css,y0css,x1css,y1css,s,label):
    x0,y0,x1,y1=int(x0css*s),int(y0css*s),int(x1css*s),int(y1css*s)
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    m=median(ls); pk=max(ls)
    print(f"    {label:38s} fenetre CSS x {x0css}..{x1css} y {y0css}..{y1css} : mediane L={m:6.1f} pic L={pk:6.1f}  AMPLITUDE={pk-m:6.1f}  (n={len(ls)})")
    return pk-m
print("== m32 volutes du bandeau — critere d'AMPLITUDE ==")
r=load(REF)
print("  CONTROLE POSITIF (reference)")
amp(r,4,18,30,30,S_REF,'REF volute gauche')
amp(r,362,18,388,24.5,S_REF,'REF volute droite')
print("  CONTROLE NEGATIF (bandeau vide, memes hauteurs)")
amp(r,215,18,245,30,S_REF,'REF zone vide')
print()
for p,nm in [(CAP19,'1920'),(DIS24,'district 2400')]:
    im=load(p)
    amp(im,4,18,30,30,S_CAP,f'JEU {nm} volute gauche')
    amp(im,362,18,388,24.5,S_CAP,f'JEU {nm} volute droite')
    amp(im,215,18,245,30,S_CAP,f'JEU {nm} zone vide (controle negatif)')
    print()
