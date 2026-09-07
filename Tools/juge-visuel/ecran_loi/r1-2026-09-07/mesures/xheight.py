# x-height ROBUSTE : pour chaque colonne d encre, on note le premier y (haut) et le dernier y (bas).
# Le MODE des hauts = ligne d x-height ; le MODE des bas = ligne de base. Les ascendantes et
# jambages sont minoritaires et n influencent pas le mode.
# Controle positif : sur la REFERENCE, .pl-qui i est 6,6 CSS ; DejaVu Sans x-height = 0,545 em
#   -> attendu 6,6*3,6*0,545 = 12,9 px (+ frange). Controle negatif : appliquer la sonde a une
#   bande de FOND doit rendre "aucune colonne".
from PIL import Image
from collections import Counter
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def xh(im,x0,x1,y0,y1,fond,seuil=25,nom=''):
    px=im.load(); hauts=[];bas=[];n=0
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if abs(lum(px[x,y])-lum(fond))>seuil]
        if ys: hauts.append(min(ys)); bas.append(max(ys)); n+=1
    if not hauts: print('  %-38s AUCUNE COLONNE'%nom); return None
    mh=Counter(hauts).most_common(3); mb=Counter(bas).most_common(3)
    x_h=mb[0][0]-mh[0][0]+1
    print('  %-38s colonnes=%3d  mode(haut)=%d(%d)  mode(bas)=%d(%d)  x-height=%d px'
          %(nom,n,mh[0][0],mh[0][1],mb[0][0],mb[0][1],x_h))
    return x_h
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('CONTROLE NEGATIF :'); xh(ref,700,900,1450,1500,(20,24,29),nom='fond de panneau')
print()
print('=== REFERENCE ===')
r1=xh(ref,262,860,730,768,(33,40,48),nom='.pl-qui i  (CSS 6,6)')
r2=xh(ref,50,845,535,572,(26,31,38),nom='.pl-tete p (CSS 7,0)')
r3=xh(ref,130,900,980,1015,(30,36,43),nom='.pl-item span (CSS 7,6)')
r4=xh(ref,50,1010,1770,1820,(20,26,33),nom='.pl-dit (CSS 8,6 italique serif)')
print()
print('=== CAPTURE ===')
c1=xh(cap,93,700,762,808,(34,42,46),nom='carte .n i (CSS 6,4)')
c2=xh(cap,55,945,400,442,(13,13,13),nom='sous-titre ecran (CSS 7,0)')
c3=xh(cap,55,1025,1210,1248,(13,13,13),nom='.pl-rien l.1 (CSS 6,9)')
c4=xh(cap,55,455,1372,1410,(13,13,13),nom='"Aucune affaire en cours."')
c5=xh(cap,55,680,530,575,(13,13,13),nom='"Vous n avez encore engage..."')
c6=xh(cap,55,910,1422,1458,(13,13,13),nom='"Une affaire nait d une descente"')
print()
K=0.545*3.6
print('taille implicite (x-height / 0,545 / 3,6) en CSS :')
for nom,v,css in [('ref .pl-qui i',r1,6.6),('ref .pl-tete p',r2,7.0),('ref .pl-item span',r3,7.6),
                  ('cap carte .n i',c1,6.4),('cap sous-titre',c2,7.0),('cap .pl-rien',c3,6.9),
                  ('cap "Aucune"',c4,None),('cap "Vous n avez"',c5,None),('cap "Une affaire"',c6,None)]:
    if v: print('   %-22s x-h=%2d px -> %.2f CSS   (CSS ecrit %s)'%(nom,v,v/K,css))
