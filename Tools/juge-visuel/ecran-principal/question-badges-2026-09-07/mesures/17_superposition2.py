# Combien de libelles sur G1 ? test 1, 2 et 3 libelles. Et G7 vs G9 (deux "Planque").
from PIL import Image
import itertools
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
B={1:(347.5,552.5),2:(539.5,552.5),3:(731.5,552.5),4:(155.5,744.5),5:(347.5,744.5),
   6:(539.5,744.5),7:(923.5,744.5),8:(155.5,936.5),9:(539.5,936.5),
   10:(155.5,1320.5),11:(731.5,1320.5)}
NOM={2:'Laboratoire',3:'Cache',5:'Serre',7:'Planque',9:'Planque',6:'Point de vente'}
def bm(k, cols=None):
    cx,cy=B[k]; X=int(round(cx)); Y=int(cy); s=set()
    for dy in range(13,25):
        for dx in range(-50,51):
            if cols and dx not in cols: continue
            x,y=X+dx,Y+dy
            if not(0<=x<W and 0<=y<H): continue
            r,g,b=px[x,y]
            if min(r,g,b)>=150 and (max(r,g,b)-min(r,g,b))<=25: s.add((dx,dy))
    return s
BM={k:bm(k) for k in B}
def J(a,b): return len(a&b)/max(1,len(a|b))
COM=BM[4]&BM[8]
print(f'gabarit COM (G4 inter G8) = {len(COM)} px ; plancher de controle meme-libelle J=0.890..0.926')
print('\nG1 = COM + combien de libelles ?')
print(f'  1 libelle  : COM seul                    J={J(BM[1],COM):.3f}  inexplique={len(BM[1]-COM)}')
best=[]
for k in [2,3,5,7,9]:
    u=COM|BM[k]; best.append((J(BM[1],u),f'COM+G{k}({NOM[k]})',len(BM[1]-u)))
for a,b in itertools.combinations([2,3,5,7,9],2):
    u=COM|BM[a]|BM[b]; best.append((J(BM[1],u),f'COM+G{a}+G{b}',len(BM[1]-u)))
best.sort(reverse=True)
for j,nom,rest in best[:8]: print(f'  {nom:34s} J={j:.3f}  inexplique={rest}')
print('\nG7 vs G9 (les deux "Planque", fonds tres differents) :')
print(f'  J global = {J(BM[7],BM[9]):.3f}  ({len(BM[7])} vs {len(BM[9])} px)')
print(f'  G9 inclus dans G7 ? {len(BM[9]-BM[7])} px de G9 hors de G7')
print('\nlargeur de colonnes occupees par libelle (dx min..max, nb colonnes) :')
for k in sorted(B):
    cols=sorted({p[0] for p in BM[k]})
    # groupe principal
    gr=[[cols[0]]]
    for c in cols[1:]:
        if c-gr[-1][-1]<=6: gr[-1].append(c)
        else: gr.append([c])
    g=max(gr,key=len)
    print(f'  G{k:<2d} dx {g[0]:+4d}..{g[-1]:+4d}  ({len(g)} colonnes)  total_px={len(BM[k])}')
