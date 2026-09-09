# Geometrie interne d une carte de choix (capture) confrontee aux valeurs ECRITES par la CSS
# .parl6 .pl-choix{padding:8px 10px;border-radius:3px;margin-bottom:5px;border:1px}
# .pl-choix .n b{font:700 9px/1.1 'DejaVu Serif'} ; .n i{font:6.4px/1.25;margin-top:2px}
# Echelle du contenu : x3,6 des deux cotes (dossier).
# Controle positif : la meme sonde sur la REFERENCE doit retrouver .pl-item padding 5px x3,6=18 px
#   entre le bord de la boite et le haut de l encre du texte -> ~18 px.
# Controle negatif : une bande hors boite doit rendre "aucune encre".
from PIL import Image
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def bandes(im,x0,x1,y0,y1,fond,seuil=22):
    px=im.load(); out=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if abs(lum(px[x,y])-lum(fond))>seuil)
        if n>0:
            if cur is None: cur=y
        else:
            if cur is not None: out.append((cur,y-1)); cur=None
    if cur is not None: out.append((cur,y1-1))
    return out
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
print()
print('CONTROLE POSITIF reference item1 (boite y 961..1035) : bandes d encre du texte')
print('  ', bandes(ref,120,900,955,1040,(30,36,43)))
print('CONTROLE NEGATIF reference y 1400..1440 (hors boite) :', bandes(ref,120,900,1400,1440,(20,24,29)))
print()
for nom,(yb0,yb1) in [('carte1',(670,829)),('carte2',(851,1010)),('carte3',(1032,1190))]:
    b=bandes(cap,90,700,yb0-4,yb1+5,(34,42,46))
    print('%s boite y %d..%d (h=%d px = %.2f CSS)  bandes texte (colonne gauche) : %s'
          %(nom,yb0,yb1,yb1-yb0+1,(yb1-yb0+1)/3.6,b))
    if len(b)>=2:
        print('   padding haut = %d px (%.2f CSS) | interligne b->i = %d px | padding bas = %d px (%.2f CSS)'
              %(b[0][0]-yb0,(b[0][0]-yb0)/3.6, b[1][0]-b[0][1], yb1-b[-1][1], (yb1-b[-1][1])/3.6))
print()
print('CAPTURE : ecart entre cartes')
print('   carte1 bas 829 -> carte2 haut 851 : 22 px = %.2f CSS  (CSS margin-bottom 5px)'%(22/3.6))
print('   carte2 bas 1010 -> carte3 haut 1032 : 22 px = %.2f CSS'%(22/3.6))
print()
print('Interlettrage des TITRONS (letter-spacing CSS 1,5px = 5,4 px a x3,6)')
def glyphes(im,x0,x1,y0,y1,fond,seuil=22):
    px=im.load(); cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if abs(lum(px[x,y])-lum(fond))>seuil)
        cols.append(n>0)
    gr=[];cur=None
    for i,v in enumerate(cols):
        if v and cur is None: cur=i
        if not v and cur is not None: gr.append((x0+cur,x0+i-1)); cur=None
    if cur is not None: gr.append((x0+cur,x1-1))
    return gr
g=glyphes(ref,45,700,903,925,(23,27,32))
print('  REFERENCE titron "CE QU IL SAIT..." : %d groupes, x %d..%d, largeur %d px'%(len(g),g[0][0],g[-1][1],g[-1][1]-g[0][0]+1))
print('   ecarts entre groupes :', [g[i+1][0]-g[i][1]-1 for i in range(min(9,len(g)-1))])
g2=glyphes(cap,50,300,486,512,(13,13,13))
print('  CAPTURE titron "VOS AVOCATS" : %d groupes, x %d..%d, largeur %d px'%(len(g2),g2[0][0],g2[-1][1],g2[-1][1]-g2[0][0]+1))
print('   ecarts entre groupes :', [g2[i+1][0]-g2[i][1]-1 for i in range(min(9,len(g2)-1))])
