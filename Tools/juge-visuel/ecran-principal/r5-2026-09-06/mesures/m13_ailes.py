# Grandeur : etendue horizontale des deux ailes du bandeau + debordement hors ecran.
# Controle positif : REF aile droite doit finir a 374,7 CSS (r3 grandeur 26) et aile gauche commencer a 17 CSS (mesure-canon .aile.gauche x=17).
from txt import *
def ligne_encre(im,box,scale,label,seuil=25):
    cols,base=colonnes(im,box,seuil)
    segs=segments(cols,gap=8,minw=2)
    if not segs: print(f'  {label}: RIEN (fond L={base:.0f})'); return None
    x0,x1=segs[0][0],segs[-1][1]
    ys=[y for x,yy in cols for y in yy]
    print(f'  {label}: encre x {x0}..{x1} px = {x0/scale:7.2f}..{(x1+1)/scale:7.2f} CSS (largeur {(x1-x0+1)/scale:6.2f}) ; y {min(ys)}..{max(ys)} = {min(ys)/scale:6.2f}..{(max(ys)+1)/scale:6.2f} CSS ; capitale {(max(ys)-min(ys)+1)/scale:5.2f} CSS')
    print(f'      touche le bord DROIT de l image ? x1={x1} / largeur {im.width-1} -> {"OUI" if x1>=im.width-2 else "non"} ; bord GAUCHE ? x0={x0} -> {"OUI" if x0<=1 else "non"}')
    return x0,x1
r=op(REF)
print(' -- REFERENCE --')
ligne_encre(r,(0,110,470,145),REF_S,'REF label ARGENT (y 36.7-48.3)')
ligne_encre(r,(0,60,470,110),REF_S,'REF valeur argent')
ligne_encre(r,(700,110,1176,145),REF_S,'REF label JOUR ..')
ligne_encre(r,(700,60,1176,110),REF_S,'REF valeur heure')
print(' -- CAP2400 district --')
c=op(C24)
ligne_encre(c,(0,30,500,70),CAP_S,'CAP label ARGENT')
ligne_encre(c,(0,70,500,140),CAP_S,'CAP valeur argent')
ligne_encre(c,(640,30,1080,70),CAP_S,'CAP label JOUR')
ligne_encre(c,(640,70,1080,140),CAP_S,'CAP valeur jour')
print(' -- TEMOIN famille --')
t=op(T24)
ligne_encre(t,(0,30,500,70),CAP_S,'TEMOIN label ARGENT')
ligne_encre(t,(0,60,500,130),CAP_S,'TEMOIN valeur argent')
ligne_encre(t,(640,20,1080,60),CAP_S,'TEMOIN label droite')
ligne_encre(t,(640,60,1080,130),CAP_S,'TEMOIN valeur droite')
