# m16 — HALO du medaillon du Don, ligne de base prise DANS LA MEME CARTE (fond de carte loin du
# medaillon, meme y), donc sans emprunt a une autre carte. Exces(d) = R_median(anneau a d) - base.
# Controle NEGATIF : le meme instrument sur un medaillon de LIEUTENANT (.medl sans box-shadow) doit
# rendre une integrale ~0 des deux cotes. Controle POSITIF : a d=0 (bord de l'anneau) l'exces du Don
# doit etre le plus grand de la serie.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def med(px,ox,oy,f,x0,y0,x1,y1,ch=0):
    v=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)): v.append(px[x,y][ch])
    v.sort(); return v[len(v)//2]
def profil(px,ox,oy,f,cx,cy,Rdeb,W,H):
    X=PX(cx,ox,f); Y=PX(cy,oy,f); out=[]
    for d in range(0,18):
        rr=(Rdeb+d)*f; vals=[]
        for k in range(1440):
            a=k*math.pi/720.
            x=int(round(X+rr*math.cos(a))); y=int(round(Y+rr*math.sin(a)))
            if 0<=x<W and 0<=y<H: vals.append(px[x,y][0])
        vals.sort(); out.append(vals[len(vals)//2])
    return out

# centres mesures en m15
REF={"don":(77.25,186.00),"lt1":(100.75,302.75),"lt2":(100.75,504.75)}
CAP={"don":(76.32,184.01),"lt1":(100.51,299.68),"lt2":(100.51,499.65)}
# lignes de base : fond de la carte, meme y, x CSS 380..440 (hors texte, hors bord)
base_r_don=med(r,0,0,FR,360,178,440,194)
base_r_lt1=med(r,0,0,FR,360,295,440,311)
base_r_lt2=med(r,0,0,FR,360,497,440,513)
base_c_don=med(c,CX0,CY0,FC,360,176,440,192)
base_c_lt1=med(c,CX0,CY0,FC,360,292,440,308)
base_c_lt2=med(c,CX0,CY0,FC,360,492,440,508)
print("\nlignes de base (canal R du fond de carte) : ref don=%d lt1=%d lt2=%d | cap don=%d lt1=%d lt2=%d"%(
    base_r_don,base_r_lt1,base_r_lt2,base_c_don,base_c_lt1,base_c_lt2))

pr_d=profil(r,0,0,FR,*REF["don"],Rdeb=36.5,W=1120,H=1850)
pr_1=profil(r,0,0,FR,*REF["lt1"],Rdeb=36.5,W=1120,H=1850)
pr_2=profil(r,0,0,FR,*REF["lt2"],Rdeb=36.5,W=1120,H=1850)
pc_d=profil(c,CX0,CY0,FC,*CAP["don"],Rdeb=36.5,W=1080,H=2400)
pc_1=profil(c,CX0,CY0,FC,*CAP["lt1"],Rdeb=36.5,W=1080,H=2400)
pc_2=profil(c,CX0,CY0,FC,*CAP["lt2"],Rdeb=36.5,W=1080,H=2400)

print("\n d |  ref: don-base  lt1-base  lt2-base |  cap: don-base  lt1-base  lt2-base")
Sd_r=Sl_r=Sd_c=Sl_c=0
for d in range(18):
    a=pr_d[d]-base_r_don; b=pr_1[d]-base_r_lt1; e=pr_2[d]-base_r_lt2
    a2=pc_d[d]-base_c_don; b2=pc_1[d]-base_c_lt1; e2=pc_2[d]-base_c_lt2
    Sd_r+=a; Sl_r+=(b+e)/2.; Sd_c+=a2; Sl_c+=(b2+e2)/2.
    print("%2d |      %+4d      %+4d     %+4d  |      %+4d      %+4d     %+4d"%(d,a,b,e,a2,b2,e2))
print("\nintegrale d'exces (d=0..17) :")
print("  REFERENCE  don %+.1f   lieutenants (moy, controle negatif) %+.1f   NET %.1f"%(Sd_r,Sl_r,Sd_r-Sl_r))
print("  JEU        don %+.1f   lieutenants (moy, controle negatif) %+.1f   NET %.1f"%(Sd_c,Sl_c,Sd_c-Sl_c))
nr=Sd_r-Sl_r; nc=Sd_c-Sl_c
print("  ratio jeu/reference : %.2f"%(nc/nr if nr else 0))
print("  pic (d=0) : reference %+d   jeu %+d"%(pr_d[0]-base_r_don,pc_d[0]-base_c_don))
