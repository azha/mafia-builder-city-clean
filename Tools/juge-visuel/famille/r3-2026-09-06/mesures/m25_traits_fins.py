# m25 — TRAITS FINS (1 CSS) : on prend le PIC (max de luminance) d'un profil perpendiculaire, pas la
# mediane d'une bande — un trait de 1 CSS rendu a x1,88 vs x2,0 n'occupe pas le meme nombre de px.
# Sujets : bord pointille des boites vides, contour de pastille, epaisseur apparente.
# Controle positif : le rail principal (1,87 CSS, opaque) doit rendre le meme pic des deux cotes.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]

def pic_horizontal(nom,px,ox,oy,f,cssy0,cssy1,x0,x1):
    # pour chaque x, max de lum sur la bande y ; on garde la mediane des 25% plus clairs (coeur des tirets)
    vals=[]
    for x in range(PX(x0,ox,f),PX(x1,ox,f)):
        best=None
        for y in range(PX(cssy0,oy,f),PX(cssy1,oy,f)+1):
            p=px[x,y]
            if best is None or lum(p)>lum(best): best=p
        vals.append(best)
    vals.sort(key=lum)
    top=vals[int(len(vals)*0.80):]
    m=tuple(sorted(k[i] for k in top)[len(top)//2] for i in range(3))
    print("  %-32s coeur du trait %s  (L=%.1f)"%(nom,m,lum(m)))
    return m
def pic_vertical(nom,px,ox,oy,f,cssx0,cssx1,y0,y1):
    vals=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)):
        best=None
        for x in range(PX(cssx0,ox,f),PX(cssx1,ox,f)+1):
            p=px[x,y]
            if best is None or lum(p)>lum(best): best=p
        vals.append(best)
    vals.sort(key=lum)
    top=vals[int(len(vals)*0.80):]
    m=tuple(sorted(k[i] for k in top)[len(top)//2] for i in range(3))
    print("  %-32s coeur du trait %s  (L=%.1f)"%(nom,m,lum(m)))
    return m

print("\n== bord POINTILLE (haut) des boites vides ==")
pic_horizontal("ref vide1",r,0,0,FR,367.5,370.5,200,520)
pic_horizontal("cap vide1",c,CX0,CY0,FC,364.5,367.5,200,520)
pic_horizontal("ref recruter",r,0,0,FR,834,837,80,520)
pic_horizontal("cap recruter",c,CX0,CY0,FC,856.5,859.5,80,520)

print("\n== contour de PASTILLE (bord gauche vertical) ==")
pic_vertical("ref rang1 (DELEGUE)",r,0,0,FR,152.0,155.0,312,326)
pic_vertical("cap rang1 (RECENT)",c,CX0,CY0,FC,233.5,236.5,310,326)
print("== contour de PASTILLE (bord haut) ==")
pic_horizontal("ref rang1",r,0,0,FR,303.5,306.0,175,230)
pic_horizontal("cap rang1",c,CX0,CY0,FC,303.0,305.5,260,315)

print("\n== controle positif : rail principal (opaque) ==")
pic_vertical("ref rail",r,0,0,FR,31.0,34.0,255,265)
pic_vertical("cap rail",c,CX0,CY0,FC,31.0,34.0,253,263)

print("\n== EPAISSEUR apparente du bord pointille (nb de px > mi-hauteur) ==")
def epaisseur(nom,px,ox,oy,f,cssx,y0,y1,bl,pk):
    x=PX(cssx,ox,f); s=(bl+pk)/2.
    n=sum(1 for y in range(PX(y0,oy,f),PX(y1,oy,f)) if lum(px[x,y])>s)
    print("  %-32s %.2f CSS"%(nom,n/f))
epaisseur("ref vide1 (x=260)",r,0,0,FR,260,365,373,24.5,52)
epaisseur("cap vide1 (x=260)",c,CX0,CY0,FC,260,362,370,22.4,52)
