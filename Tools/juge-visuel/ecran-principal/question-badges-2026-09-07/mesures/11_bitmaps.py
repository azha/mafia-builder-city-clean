# Bitmaps binaires du libelle, en repere RELATIF au centre du badge (dx -50..50, dy 13..24).
# 1) controle : G4/G8/G11 doivent etre quasi identiques (meme libelle, fond different).
# 2) test : G1 == OU(Commerce-ecran, X) pour X parmi les autres libelles ?
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
B={1:(347.5,552.5),2:(539.5,552.5),3:(731.5,552.5),4:(155.5,744.5),5:(347.5,744.5),
   6:(539.5,744.5),7:(923.5,744.5),8:(155.5,936.5),9:(539.5,936.5),
   10:(155.5,1320.5),11:(731.5,1320.5)}
NOM={1:'?superpose?',2:'Laboratoire',3:'Cache',4:'Commerce-ecran',5:'Serre',6:'Point de vente',
     7:'Planque',8:'Commerce-ecran',9:'Planque',10:'Commerce-ecran',11:'Commerce-ecran'}
DX=range(-50,51); DY=range(13,25)
def bm(k):
    cx,cy=B[k]; X0=int(round(cx)); Y0=int(cy)
    s=set()
    for dy in DY:
        for dx in DX:
            x,y=X0+dx,Y0+dy
            if not(0<=x<W and 0<=y<H): continue
            r,g,b=px[x,y]
            if min(r,g,b)>=150 and (max(r,g,b)-min(r,g,b))<=25: s.add((dx,dy))
    return s
BM={k:bm(k) for k in B}
for k in B: print(f'  G{k:<2d} {NOM[k]:<16s} px={len(BM[k])}')
def J(a,b): return len(a&b)/max(1,len(a|b))
print('\n[CONTROLE POSITIF] trois "Commerce-ecran" entre eux (Jaccard sur bitmap) :')
for p in [(4,8),(4,11),(8,11)]: print(f'   G{p[0]} vs G{p[1]} : J={J(BM[p[0]],BM[p[1]]):.3f}')
print('[CONTROLE NEGATIF] libelles differents :')
for p in [(2,3),(2,5),(3,5),(2,8),(7,8)]: print(f'   G{p[0]} vs G{p[1]} : J={J(BM[p[0]],BM[p[1]]):.3f}')
print('\n[TEST G1] G1 contre "Commerce-ecran" seul, puis contre OU(Commerce, X) :')
COM = BM[4] & BM[8]   # intersection des deux plus propres = gabarit robuste
print(f'   gabarit COM = G4 inter G8 : {len(COM)} px')
print(f'   G1 vs COM seul                 : J={J(BM[1],COM):.3f}  (G1 a {len(BM[1]-COM)} px hors COM)')
for k in [2,3,5,7,9,6]:
    u=COM|BM[k]
    print(f'   G1 vs OU(COM, G{k} {NOM[k]:<15s}): J={J(BM[1],u):.3f}   reste_G1={len(BM[1]-u):3d}  manque={len(u-BM[1]):3d}')
print('\n[TEST G10] meme chose (fond clair a droite -> pollution attendue) :')
print(f'   G10 vs COM seul : J={J(BM[10],COM):.3f}  hors COM={len(BM[10]-COM)}  manque={len(COM-BM[10])}')
print('   G10 restreint aux colonnes dx<=-12 (fond sombre) :')
a={p for p in BM[10] if p[0]<=-12}; b={p for p in COM if p[0]<=-12}
print(f'      J={J(a,b):.3f}  ({len(a)} vs {len(b)} px)')
print('\n[TEST G6 / G9] fonds pollues :')
for k in (6,9):
    print(f'   G{k} px={len(BM[k])}')
