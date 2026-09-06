# m14 — les 4 noms que le m13 n'a pas apparies, avec des fenetres de REFERENCE lues sur l'image
#       (crops mesures/r_*.png). Memes conventions que m13.
#   SARNES / PONT-GRIS : fenetre derivee du recalage legerement decalee -> corrigee a la main.
#   LA CHANCELLERIE   : la fenetre attrapait le PIED DE PAGE italique (mesure 0,13 deg = horizontal) -> y borne a 1952.
#   LA LISIERE        : dans la reference c'est le quartier "chez vous" -> encre OR (#f2c96b, r-b=135) et
#                       font-size 7,4 au lieu de 6,6 (regle .q.mien .nomq). Filtre d'encre elargi pour ce seul mot,
#                       et l'ecart de COULEUR/TAILLE y est un ASSUME (aucune cle du back ne dit quel district est le mien).
from PIL import Image
import os, math, statistics, json
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); M=os.path.join(D,"mesures")
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
def mk(rbmax):
    def enc(p):
        R,G,B=p; L=0.2126*R+0.7152*G+0.0722*B
        return L>110 and 10<=(R-B)<=rbmax and G>100
    return enc
def analyse(px,W,H,box,encf):
    x0,y0,x1,y1=[max(0,box[0]),max(0,box[1]),min(W-1,box[2]),min(H-1,box[3])]
    ps=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if encf(px[x,y])]
    if len(ps)<110: return None
    cols={}
    for x,y in ps: cols.setdefault(x,[]).append(y)
    ks=sorted(k for k in cols if (max(cols[k])-min(cols[k])+1)>=11)
    if len(ks)<20: return None
    P=[(k,max(cols[k])) for k in ks]
    n=len(P);mx=sum(p[0] for p in P)/n;my=sum(p[1] for p in P)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in P);sxx=sum((p[0]-mx)**2 for p in P)
    a=sxy/sxx if sxx else 0
    hs=[]
    for i in range(0,len(ks)-7,4):
        sl=[y for k in ks[i:i+8] for y in cols[k]];hs.append(max(sl)-min(sl)+1)
    hs.sort()
    allk=sorted(cols);tr=[allk[i]-allk[i-1]-1 for i in range(1,len(allk)) if allk[i]-allk[i-1]-1>0]
    ti=[g for g in tr if g<=18]
    lum=sorted(((0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2],x,y) for x,y in ps),reverse=True)
    top=lum[:max(8,len(lum)//7)]
    e=[int(statistics.median([px[x,y][k] for _,x,y in top])) for k in range(3)]
    return {"ang":round(math.degrees(math.atan(a)),2),"hcap":hs[len(hs)//2],"larg":allk[-1]-allk[0]+1,
            "trou":round(statistics.median(ti),1) if ti else 0,"encre":e,"npx":len(ps)}
CAS=[("SARNES",           (840,430,985,480),   (861,447,985,510),  -10, 95),
     ("PONT-GRIS",        (795,1875,995,1930), (820,1922,990,1996), -7, 95),
     ("LA CHANCELLERIE",  (18,1855,325,1952),  (41,1918,285,2033), 18, 95),
     ("LA LISIERE",       (800,1595,1010,1660),(838,1648,1009,1714),-7,150)]
print(f"{'nom':18s}{'src':>5}|{'REFang':>8}{'CAPang':>8}{'d':>7}|{'REFhc':>6}{'CAPhc':>6}|{'REFlg':>6}{'CAPlg':>6}{'x':>6}|{'REFtr':>6}{'CAPtr':>6}| encre REF        encre CAP")
out=[]
for nom,rb,cb,src,rbmax in CAS:
    mr=analyse(RP,1080,2102,rb,mk(rbmax)); mc=analyse(CP,1080,2400,cb,mk(95))
    if not mr or not mc: print(f"{nom:18s} IMPOSSIBLE ref={bool(mr)} cap={bool(mc)}"); continue
    out.append({"nom":nom,"src":src,"ref":mr,"cap":mc})
    print(f"{nom:18s}{src:>+5}|{mr['ang']:>8.2f}{mc['ang']:>8.2f}{mc['ang']-mr['ang']:>+7.2f}|{mr['hcap']:>6}{mc['hcap']:>6}|"
          f"{mr['larg']:>6}{mc['larg']:>6}{mc['larg']/mr['larg']:>6.2f}|{mr['trou']:>6.1f}{mc['trou']:>6.1f}| {str(mr['encre']):16s} {mc['encre']}")
json.dump(out,open(os.path.join(M,"noms_restants.json"),"w"),indent=1)
