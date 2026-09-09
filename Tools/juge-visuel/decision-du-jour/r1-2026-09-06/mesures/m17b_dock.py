#!/usr/bin/env python3
"""m17b - DOCK : icone dans les pastilles d'onglet. 1er jet : la detection de disques a rendu 2/0
(instrument refute par son propre controle). Ici : on localise chaque disque par son ANNEAU
(ligne passant par les centres -> segments clairs), puis on compte l'encre au coeur.
Controle positif : 4 disques trouves de chaque cote, et le canon rend une icone sur les 4.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON='/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png'
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
can = Image.open(CANON).convert('RGB')
print(f"[CAP] {cap.size}  [CANON] {can.size}")

def anneaux(im,y,x0,x1,label):
    """sur la ligne y (qui coupe les disques en leur milieu), les traits de l'anneau apparaissent
       comme des pics locaux ; on cherche les paires gauche/droite."""
    px=im.load()
    lv=[L(px[x,y]) for x in range(x0,x1)]
    base=sorted(lv)[len(lv)//4]
    pics=[i+x0 for i,v in enumerate(lv) if v>base+12]
    grp=[];cur=[pics[0]] if pics else []
    for p in pics[1:]:
        if p-cur[-1]<=3: cur.append(p)
        else: grp.append(cur); cur=[p]
    if cur: grp.append(cur)
    xs=[sum(g)//len(g) for g in grp]
    print(f"[{label}] y={y} : {len(xs)} traits d'anneau a x={xs}")
    centres=[]
    for i in range(0,len(xs)-1,2):
        centres.append(((xs[i]+xs[i+1])//2, (xs[i+1]-xs[i])//2))
    print(f"    -> {len(centres)} disques (centre_x, rayon) = {centres}")
    return centres

def icone(im,cx,cy,r,seuil,label,i):
    px=im.load(); n=0; tot=0
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            if (x-cx)**2+(y-cy)**2<=r*r:
                tot+=1
                if L(px[x,y])>seuil: n+=1
    print(f"   {label} onglet {i} : coeur r={r} en ({cx},{cy}) -> {n}/{tot} px clairs (lum>{seuil}) = {n/tot*100:5.2f}%")
    return n/tot*100

print("\n== CANON (temoin designe par le dossier) ==")
cc=anneaux(can,1920,150,1050,'CANON')
print("== CAPTURE ==")
cp=anneaux(cap,2238,120,1000,'CAP')

print("\n-- encre au coeur du disque (rayon 55% du rayon du disque) --")
print("[CANON] CONTROLE POSITIF : une icone blanche doit remplir plusieurs % du coeur")
vc=[icone(can,cx,1920,int(r*0.55),150,'[CANON]',i+1) for i,(cx,r) in enumerate(cc)]
print("[CAP]")
vp=[icone(cap,cx,2238,int(r*0.55),110,'[CAP]',i+1) for i,(cx,r) in enumerate(cp)]
print(f"\n  CANON : icone (>1% de px clairs) sur {sum(1 for v in vc if v>1.0)}/{len(vc)} onglets"
      f" -> {'OK' if len(vc)==4 and all(v>1.0 for v in vc) else 'controle incomplet'}")
print(f"  CAP   : icone (>1% de px clairs) sur {sum(1 for v in vp if v>1.0)}/{len(vp)} onglets")
