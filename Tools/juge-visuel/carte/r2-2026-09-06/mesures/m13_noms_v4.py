# m13 — MESURE APPARIEE v4. Corrige le m12 : la contrainte de hauteur de BOITE (<=40 px) rejetait les mots
#       INCLINES (un mot a -10,7 deg sur 156 px couvre 48 px de haut). La validation se fait desormais sur la
#       HAUTEUR DE CAPITALE mesuree par tranches (insensible a l'inclinaison), pas sur la boite.
# CONVENTION D'ANGLE : 0 deg = horizontale de l'image ; POSITIF = HORAIRE a l'ecran
#   (y croit vers le bas ; fin du mot plus BASSE que le debut => angle POSITIF). = convention SVG rotate().
# CONVENTION DE MESURE D'ANGLE : regression de la LIGNE DE BASE (bas d'encre) sur les colonnes dont
#   la hauteur d'encre >= 11 px (exclut accents, traits d'union, points).
# RECALAGE (m06) : cap = 1.0220*ref + (-12.0, +8.0).
# CONTROLE POSITIF : 18/18 apparies, hcap dans 14..22 des deux cotes.
# CONTROLE NEGATIF : les libelles d'ecusson (#b3a88f, cap ~8-9 px) et le pied de page italique sont exclus
#   par le filtre de hauteur de composante >= 11 px ; verifie en imprimant le hcap de chaque mot.
from PIL import Image
import os, math, json, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); M=os.path.join(D,"mesures")
S,TX,TY=1.0220,-12.0,8.0
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref",ref.size,"cap",cap.size)
RP,CP=ref.load(),cap.load()
NOMS=[("LES BASSINS",(75,462,260,535),-10),("QUAI-NORD",(466,461,634,532),-10),
 ("SARNES",(861,447,985,510),-10),("LA COLONNE",(88,686,272,753),3),
 ("HAUTES-MARCHES",(455,690,707,748),3),("VERRIER",(866,655,1007,724),3),
 ("SAINT-BRAND",(87,931,278,986),3),("LES ENTREPOTS",(460,926,684,996),7),
 ("DEPOT-EST",(848,925,1012,987),7),("LE TREILLIS",(80,1394,249,1442),0),
 ("MARNE-BASSE",(451,1413,652,1460),0),("LE VERRE",(856,1383,998,1464),18),
 ("ORSEL",(98,1672,206,1720),0),("PLACE DES COMPTES",(391,1641,667,1765),18),
 ("LA LISIERE",(838,1648,1009,1714),-7),("LA CHANCELLERIE",(41,1918,285,2033),18),
 ("LES FRICHES",(436,1937,620,2009),-7),("PONT-GRIS",(820,1922,990,1996),-7)]
def enc(p):
    R,G,B=p; L=0.2126*R+0.7152*G+0.0722*B
    return L>110 and 10<=(R-B)<=95 and G>100
def analyse(px,ps):
    cols={}
    for x,y in ps: cols.setdefault(x,[]).append(y)
    ks=sorted(k for k in cols if (max(cols[k])-min(cols[k])+1)>=11)
    if len(ks)<20: return None
    P=[(k,max(cols[k])) for k in ks]
    n=len(P); mx=sum(p[0] for p in P)/n; my=sum(p[1] for p in P)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in P); sxx=sum((p[0]-mx)**2 for p in P)
    a=sxy/sxx if sxx else 0.0
    res=statistics.pstdev([p[1]-(my+a*(p[0]-mx)) for p in P])
    hs=[]
    for i in range(0,len(ks)-7,4):
        sl=[y for k in ks[i:i+8] for y in cols[k]]; hs.append(max(sl)-min(sl)+1)
    hs.sort(); hcap=hs[len(hs)//2] if hs else 0
    allk=sorted(cols); larg=allk[-1]-allk[0]+1
    tr=[allk[i]-allk[i-1]-1 for i in range(1,len(allk)) if allk[i]-allk[i-1]-1>0]
    ti=[g for g in tr if g<=18]
    lum=sorted(((0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2],x,y) for x,y in ps),reverse=True)
    top=lum[:max(8,len(lum)//7)]
    e=[int(statistics.median([px[x,y][k] for _,x,y in top])) for k in range(3)]
    return {"ang":round(math.degrees(math.atan(a)),2),"res":round(res,2),"hcap":hcap,"larg":larg,
            "ncol":len(allk),"trou":(round(statistics.median(ti),1) if ti else 0),"ntrou":len(ti),
            "encre":e,"npx":len(ps),
            "bb":[min(x for x,_ in ps),min(y for _,y in ps),max(x for x,_ in ps),max(y for _,y in ps)]}
def mot(px,W,H,box):
    x0,y0,x1,y1=[max(0,box[0]),max(0,box[1]),min(W-1,box[2]),min(H-1,box[3])]
    w=x1-x0+1;h=y1-y0+1
    mask=[[enc(px[x0+i,y0+j]) for i in range(w)] for j in range(h)]
    seen=[[False]*w for _ in range(h)];lets=[]
    for j in range(h):
        for i in range(w):
            if mask[j][i] and not seen[j][i]:
                st=[(i,j)];seen[j][i]=True;ps=[]
                while st:
                    a,b=st.pop();ps.append((a,b))
                    for db in(-1,0,1):
                        for da in(-1,0,1):
                            na,nb=a+da,b+db
                            if 0<=na<w and 0<=nb<h and mask[nb][na] and not seen[nb][na]:
                                seen[nb][na]=True;st.append((na,nb))
                xs=[p[0] for p in ps];ys=[p[1] for p in ps]
                hh=max(ys)-min(ys)+1;ww=max(xs)-min(xs)+1
                if 4<=len(ps)<=800 and 11<=hh<=32 and 2<=ww<=48:   # >=11 : exclut libelles d'ecusson et pied de page
                    lets.append((min(xs),min(ys),max(xs),max(ys),ps))
    if not lets:return None
    lets.sort(key=lambda b:b[0]);used=[False]*len(lets);grps=[]
    for i,b in enumerate(lets):
        if used[i]:continue
        used[i]=True;g=[b];chg=True
        while chg:
            chg=False
            gx0=min(x[0] for x in g);gy0=min(x[1] for x in g)
            gx1=max(x[2] for x in g);gy1=max(x[3] for x in g)
            for j,c in enumerate(lets):
                if used[j]:continue
                if c[0]<=gx1+22 and c[2]>=gx0-22 and c[1]<=gy1+13 and c[3]>=gy0-13:
                    used[j]=True;g.append(c);chg=True
        grps.append(g)
    cxw,cyw=(w-1)/2,(h-1)/2;cands=[]
    for g in grps:
        ps=[p for x in g for p in x[4]]
        if len(ps)<110:continue
        xs=[p[0] for p in ps];ys=[p[1] for p in ps]
        gc=((min(xs)+max(xs))/2,(min(ys)+max(ys))/2)
        d=((gc[0]-cxw)**2+(gc[1]-cyw)**2)**0.5
        cands.append((len(ps)/(1+0.03*d),g,ps))
    cands.sort(key=lambda t:-t[0])
    for _,g,ps in cands:
        r=analyse(px,[(p[0]+x0,p[1]+y0) for p in ps])
        if r and 12<=r["hcap"]<=30:
            r["nlet"]=len(g); return r
    return None
WR,HR=ref.size;WC,HC=cap.size
print(f"{'nom':19s}{'src':>5}|{'REFang':>8}{'CAPang':>8}{'d':>7}|{'REFhc':>6}{'CAPhc':>6}|{'REFlg':>6}{'CAPlg':>6}{'x':>6}|{'REFtr':>6}{'CAPtr':>6}|{'let R/C':>9}|{'encre CAP':>16}")
rows=[]
for nom,cb,src in NOMS:
    rb=(int((cb[0]-TX)/S)-16,int((cb[1]-TY)/S)-14,int((cb[2]-TX)/S)+16,int((cb[3]-TY)/S)+14)
    mr=mot(RP,WR,HR,rb);mc=mot(CP,WC,HC,cb)
    if not mr or not mc:
        print(f"{nom:19s}{src:>+5}| IMPOSSIBLE ref={bool(mr)} cap={bool(mc)}  fenetre ref={rb}");continue
    rows.append((nom,src,mr,mc))
    print(f"{nom:19s}{src:>+5}|{mr['ang']:>8.2f}{mc['ang']:>8.2f}{mc['ang']-mr['ang']:>+7.2f}|{mr['hcap']:>6}{mc['hcap']:>6}|"
          f"{mr['larg']:>6}{mc['larg']:>6}{mc['larg']/mr['larg']:>6.2f}|{mr['trou']:>6.1f}{mc['trou']:>6.1f}|{mr['nlet']:>4}/{mc['nlet']:<4}|{str(mc['encre']):>16}")
json.dump([{"nom":n,"src":s,"ref":a,"cap":b} for n,s,a,b in rows],open(os.path.join(M,"noms_v4.json"),"w"),indent=1)
print(f"\napparies : {len(rows)}/18")
print("CTRL+ hcap 14..22 des deux cotes :", all(14<=r[2]['hcap']<=22 and 14<=r[3]['hcap']<=22 for r in rows))
print("   ref hcap", sorted(r[2]['hcap'] for r in rows)); print("   cap hcap", sorted(r[3]['hcap'] for r in rows))
if rows:
    dr=[r[2]["ang"]-r[1] for r in rows];dc=[r[3]["ang"]-r[1] for r in rows];da=[r[3]["ang"]-r[2]["ang"] for r in rows]
    print(f"\nANGLE vs SOURCE  reference : med {statistics.median(dr):+.2f}  max|{max(abs(v) for v in dr):.2f}|")
    print(f"ANGLE vs SOURCE  capture   : med {statistics.median(dc):+.2f}  max|{max(abs(v) for v in dc):.2f}|")
    print("   pires capture :", sorted(((round(abs(v),2),rows[i][0],round(v,2)) for i,v in enumerate(dc)),reverse=True)[:4])
    print("   pires reference :", sorted(((round(abs(v),2),rows[i][0],round(v,2)) for i,v in enumerate(dr)),reverse=True)[:4])
    print(f"ANGLE capture - reference  : med {statistics.median(da):+.2f}  max|{max(abs(v) for v in da):.2f}|")
    print(f"amplitude ref {min(r[2]['ang'] for r in rows):+.2f}..{max(r[2]['ang'] for r in rows):+.2f} = {max(r[2]['ang'] for r in rows)-min(r[2]['ang'] for r in rows):.2f}")
    print(f"amplitude cap {min(r[3]['ang'] for r in rows):+.2f}..{max(r[3]['ang'] for r in rows):+.2f} = {max(r[3]['ang'] for r in rows)-min(r[3]['ang'] for r in rows):.2f}")
    rh=[r[2]['hcap'] for r in rows];ch=[r[3]['hcap'] for r in rows]
    print(f"HAUTEUR DE CAPITALE ref med {statistics.median(rh)} ({min(rh)}..{max(rh)}) | cap med {statistics.median(ch)} ({min(ch)}..{max(ch)}) | rapport {statistics.median(ch)/statistics.median(rh):.3f}")
    ok=[r for r in rows if r[2]['nlet']>=len(r[0].replace(" ","").replace("-",""))-2 and r[3]['nlet']>=len(r[0].replace(" ","").replace("-",""))-2]
    print(f"LARGEUR : mots ou les DEUX cotes ont ~toutes les lettres : {len(ok)}")
    if ok:
        rl=[r[3]['larg']/r[2]['larg'] for r in ok]
        print("   " + ", ".join(f"{r[0]}={r[3]['larg']}/{r[2]['larg']}={r[3]['larg']/r[2]['larg']:.3f}" for r in ok))
        print(f"   rapport med {statistics.median(rl):.3f}")
    print(f"ECART INTER-LETTRES : ref med {statistics.median([r[2]['trou'] for r in rows]):.1f} px | cap med {statistics.median([r[3]['trou'] for r in rows]):.1f} px")
    er=[r[2]['encre'] for r in rows];ec=[r[3]['encre'] for r in rows]
    print(f"ENCRE ref med {[int(statistics.median(v[k] for v in er)) for k in range(3)]} r-b {statistics.median(v[0]-v[2] for v in er):.0f}  (etendue r-b {min(v[0]-v[2] for v in er)}..{max(v[0]-v[2] for v in er)})")
    print(f"ENCRE cap med {[int(statistics.median(v[k] for v in ec)) for k in range(3)]} r-b {statistics.median(v[0]-v[2] for v in ec):.0f}  (etendue r-b {min(v[0]-v[2] for v in ec)}..{max(v[0]-v[2] for v in ec)})")
