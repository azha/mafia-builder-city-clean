# Couleur des JETONS (tags) de la capture, et recherche du cadre (CSS : border 1px solid
# currentColor + radius 2px + padding 3px 5px -> une pastille encadree).
# Reference des valeurs (inline dans le HTML du cadre #68) :
#   EN PLACE #7fc99a (127,201,154) | DISPONIBLE #8d99a6 (141,153,166) | A VOS RISQUES #d9ab4e (217,171,78)
# Controle positif : la couleur du texte du titre de carte doit ressortir claire (#eef3f9).
# Controle negatif : une fenetre d aplat de carte doit rendre exactement (34,42,46).
from PIL import Image
import statistics as st
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
px=cap.load()
def bbox(x0,y0,x1,y1,fond=(34,42,46),d=18):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if max(abs(c[i]-fond[i]) for i in range(3))>d: xs.append(x); ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys)) if xs else None
def couleur_encre(x0,y0,x1,y1,fond=(34,42,46)):
    # le pixel le plus ELOIGNE du fond (coeur du glyphe), puis mediane des 40 plus eloignes
    cand=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            d=sum((c[i]-fond[i])**2 for i in range(3))
            cand.append((d,c))
    cand.sort(reverse=True)
    top=[c for _,c in cand[:40]]
    return (int(st.median([c[0] for c in top])),int(st.median([c[1] for c in top])),int(st.median([c[2] for c in top])))
def hx(c): return '#%02x%02x%02x'%tuple(c)
print('CONTROLE NEGATIF aplat carte (x 600..700, y 690..710) : bbox=',bbox(600,690,700,710))
print('CONTROLE POSITIF titre carte1 "Commis d office" encre =', hx(couleur_encre(90,700,420,740)), '  CSS .pl-choix .n b = #eef3f9')
print()
for nom,(x0,y0,x1,y1),attendu in [
    ('EN PLACE',       (780,690,1010,740), '#7fc99a'),
    ('DISPONIBLE',     (760,870,1010,920), '#8d99a6'),
    ('A VOS RISQUES',  (720,1050,1010,1100),'#d9ab4e')]:
    bb=bbox(x0,y0,x1,y1)
    enc=couleur_encre(x0,y0,x1,y1)
    print('%-15s bbox=%s  encre=%s %s   attendu CSS %s' % (nom,bb,enc,hx(enc),attendu))
print()
print('Recherche d un CADRE autour du jeton "EN PLACE" : profil horizontal y=705 (au dessus du texte) et vertical x=835')
print('  y=690..760 a x=835 :', [(y,px[835,y]) for y in range(690,700)])
print('  ligne y=712, x 770..1030, transitions :')
prev=None
for x in range(770,1035):
    c=px[x,712]
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>6:
        print('     x=%d %s'%(x,c)); prev=c
