import sys; sys.path.insert(0,'.')
from lib import *
print("=== m29a : en-tete de la colonne de droite — interlignes ===")
def lignes(im,x0,y0,x1,y1,frac=0.45):
    p=px(im)
    L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//4]; haut=plat[-max(1,len(plat)//80)]
    s=fond+frac*(haut-fond)
    prof=[(y0+j,sum(1 for v in r if v>=s)) for j,r in enumerate(L)]
    out=[];cur=None
    for y,n in prof:
        if n>=3:
            cur=[y,y] if cur is None else [cur[0],y]
        else:
            if cur and cur[1]-cur[0]>=3: out.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>=3: out.append(tuple(cur))
    return out
ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
print("  « Pas encore / jugeable » (serif, colonne gauche de l'en-tete)")
a=lignes(ref,536,880,745,990); b=lignes(cap,533,900,742,1000)
print(f"     REF lignes {a} -> pas {[a[i+1][0]-a[i][0] for i in range(len(a)-1)]}")
print(f"     JEU lignes {b} -> pas {[b[i+1][0]-b[i][0] for i in range(len(b)-1)]}")
print("  « ce qu'il a / absorbe de vos / regles » (aparte, colonne droite)")
a=lignes(ref,760,880,975,990); b=lignes(cap,760,900,1005,1000)
print(f"     REF lignes {a} -> pas {[a[i+1][0]-a[i][0] for i in range(len(a)-1)]}")
print(f"     JEU lignes {b} -> pas {[b[i+1][0]-b[i][0] for i in range(len(b)-1)]}")
print("  lignes des tuiles (tuile 1 : titre + sous-texte)")
a=lignes(ref,620,1000,900,1100); b=lignes(cap,614,995,900,1090)
print(f"     REF {a} -> pas {[a[i+1][0]-a[i][0] for i in range(len(a)-1)]}")
print(f"     JEU {b} -> pas {[b[i+1][0]-b[i][0] for i in range(len(b)-1)]}")
print()
print("=== m29b : le tiret ENFREINTES — couleur, taille, position (ecart ASSUME) ===")
p=px(cap)
def cyan(c):
    r,g,b=c; return g>150 and b>150 and g-r>60
bb=bbox_masque(cap, cyan, 800,740,960,800)
print(f"  tiret : x{bb[0]}..{bb[2]} ({bb[2]-bb[0]+1} px) y{bb[1]}..{bb[3]} ({bb[3]-bb[1]+1} px) n={bb[4]}")
print(f"     couleur au coeur = {mediane_fenetre(p,bb[0]+8,bb[1]+1,bb[2]-7,bb[3])}")
bb2=bbox_masque(cap, cyan, 120,740,300,800)
print(f"  chiffres compteur 1 : x{bb2[0]}..{bb2[2]} y{bb2[1]}..{bb2[3]} couleur = {mediane_fenetre(p,178,760,188,772)}")
print(f"     centre vertical du tiret = {(bb[1]+bb[3])/2:.1f} ; centre vertical des chiffres = {(bb2[1]+bb2[3])/2:.1f} -> ecart {((bb[1]+bb[3])/2)-((bb2[1]+bb2[3])/2):+.1f} px")
print(f"     boite du compteur 3 = x719..1031 (centre 875,0) ; centre du tiret x = {(bb[0]+bb[2])/2:.1f}")
print(f"     boite du compteur 1 = x46..358 (centre 202,0) ; centre des chiffres x = {(bb2[0]+bb2[2])/2:.1f}")
