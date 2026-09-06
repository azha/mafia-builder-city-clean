# m11 — MESURE APPARIEE des 18 noms de quartier : angle, hauteur de capitale, largeur d'encre,
#       interlettrage, couleur d'encre, fond local, contraste.
# CONVENTION D'ANGLE : 0 deg = horizontale de l'image ; POSITIF = HORAIRE a l'ecran
#   (y croit vers le bas ; fin du mot plus BASSE que le debut => angle POSITIF).
#   Identique a la convention SVG rotate(theta cx cy) declaree au dossier.
# RECALAGE (m06) : cap = 1.0220*ref + (-12.0, +8.0)  =>  ref = (cap - t)/1.0220
# CONTROLE POSITIF : "LE THRENNY" est PEINT DANS LA TEXTURE (identique des deux cotes)
#   => il doit rendre la MEME hauteur de capitale et le MEME angle. Mesure a part (encre froide).
# CONTROLE NEGATIF : les libelles d'ecusson (#b3a88f, cap ~8 px) sont exclus par le seuil de hauteur >= 11.
from PIL import Image
import os, math, json, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(D, "mesures")
S, TX, TY = 1.0220, -12.0, 8.0
ref = Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB")
cap = Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
print("OUVERT ref", ref.size, "cap", cap.size)
RP, CP = ref.load(), cap.load()

# fenetres en coordonnees CAPTURE, issues de la detection m10 (18 noms + HAUTES-MARCHES recolle)
NOMS = [
 ("LES BASSINS",       (  75, 462,  260, 535), -10),
 ("QUAI-NORD",         ( 466, 461,  634, 532), -10),
 ("SARNES",            ( 861, 447,  985, 510), -10),
 ("LA COLONNE",        (  88, 686,  272, 753),   3),
 ("HAUTES-MARCHES",    ( 455, 690,  707, 748),   3),
 ("VERRIER",           ( 866, 655, 1007, 724),   3),
 ("SAINT-BRAND",       (  87, 931,  278, 986),   3),
 ("LES ENTREPOTS",     ( 460, 926,  684, 996),   7),
 ("DEPOT-EST",         ( 848, 925, 1012, 987),   7),
 ("LE TREILLIS",       (  80,1394,  249,1442),   0),
 ("MARNE-BASSE",       ( 451,1413,  652,1460),   0),
 ("LE VERRE",          ( 856,1383,  998,1464),  18),
 ("ORSEL",             (  98,1672,  206,1720),   0),
 ("PLACE DES COMPTES", ( 391,1641,  667,1765),  18),
 ("LA LISIERE",        ( 838,1648, 1009,1714),  -7),
 ("LA CHANCELLERIE",   (  41,1918,  285,2033),  18),
 ("LES FRICHES",       ( 436,1937,  620,2009),  -7),
 ("PONT-GRIS",         ( 825,1928,  985,1990),  -7),
]

def encre_chaude(p):
    R,G,B = p; L = 0.2126*R+0.7152*G+0.0722*B
    return L > 110 and 10 <= (R-B) <= 95 and G > 100

def mesure(px, W, H, box, tag):
    x0,y0,x1,y1 = box
    x0=max(0,x0); y0=max(0,y0); x1=min(W-1,x1); y1=min(H-1,y1)
    cols = {}
    pts = []
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if encre_chaude(px[x,y]):
                cols.setdefault(x,[]).append(y); pts.append((x,y))
    if len(pts) < 120: return None
    # colonnes "de capitale" : hauteur d'encre >= 11 px (exclut les libelles d'ecusson, traits d'union, points)
    ks = sorted(k for k in cols if (max(cols[k])-min(cols[k])+1) >= 11)
    if len(ks) < 25: return None
    # angle : regression du BAS d'encre (ligne de base) sur les colonnes de capitale
    P = [(k, max(cols[k])) for k in ks]
    n=len(P); mx=sum(p[0] for p in P)/n; my=sum(p[1] for p in P)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in P); sxx=sum((p[0]-mx)**2 for p in P)
    ang = math.degrees(math.atan(sxy/sxx)) if sxx else 0.0
    # residu de la regression (qualite)
    a = sxy/sxx if sxx else 0.0
    res = statistics.pstdev([p[1]-(my + a*(p[0]-mx)) for p in P])
    # hauteur de capitale : mediane sur tranches de 8 colonnes de capitale
    hs=[]
    for i in range(0, len(ks)-7, 4):
        sl=[y for k in ks[i:i+8] for y in cols[k]]
        hs.append(max(sl)-min(sl)+1)
    hs.sort(); hcap = hs[len(hs)//2]
    # largeur d'encre totale et interlettrage : trous entre colonnes d'encre
    allk = sorted(cols)
    larg = allk[-1]-allk[0]+1
    trous=[]
    for i in range(1,len(allk)):
        g = allk[i]-allk[i-1]-1
        if g>0: trous.append(g)
    trous_int = [g for g in trous if g <= 18]   # ecarts INTER-LETTRES (au-dela = espace mot)
    # couleur d'encre : mediane des 15 % de pixels les plus lumineux
    lum = sorted(((0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2], x, y) for x,y in pts), reverse=True)
    top = lum[:max(8,len(lum)//7)]
    enc = [statistics.median([px[x,y][k] for _,x,y in top]) for k in range(3)]
    return {"tag":tag,"box":[x0,y0,x1,y1],"npx":len(pts),"ang":round(ang,2),"res":round(res,2),
            "hcap":hcap,"larg":larg,"ncol":len(allk),
            "trou_med": (statistics.median(trous_int) if trous_int else 0),
            "trou_n": len(trous_int),
            "encre":[int(v) for v in enc]}

WR,HR = ref.size; WC,HC = cap.size
print(f"{'nom':20s} {'src':>4} | {'REF ang':>8} {'CAP ang':>8} {'d':>6} | {'REF hc':>6} {'CAP hc':>6} {'x':>5} | {'REF larg':>8} {'CAP larg':>8} {'x':>5} | {'REF trou':>8} {'CAP trou':>8}")
rows=[]
for nom, cbox, src in NOMS:
    rbox = tuple(int(round((v - (TX if i%2==0 else TY))/S)) for i,v in enumerate(cbox))
    rbox = (rbox[0]-14, rbox[1]-14, rbox[2]+14, rbox[3]+14)
    mr = mesure(RP, WR, HR, rbox, "REF")
    mc = mesure(CP, WC, HC, cbox, "CAP")
    if not mr or not mc:
        print(f"{nom:20s} {src:>4} | MESURE IMPOSSIBLE ref={bool(mr)} cap={bool(mc)}"); continue
    rows.append((nom,src,mr,mc))
    print(f"{nom:20s} {src:>+4} | {mr['ang']:>8.2f} {mc['ang']:>8.2f} {mc['ang']-mr['ang']:>+6.2f} | "
          f"{mr['hcap']:>6} {mc['hcap']:>6} {mc['hcap']/mr['hcap']:>5.2f} | "
          f"{mr['larg']:>8} {mc['larg']:>8} {mc['larg']/mr['larg']:>5.2f} | "
          f"{mr['trou_med']:>8.1f} {mc['trou_med']:>8.1f}")
json.dump([{"nom":n,"src":s,"ref":a,"cap":b} for n,s,a,b in rows], open(os.path.join(M,"noms_apparies.json"),"w"), indent=1)

print("\n--- SYNTHESE")
dang_ref = [r[2]["ang"]-r[1] for r in rows]; dang_cap = [r[3]["ang"]-r[1] for r in rows]
print(f"angle : ecart a la SOURCE — reference : med {statistics.median(dang_ref):+.2f} deg, max |{max(abs(v) for v in dang_ref):.2f}|")
print(f"angle : ecart a la SOURCE — capture   : med {statistics.median(dang_cap):+.2f} deg, max |{max(abs(v) for v in dang_cap):.2f}|")
da = [r[3]["ang"]-r[2]["ang"] for r in rows]
print(f"angle : capture - reference — med {statistics.median(da):+.2f} deg, max |{max(abs(v) for v in da):.2f}|")
print(f"amplitude des angles : reference {min(r[2]['ang'] for r in rows):+.2f}..{max(r[2]['ang'] for r in rows):+.2f} = {max(r[2]['ang'] for r in rows)-min(r[2]['ang'] for r in rows):.2f} deg")
print(f"                       capture   {min(r[3]['ang'] for r in rows):+.2f}..{max(r[3]['ang'] for r in rows):+.2f} = {max(r[3]['ang'] for r in rows)-min(r[3]['ang'] for r in rows):.2f} deg")
rh=[r[2]["hcap"] for r in rows]; ch=[r[3]["hcap"] for r in rows]
print(f"hauteur de capitale : ref med {statistics.median(rh)}  cap med {statistics.median(ch)}  rapport {statistics.median(ch)/statistics.median(rh):.3f}")
rl=[r[3]["larg"]/r[2]["larg"] for r in rows]
print(f"largeur d'encre cap/ref : med {statistics.median(rl):.3f}  min {min(rl):.3f}  max {max(rl):.3f}")
rt=[r[2]["trou_med"] for r in rows]; ct=[r[3]["trou_med"] for r in rows]
print(f"ecart inter-lettres (px) : ref med {statistics.median(rt):.1f}  cap med {statistics.median(ct):.1f}")
print(f"encre ref : {[r[2]['encre'] for r in rows][:5]} ...")
print(f"encre cap : {[r[3]['encre'] for r in rows][:5]} ...")
er=[r[2]["encre"] for r in rows]; ec=[r[3]["encre"] for r in rows]
print(f"encre mediane ref {[statistics.median(v[k] for v in er) for k in range(3)]}  r-b={statistics.median(v[0]-v[2] for v in er):.0f}")
print(f"encre mediane cap {[statistics.median(v[k] for v in ec) for k in range(3)]}  r-b={statistics.median(v[0]-v[2] for v in ec):.0f}")
