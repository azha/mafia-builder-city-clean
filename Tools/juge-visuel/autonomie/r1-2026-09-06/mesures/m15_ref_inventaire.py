# m15 — inventaire detaille de la REFERENCE (fiches des parties du LCD et du clavier).
from PIL import Image
ref=Image.open('../reference-1080x2102.png').convert('RGB'); px=ref.load()
print('OUVERT reference',ref.size)
LCD=(53,365,1026,1538); FOND=(17,31,12)
def ink(p,t=16): return max(abs(p[i]-FOND[i]) for i in range(3))>t
print('LCD x%d..%d y%d..%d  (w=%d h=%d)  = %.1f%% x %.1f%% de l ecran'%(LCD[0],LCD[1],LCD[2],LCD[3],
      LCD[2]-LCD[0]+1,LCD[3]-LCD[1]+1,100.0*(LCD[2]-LCD[0]+1)/1080,100.0*(LCD[3]-LCD[1]+1)/2102))
runs=[];cur=None
for y in range(LCD[1],LCD[3]+1):
    n=sum(1 for x in range(LCD[0],LCD[2]+1) if ink(px[x,y]))
    if n>3 and cur is None: cur=y
    elif n<=3 and cur is not None: runs.append((cur,y-1)); cur=None
if cur is not None: runs.append((cur,LCD[3]))
print('bandes d encre DANS le LCD :')
for a,b in runs:
    cs=[x for x in range(LCD[0],LCD[2]+1) if any(ink(px[x,y]) for y in range(a,b+1))]
    print('   y %4d..%4d h=%3d   x %4d..%4d'%(a,b,b-a+1,min(cs),max(cs)))
print()
print('--- densite d encre du LCD (part du LCD reellement occupee par du contenu) ---')
tot=0
for y in range(LCD[1],LCD[3]+1):
    tot+=sum(1 for x in range(LCD[0],LCD[2]+1) if ink(px[x,y]))
aire=(LCD[2]-LCD[0]+1)*(LCD[3]-LCD[1]+1)
print('   encre=%d / aire=%d = %.2f %%'%(tot,aire,100.0*tot/aire))
print('   -> la zone VIDE du LCD (sous les 2 messages, y ~760..1380) est VOULUE par la maquette')
