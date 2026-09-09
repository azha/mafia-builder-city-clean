# m8 — decoupage de la CAPTURE : bandes et colonnes d encre dans le rect libre.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture', cap.size)
FOND=(13,13,13)
def ink(p,t=8): return max(abs(p[i]-FOND[i]) for i in range(3))>t
# exclure la colonne du manometre (chrome) x 400..680 pour les bandes
runs=[];cur=None
for y in range(143,700):
    n=sum(1 for x in range(cap.width) if not(400<=x<=680) and ink(px[x,y]))
    if n>15 and cur is None: cur=y
    elif n<=15 and cur is not None: runs.append((cur,y-1)); cur=None
if cur is not None: runs.append((cur,699))
print('bandes d encre (hors colonne manometre), y143..700 :')
for a,b in runs: print('   y %4d..%4d h=%3d'%(a,b,b-a+1))
print()
def cols(a,b,label):
    cs=[x for x in range(cap.width) if any(ink(px[x,y]) for y in range(a,b+1))]
    if not cs: print('  %s: rien'%label); return
    seg=[];cur=None;prev=None
    for x in cs:
        if cur is None: cur=x
        elif x-prev>6: seg.append((cur,prev)); cur=x
        prev=x
    seg.append((cur,prev))
    print('  %-26s x %4d..%4d (w=%d)  segments=%s'%(label,min(cs),max(cs),max(cs)-min(cs)+1,seg[:8]))
for a,b in runs: cols(a,b,'bande %d..%d'%(a,b))
print()
# bordure du panneau exterieur : chercher le cadre de la carte COOK
print('--- profil de la ligne y=250 (dans la carte) : x ou la couleur change ---')
prev=None
for x in range(270,820):
    c=px[x,250]
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>6:
        print('   x=%4d %s'%(x,str(c)))
    prev=c
