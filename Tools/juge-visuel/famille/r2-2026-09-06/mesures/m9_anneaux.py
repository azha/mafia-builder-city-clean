# m9 — ENERGIE DE TRAIT d'un anneau, instrument commun aux 2 images.
# Methode : 4 profils cardinaux traversant l'anneau ; ligne de base = mediane des 3 px CSS a
# l'exterieur et des 3 a l'interieur de la bande d'anneau ; on integre l'exces de luminance
# sur +-5 CSS autour du pic. Rendu par px CSS.
# CONTROLE POSITIF : le meme instrument sur l'anneau LAITON d'un medaillon de lieutenant doit
#   rendre une valeur FORTE et proche des deux cotes (cet anneau est repute conforme).
# CONTROLE NEGATIF : le meme instrument sur un aplat de la feuille doit rendre ~0.
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def prof_radial(S,cx,cy,r,ang,demi=9.0,pas=0.25):
    im=S['im'].load(); out=[]
    t=-demi
    while t<=demi:
        rr=r+t
        xc=cx+rr*math.cos(ang); yc=cy+rr*math.sin(ang)
        x,y=P(S,xc,yc)
        if 0<=int(round(x))<S['im'].size[0] and 0<=int(round(y))<S['im'].size[1]:
            out.append((t,lum(im[int(round(x)),int(round(y))])))
        t+=pas
    return out
def energie_anneau(S,cx,cy,r):
    tot=0.0; det=[]
    for ang in (math.pi, 0.0, -math.pi/2, math.pi/2):
        pr=prof_radial(S,cx,cy,r,ang)
        ext=[v for t,v in pr if t<=-5.0]; inte=[v for t,v in pr if t>=5.0]
        base=(sorted(ext)[len(ext)//2]+sorted(inte)[len(inte)//2])/2.0
        e=sum(max(0.0,v-base)*0.25 for t,v in pr if -5.0<t<5.0)
        pic=max(v for t,v in pr if -5.0<t<5.0)
        det.append((round(e,1),round(pic-base,1)))
        tot+=e
    return tot/4.0, det
print('\n=== bouton retour (.retour) : centre CSS et rayon ===')
for S,(cx,cy,r) in ((R,(54.0,57.5,27.6)),(C,(54.0,55.75,27.9))):
    e,det=energie_anneau(S,cx,cy,r)
    print(f'{S["nom"]}: centre ({cx},{cy}) r={r} -> energie {e:.1f} /px CSS ; par direction (energie,pic) {det}')
print('\n=== CONTROLE POSITIF : anneau laiton du medaillon du rang 1 ===')
# medaillon rang1 : centre CSS ~ (100.8, 302.8) ref ; a recalculer
for S,(cx,cy,r) in ((R,(100.8,302.8,35.5)),(C,(100.5,314.0,35.4))):
    e,det=energie_anneau(S,cx,cy,r)
    print(f'{S["nom"]}: centre ({cx},{cy}) r={r} -> energie {e:.1f} /px CSS ; {det}')
print('\n=== CONTROLE NEGATIF : aplat de feuille (pas d\'anneau) ===')
for S,(cx,cy,r) in ((R,(400.0,890.0,20.0)),(C,(400.0,890.0,20.0))):
    e,det=energie_anneau(S,cx,cy,r)
    print(f'{S["nom"]}: centre ({cx},{cy}) r={r} -> energie {e:.1f} /px CSS ; {det}')
