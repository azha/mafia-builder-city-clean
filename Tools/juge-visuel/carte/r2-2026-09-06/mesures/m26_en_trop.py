# m26 — BALAYAGE "EN TROP" : ou la CAPTURE est-elle plus CLAIRE que la maquette ? (elements ajoutes)
#       et ou est-elle plus SOMBRE ? (elements absents). Cellules de 24 px, mediane par cellule,
#       puis regroupement des cellules voisines en amas nommes par leur position.
#       But : ne rien manquer que je n'aurais pas cherche explicitement.
# CONTROLE POSITIF : les amas 'plus sombre' doivent contenir les elements deja identifies absents
#       (disque or, ecussons, lavis) ; s'ils ne les contiennent pas, l'instrument ne mesure pas ce que je crois.
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
S,TX,TY=1.0220,-12.0,8.0
def Y(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
C=24
cells={}
for ry in range(222,2076,C):
    for rx in range(14,1064,C):
        a=[];b=[];ok=True
        for dy in range(2,C-2,3):
            for dx in range(2,C-2,3):
                x,y=rx+dx,ry+dy
                cx=int(round(S*x+TX)); cy=int(round(S*y+TY))
                if not(0<=cx<1080 and 232<=cy<=2135): ok=False;break
                a.append(Y(RP[x,y])); b.append(Y(CP[cx,cy]))
            if not ok: break
        if ok and a: cells[(rx,ry)]=statistics.median(b)-statistics.median(a)
print("cellules :",len(cells))
vals=sorted(cells.values())
print(f"delta L par cellule : p01 {vals[int(len(vals)*.01)]:+.1f}  mediane {vals[len(vals)//2]:+.1f}  p99 {vals[int(len(vals)*.99)]:+.1f}")
def amas(pred,label):
    S_=set(k for k,v in cells.items() if pred(v))
    seen=set(); out=[]
    for k in S_:
        if k in seen: continue
        st=[k]; seen.add(k); g=[]
        while st:
            c=st.pop(); g.append(c)
            for dx in(-C,0,C):
                for dy in(-C,0,C):
                    n=(c[0]+dx,c[1]+dy)
                    if n in S_ and n not in seen: seen.add(n); st.append(n)
        xs=[c[0] for c in g]; ys=[c[1] for c in g]
        out.append((len(g),min(xs),min(ys),max(xs)+C,max(ys)+C,
                    round(statistics.median(cells[c] for c in g),1)))
    out.sort(reverse=True)
    print(f"\n{label} : {len(S_)} cellules, {len(out)} amas ; les 12 plus gros (aire en cellules de {C}x{C}) :")
    for n,x0,y0,x1,y1,m in out[:12]:
        print(f"   {n:4d} cellules  ref x {x0:4d}..{x1:4d} y {y0:4d}..{y1:4d}  delta median {m:+6.1f} L")
    return out
amas(lambda v: v>=12, "PLUS CLAIR en jeu (element AJOUTE / halo)")
amas(lambda v: v<=-12, "PLUS SOMBRE en jeu (element ABSENT)")
