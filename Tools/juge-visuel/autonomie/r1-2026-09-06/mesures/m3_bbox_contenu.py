# m3 — bbox de l'ENCRE dans le rect libre (entre bandeau et dock) — capture.
# "encre" = pixel dont l'ecart max-canal au fond de reference depasse un seuil.
from PIL import Image
cap = Image.open('../capture-1080x2400.png').convert('RGB')
print('OUVERT capture', cap.size)
TOP, BOT = 143, 2179      # mesures m1/m2
FOND = (13,14,17)         # medians mesures a x20..80
SEUIL = 10

def ink(p):
    return max(abs(p[0]-FOND[0]),abs(p[1]-FOND[1]),abs(p[2]-FOND[2])) > SEUIL

px = cap.load()
rows=[]; cols=[0]*cap.width
for y in range(TOP,BOT):
    n=0
    for x in range(cap.width):
        if ink(px[x,y]):
            n+=1; cols[x]+=1
    rows.append((y,n))
tot=sum(n for _,n in rows)
aire=(BOT-TOP)*cap.width
print('RECT LIBRE capture: y[%d,%d) h=%d  aire=%d px' % (TOP,BOT,BOT-TOP,aire))
print('ENCRE totale = %d px  => densite = %.3f %%' % (tot, 100.0*tot/aire))

ys=[y for y,n in rows if n>0]
print('bbox vertical de l encre: y %d .. %d  (h=%d)' % (min(ys),max(ys),max(ys)-min(ys)+1))
xs=[x for x,n in enumerate(cols) if n>0]
print('bbox horizontal de l encre: x %d .. %d  (w=%d)' % (min(xs),max(xs),max(xs)-min(xs)+1))

# derniere ligne portant de l encre en excluant le manometre (disque chrome, x 400..680)
rows2=[]
for y in range(TOP,BOT):
    n=sum(1 for x in range(cap.width) if not (400<=x<=680) and ink(px[x,y]))
    rows2.append((y,n))
ys2=[y for y,n in rows2 if n>0]
print('hors colonne du manometre (x 400..680): y %d .. %d' % (min(ys2),max(ys2)))
print('  -> hauteur occupee = %d px sur %d dispo = %.1f %%' % (max(ys2)-min(ys2)+1, BOT-TOP, 100.0*(max(ys2)-min(ys2)+1)/(BOT-TOP)))

print('\n--- profil: premieres/dernieres lignes non vides (hors manometre) ---')
nz=[(y,n) for y,n in rows2 if n>0]
for y,n in nz[:5]: print('   y=%4d n=%4d'%(y,n))
print('   ...')
for y,n in nz[-5:]: print('   y=%4d n=%4d'%(y,n))
