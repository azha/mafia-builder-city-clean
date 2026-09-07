# m06c — REFERENCE : titre "La vente" isole (y495..578), sous-titre echantillonne, ligne laiton.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT', im.size)
def est_or(p):
    r,g,b=p; return r>120 and g>90 and b<150 and (r-b)>45 and (r-g)>=8 and (g-b)>20
xs=[];ys=[]
for y in range(495,580):
    for x in range(60,1020):
        if est_or(px[x,y]): xs.append(x);ys.append(y)
print('TITRE "La vente" : %d px or  bbox=(%d,%d,%d,%d)  h=%d px (%.2f CSS)  w=%d px (%.1f CSS)  centre_x=%.1f'%(
  len(xs),min(xs),min(ys),max(xs),max(ys),max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/3.6,max(xs)-min(xs)+1,(max(xs)-min(xs)+1)/3.6,(min(xs)+max(xs))/2))
L=[y for y in range(495,580) if any(est_or(px[x,y]) for x in range(min(xs),min(xs)+24))]
print('  CAPITALE "L" (x %d..%d) : y=%d..%d  h=%d px (%.2f CSS)'%(min(xs),min(xs)+24,min(L),max(L),max(L)-min(L)+1,(max(L)-min(L)+1)/3.6))
# couleur du titre (mediane des px les plus clairs du coeur des fûts)
cands=[px[x,y] for y in range(min(L)+4,max(L)-4) for x in range(min(xs),max(xs)) if est_or(px[x,y])]
cands.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2])
print('  couleur titre (mediane des px or) =',cands[len(cands)//2],' (jeton attendu #f2c96b = (242,201,107))')
# sous-titre : bande y 585..615
sub=[(x,y) for y in range(585,618) for x in range(60,1020) if 0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2] > 90]
print('  SOUS-TITRE bbox x=%d..%d y=%d..%d  h=%d px (%.2f CSS)'%(min(s[0] for s in sub),max(s[0] for s in sub),min(s[1] for s in sub),max(s[1] for s in sub),max(s[1] for s in sub)-min(s[1] for s in sub)+1,(max(s[1] for s in sub)-min(s[1] for s in sub)+1)/3.6))
cs=[px[x,y] for x,y in sub]; cs.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2])
print('  couleur sous-titre (mediane) =',cs[len(cs)//2],' (jeton attendu #b9ad92 = (185,173,146))')
# enseigne : bord et fond
print('  fond enseigne (mediane 100x30 @ x120 y500) =', sorted([px[x,y] for y in range(495,525) for x in range(120,220)],key=lambda p:sum(p))[1500//2])
print('  ligne laiton bas enseigne : y=640..646 rgb=%s (jeton #b08d3e = (176,141,62))'%(str(px[540,643]),))
