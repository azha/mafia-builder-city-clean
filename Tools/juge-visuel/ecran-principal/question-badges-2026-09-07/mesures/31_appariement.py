# Appariement badge <-> masse batie, a partir des boites DECLAREES (lues a l'oeil, cf. overview-annote.png)
# et test de la maille : residus des 11 ancrages a la grille x=155.5+192i, y=552.5+192j.
from PIL import Image
import json,math
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
BAT=json.load(open('batiments.json'))
RING=[(1,347.5,552.5),(2,539.5,552.5),(3,731.5,552.5),(4,155.5,744.5),(5,347.5,744.5),
      (6,539.5,744.5),(7,923.5,744.5),(8,155.5,936.5),(9,539.5,936.5),(10,155.5,1320.5),(11,731.5,1320.5)]
ANCH={1:(347.5,573),2:(539.5,573),3:(731.5,573),4:(155.5,766),5:(347.5,765),6:(539.5,765),
      7:(923.5,765),8:(155.5,957),9:(539.5,957),10:(155.5,1343),11:(731.5,1341)}
print('\n=== TEST DE MAILLE : residus a x=155.5+192*i et y=552.5+192*j (centres d anneau) ===')
mx=my=0
for k,cx,cy in RING:
    i=round((cx-155.5)/192); j=round((cy-552.5)/192)
    rx=cx-(155.5+192*i); ry=cy-(552.5+192*j)
    mx=max(mx,abs(rx)); my=max(my,abs(ry))
    print(f'  G{k:<2d} centre=({cx},{cy})  colonne i={i} ligne j={j}  residu=({rx:+.1f},{ry:+.1f})')
print(f'  residu maximal : |dx|={mx:.1f} px, |dy|={my:.1f} px sur 11 badges')
xs=sorted({c for _,c,_ in RING}); ys=sorted({c for _,_,c in RING})
print(f'  abscisses distinctes : {xs} -> ecarts {[round(xs[i+1]-xs[i],1) for i in range(len(xs)-1)]}')
print(f'  ordonnees distinctes : {ys} -> ecarts {[round(ys[i+1]-ys[i],1) for i in range(len(ys)-1)]}')
def dist_box(px_,py_,box):
    x0,y0,x1,y1=box
    dx=max(x0-px_,0,px_-x1); dy=max(y0-py_,0,py_-y1)
    return math.hypot(dx,dy)
print('\n=== DISTANCE de chaque ancrage aux boites de masses batiees (0 = ancrage DANS la boite) ===')
for k in sorted(ANCH):
    ax,ay=ANCH[k]
    ds=sorted(((dist_box(ax,ay,b['box']),b['id'],b['nom']) for b in BAT))
    dedans=[t for t in ds if t[0]==0]
    s=' | '.join(f'{t[1]}={t[0]:.0f}' for t in ds[:3])
    print(f'  G{k:<2d} ancrage=({ax},{ay})  dans: {[t[1] for t in dedans] or "aucune"}   3 plus proches: {s}')
print('\n=== HAUTEUR RELATIVE : ancrage vs boite de la masse portante (test de l hypothese) ===')
PORT={1:'T1',2:'T2',3:'T3',4:'T5',5:'T7',6:'T8',7:'T10',8:'T11',9:'T8',10:None,11:'T16'}
for k in sorted(ANCH):
    ax,ay=ANCH[k]; t=PORT[k]
    if t is None: print(f'  G{k:<2d} aucune masse portante'); continue
    box=[b for b in BAT if b['id']==t][0]['box']
    top,bot=box[1],box[3]
    print(f'  G{k:<2d} sur {t} (haut={top}, bas={bot}, h={bot-top})  ancrage y={ay}  '
          f'au-dessus du bas: {bot-ay:+.0f} px  fraction depuis le haut: {(ay-top)/(bot-top):.2f}')
