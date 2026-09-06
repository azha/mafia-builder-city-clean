# m18 — (a) bouton RETOUR : energie de trait de l'anneau (4 profils cardinaux) et remplissage interieur ;
#       (b) BORDURES du don-rang, 4 cotes (couleur et teinte R-B) ;
#       (c) LISERE interne haut des rangs et SOMMET du degrade ;
#       (d) RAYON des coins des rangs (ajustement du profil du coin haut-gauche).
# Controle positif (a) : l'anneau laiton d'un medaillon doit rendre une energie forte des deux cotes.
# Controle negatif (a) : un profil pris dans le fond de feuille doit rendre ~0.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]

print("\n=== (a) BOUTON RETOUR ===")
# centre du bouton : ref CSS (54,60.75) d'apres m10 (26..81.5 x 34..87.5)
BT={"ref":(r,0,0,FR,53.75,60.75,28.0),"cap":(c,CX0,CY0,FC,53.98,60.90,28.2)}
for nom,(px,ox,oy,f,cx,cy,R) in BT.items():
    E=0.0; pics=[]
    for (dx,dy) in [(1,0),(-1,0),(0,1),(0,-1)]:
        base=[];prof=[]
        for t in range(-8,9):
            rr=R+t*0.5
            x=int(round(PX(cx,ox,f)+dx*rr*f)); y=int(round(PX(cy,oy,f)+dy*rr*f))
            prof.append((t*0.5,lum(px[x,y])))
        b=(prof[0][1]+prof[1][1]+prof[-1][1]+prof[-2][1])/4.
        e=sum(max(0,v-b) for _,v in prof)*0.5
        E+=e; pics.append(round(max(v-b for _,v in prof),1))
    print("  %s : energie de trait %.1f (par px CSS) sur 4 profils, pics %s"%(nom,E/4.,pics))
    # remplissage interieur (#ffffff08 sur le fond)
    v=[]
    for yy in range(PX(cy-8,oy,f),PX(cy-2,oy,f)):
        for xx in range(PX(cx-8,ox,f),PX(cx+8,ox,f)): v.append(px[xx,yy])
    m=tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
    print("     remplissage interieur (mediane) %s"%(m,))
print("  controle positif : anneau laiton du medaillon du lieutenant 1")
for nom,(px,ox,oy,f,cx,cy,R) in {"ref":(r,0,0,FR,100.75,302.75,35.5),"cap":(c,CX0,CY0,FC,100.51,299.68,35.5)}.items():
    E=0.0
    for (dx,dy) in [(1,0),(-1,0)]:
        prof=[]
        for t in range(-8,9):
            rr=R+t*0.5
            x=int(round(PX(cx,ox,f)+dx*rr*f)); y=int(round(PX(cy,oy,f)+dy*rr*f))
            prof.append(lum(px[x,y]))
        b=(prof[0]+prof[1]+prof[-1]+prof[-2])/4.
        E+=sum(max(0,v-b) for v in prof)*0.5
    print("     %s energie %.1f"%(nom,E/2.))

print("\n=== (b) BORDURES du DON-RANG (mediane sur 40 CSS, teinte R-B) ===")
def bord(nom,cote,px,ox,oy,f,_ig,x0,x1,y0,y1):
    v=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)+1):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)+1): v.append(px[x,y])
    m=tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
    print("  %-10s %-7s %s   R-B=%+d  L=%.1f"%(nom,cote,m,m[0]-m[2],lum(m)))
# la bordure du don-rang : haut a CSS y=135 (ref) / 133.5 (cap) ; bas 236.5/233.5 ; gauche x=22.5/22.3 ; droite 537/537.6
bord("ref","haut",r,0,0,FR,"h",200,340,135.5,136.0)
bord("cap","haut",c,CX0,CY0,FC,"h",200,340,134.0,134.6)
bord("ref","bas", r,0,0,FR,"h",200,340,236.0,236.5)
bord("cap","bas", c,CX0,CY0,FC,"h",200,340,233.0,233.5)
bord("ref","gauche",r,0,0,FR,"v",22.5,23.0,175,200)
bord("cap","gauche",c,CX0,CY0,FC,"v",22.3,22.9,173,198)
bord("ref","droite",r,0,0,FR,"v",536.5,537.0,175,200)
bord("cap","droite",c,CX0,CY0,FC,"v",537.0,537.6,173,198)
print("  controle : bordure haute d'un RANG (qui, elle, n'a pas de border-color visible)")
bord("ref","rang1-haut",r,0,0,FR,"h",250,350,253.0,253.5)
bord("cap","rang1-haut",c,CX0,CY0,FC,"h",250,350,249.9,250.4)

print("\n=== (c) LISERE interne haut + sommet du degrade des rangs ===")
def col(nom,px,ox,oy,f,x0,x1,y0,y1):
    v=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)+1):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)+1): v.append(px[x,y])
    m=tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
    print("  %-26s %s"%(nom,m)); return m
col("ref rang2 lisere haut",r,0,0,FR,250,400,454.5,455.0)
col("cap rang2 lisere haut",c,CX0,CY0,FC,250,400,451.3,451.8)
col("ref rang2 sommet degrade",r,0,0,FR,250,400,458,462)
col("cap rang2 sommet degrade",c,CX0,CY0,FC,250,400,455,459)
col("ref rang2 pied degrade",r,0,0,FR,250,400,548,552)
col("cap rang2 pied degrade",c,CX0,CY0,FC,250,400,545,549)
col("ref rang2 lisere interne bas",r,0,0,FR,250,400,553.5,554.0)
col("cap rang2 lisere interne bas",c,CX0,CY0,FC,250,400,550.8,551.4)
