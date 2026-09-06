# r10-m11 : masques du buste dans la carte .prt (repere CADRE).
#  peau  : r>150,g>140,b>110, r>b+20, r-g<40      (visage + cou)
#  creme : r>205,g>198,b>168                      (col)
#  encre : r<32,g<32,b<32                         (coiffe + torse + trait)
# Controle positif : chaque masque doit etre NON VIDE des deux cotes ; le fond de carte
#  (17,24,35)/(13,22,34) ne doit tomber dans AUCUN des trois (verifie explicitement).
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080)),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074))}
def peau(p): r,g,b=p; return r>150 and g>140 and b>110 and r>b+20 and (r-g)<40
def creme(p): r,g,b=p; return r>205 and g>198 and b>168
def encre(p): r,g,b=p; return r<32 and g<32 and b<32
MASK={"peau":peau,"creme":creme,"encre":encre}
print("controle positif : fond de carte classe ?",
      {n:(f((17,24,35)),f((13,22,34))) for n,f in MASK.items()})
DATA={}
for k,(p,x0,y0,(cu0,cv0,cu1,cv1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n{k} taille={im.size}  carte u[{cu0},{cu1}] v[{cv0},{cv1}]  ({cu1-cu0}x{cv1-cv0})")
    D_={}
    for n,f in MASK.items():
        pts=[(u,v) for v in range(cv0+3,cv1-2) for u in range(cu0+3,cu1-2) if f(px[x0+u,y0+v])]
        us=[a for a,_ in pts]; vs=[b for _,b in pts]
        D_[n]=pts
        print(f"   {n:6s} n={len(pts):6d}  u[{min(us)},{max(us)}] v[{min(vs)},{max(vs)}]  "
              f"l={max(us)-min(us)+1} h={max(vs)-min(vs)+1}  centre_u={sum(us)/len(us):.1f}")
    DATA[k]=(D_,(cu0,cv0,cu1,cv1))
import pickle; pickle.dump({k:(  {n:v for n,v in d.items()}, c) for k,(d,c) in DATA.items()}, open("/tmp/buste.pkl","wb"))
