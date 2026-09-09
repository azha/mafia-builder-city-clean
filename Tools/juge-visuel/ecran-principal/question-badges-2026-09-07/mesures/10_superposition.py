# Est-ce que G1 (et G10) portent DEUX libelles superposes ?
# Methode : profil de colonnes d'encre, en coordonnees RELATIVES au centre du badge
# (tous les libelles sont centres sur le badge -> comparables).
# Controle positif : G4 vs G8 vs G11, tous "Commerce-ecran" -> doivent se ressembler.
# Controle negatif : G2 "Laboratoire" vs G8 -> doivent differer.
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
BADGES={1:(347.5,552.5),2:(539.5,552.5),3:(731.5,552.5),4:(155.5,744.5),5:(347.5,744.5),
        6:(539.5,744.5),7:(923.5,744.5),8:(155.5,936.5),9:(539.5,936.5),
        10:(155.5,1320.5),11:(731.5,1320.5)}
def encre(x,y):
    r,g,b=px[x,y]
    return min(r,g,b)>=150 and (max(r,g,b)-min(r,g,b))<=25
prof={}
for k,(cx,cy) in BADGES.items():
    y0=int(cy)+13; y1=int(cy)+25
    p={}
    for dx in range(-60,61):
        x=int(cx-0.5)+dx if False else int(round(cx))+dx
        if not (0<=x<W): p[dx]=0; continue
        p[dx]=sum(1 for y in range(y0,y1) if encre(x,y))
    prof[k]=p
def show(k):
    p=prof[k]
    s=''.join('#' if p[dx]>=3 else ('+' if p[dx]>=1 else '.') for dx in range(-45,46))
    print(f'  G{k:<2d} |{s}|  total={sum(p.values())}')
print('profils d\'encre, dx de -45 a +45 (# >=3px, + 1-2px, . 0) :')
for k in sorted(BADGES): show(k)
def jac(a,b):
    A={dx for dx in range(-60,61) if prof[a][dx]>=1}
    B={dx for dx in range(-60,61) if prof[b][dx]>=1}
    return len(A&B)/max(1,len(A|B)), len(A), len(B)
print('\nrecouvrement de colonnes (Jaccard) :')
for pair in [(4,8),(4,11),(8,11),(2,8),(1,8),(1,4),(1,11),(10,8),(10,4),(1,2),(1,3),(1,5),(1,7)]:
    j,na,nb=jac(*pair); print(f'  G{pair[0]} vs G{pair[1]} : J={j:.2f}  (colonnes {na} vs {nb})')
print('\nSURPLUS d\'encre de G1 par rapport a la mediane des "Commerce-ecran" propres (G4,G8,G11) :')
for dx in range(-40,41):
    med=sorted([prof[4][dx],prof[8][dx],prof[11][dx]])[1]
    d=prof[1][dx]-med
    if d>0: print(f'   dx={dx:+4d}  G1={prof[1][dx]:2d}  med(Com)={med:2d}  surplus=+{d}')
