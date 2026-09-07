# La valeur ARGENT est-elle COUPEE par le medaillon ? On separe par TEINTE :
#   or  = R>150, G>110, B<130, |R-G|<90 et B nettement < G   (chiffres)
#   braise = R>150, G<140, B<120 et (G-B)<45                  (anneau)
# Controle positif : les chiffres "9 627 820,00" doivent sortir en OR sur toute leur largeur.
# Controle negatif : la bande y=200..210 (sous le filet) ne doit rendre aucun pixel OR
#   sauf le losange (x~445..465).
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
px=cap.load()
def est_or(c):
    r,g,b=c; return r>150 and g>110 and b<140 and (g-b)>25 and (r-g)<90
def est_braise(c):
    r,g,b=c; return r>150 and g<150 and (r-g)>60 and (r-b)>60
cols_or={}; cols_br={}
for y in range(50,110):
    for x in range(120,620):
        c=px[x,y]
        if est_or(c): cols_or[x]=cols_or.get(x,0)+1
        elif est_braise(c): cols_br[x]=cols_br.get(x,0)+1
xo=sorted(cols_or); xb=sorted(cols_br)
print('OR      : x %d..%d  (%d colonnes)'%(min(xo),max(xo),len(xo)))
print('BRAISE  : x %d..%d  (%d colonnes)'%(min(xb),max(xb),len(xb)))
print('dernieres colonnes OR :', xo[-25:])
print('premieres colonnes BRAISE :', xb[:12])
# la barre doree sous la valeur
bar=[x for x in range(120,700) for y in range(115,125) if est_or(px[x,y])]
print('barre doree sous ARGENT : x %d..%d = %d px (%.1f CSS)'%(min(bar),max(bar),max(bar)-min(bar)+1,(max(bar)-min(bar)+1)/(1080/392.0)))
print()
print('CONTROLE NEGATIF y=200..212 :')
n=[x for y in range(200,213) for x in range(120,900) if est_or(px[x,y])]
print('   pixels or :', (min(n),max(n),len(set(n))) if n else 'aucun')
print()
# le glyphe EURO : colonnes or les plus a droite, groupees
groupes=[];cur=[xo[0]]
for a,b in zip(xo,xo[1:]):
    if b-a<=3: cur.append(b)
    else: groupes.append((cur[0],cur[-1])); cur=[b]
groupes.append((cur[0],cur[-1]))
print('groupes de colonnes OR (glyphes) :', groupes)
