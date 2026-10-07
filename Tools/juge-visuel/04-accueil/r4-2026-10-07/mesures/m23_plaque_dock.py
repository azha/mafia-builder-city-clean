# m23 — plaque TRANCHER (bbox par son bord (41,52,70)) et DOCK (ronds + liseres + libelles).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def prox(p,c,t): return all(abs(p[i]-c[i])<=t for i in range(3))
def plaque(ch,ya,yb,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    C=(41,52,70)
    # colonnes verticales longues = bords gauche/droit
    cols={}; rows={}
    for y in range(ya,yb):
        for x in range(20,1070):
            if prox(px[x,y],C,8): cols[x]=cols.get(x,0)+1; rows[y]=rows.get(y,0)+1
    cv=[x for x,n in cols.items() if n>=60]; lh=[y for y,n in rows.items() if n>=500]
    if not cv or not lh: print(f"  {t}: insuffisant  cols={sorted(cols.items())[:5]}"); return
    print(f"  {t:7s} [{im.size}] plaque bbox=({min(cv)},{min(lh)})..({max(cv)},{max(lh)}) l={max(cv)-min(cv)+1} h={max(lh)-min(lh)+1}")
    yc=(min(lh)+max(lh))//2
    # rayon
    r=[]
    for dy in range(0,26,2):
        xs=[x for x in range(min(cv)-4,min(cv)+50) if prox(px[x,min(lh)+dy],C,14)]
        r.append((dy,(min(xs)-min(cv)) if xs else None))
    print(f"      retrait du bord gauche : {r}")
    print(f"      interieur (x 540..600) = {sorted([px[x,y] for y in range(yc-8,yc+8) for x in range(540,600)],key=lum)[480]}")
def dock(ch,t,ya,yb):
    im=Image.open(ch).convert('RGB'); px=im.load()
    # cherche les ronds : disques legerement plus clairs. profil de colonnes sur la bande
    prof=[]
    for x in range(0,1080):
        s=sum(lum(px[x,y]) for y in range(ya,yb,2))/len(range(ya,yb,2))
        prof.append(s)
    m=sum(prof)/len(prof)
    runs=[];cur=None
    for x in range(1080):
        if prof[x]>m*1.04 and cur is None: cur=x
        if prof[x]<=m*1.04 and cur is not None:
            if x-cur>30: runs.append((cur,x-1,x-cur))
            cur=None
    if cur: runs.append((cur,1079,1079-cur))
    print(f"  {t:7s} [{im.size}] bande y {ya}..{yb} : ronds detectes {runs}")
    cen=[(a+b)//2 for a,b,_ in runs]
    if len(cen)>=2: print(f"      centres={cen}  ecarts={[cen[i+1]-cen[i] for i in range(len(cen)-1)]}  empan={cen[-1]-cen[0]}")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("=== PLAQUE TRANCHER ===")
plaque(R,1640,1840,"REF"); plaque(J,1470,1650,"J1920"); plaque(K,1875,2060,"J2400")
print("=== DOCK ===")
dock(R,"REF",1850,1940); dock(J,"J1920",1685,1775); dock(K,"J2400",2165,2255)
