# 1) .pl-rien : la maquette pose border-left:2px solid #3b4650 + padding 8px 10px.
#    Controle positif : la reference n a pas de .pl-rien dans le cadre #67 -> on controle
#    l instrument sur un filet CONNU : le border-top 2px #2c3640 de .pl-bas (y=1745..1751).
# 2) le losange dore sous le medaillon de la capture : bbox et couleur.
# 3) "La filiere" en gras dans le paragraphe ? (source #68 : La <b>filiere</b> fait classer)
from PIL import Image
import statistics as st
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
pr=ref.load(); pc=cap.load()
print()
print('1a) CONTROLE POSITIF filet .pl-bas de la reference, colonne x=600 :')
print('   ', [(y,pr[600,y]) for y in range(1743,1755)])
print('1b) CAPTURE, colonne balayee a gauche du paragraphe filiere (y 1216..1279), x 40..70 :')
for x in range(40,72,2):
    col=[pc[x,y] for y in range(1216,1280)]
    print('    x=%2d  max=%s  distinct=%d'%(x,max(col,key=lum),len(set(col))))
print()
print('2) losange dore : bbox des pixels dores dans y 205..245')
xs=[];ys=[]
for y in range(200,250):
    for x in range(300,800):
        c=pc[x,y]
        if c[0]>110 and c[0]-c[2]>40: xs.append(x); ys.append(y)
if xs:
    print('   x %d..%d  y %d..%d  (%dx%d px)  couleur au centre = %s'
          %(min(xs),max(xs),min(ys),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,
            pc[(min(xs)+max(xs))//2,(min(ys)+max(ys))//2]))
print()
print('3) "La filiere" en gras ? epaisseur de trait du L initial vs un L du meme paragraphe')
# largeur des fûts verticaux sur la premiere ligne du paragraphe
def futs(y0,y1,x0,x1,fond=(13,13,13),seuil=30):
    runs=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if abs(lum(pc[x,y])-lum(fond))>seuil)
        runs.append(1 if n>=8 else 0)
    out=[];cur=0
    for v in runs:
        if v: cur+=1
        else:
            if cur: out.append(cur); cur=0
    if cur: out.append(cur)
    return out
print('   fûts de "La filière fait classer" (y 1218..1245, x 55..600) :', futs(1218,1245,55,600))
print('   fûts de la 2e ligne "gens qui, un jour" (y 1252..1280, x 55..600) :', futs(1252,1280,55,600))
