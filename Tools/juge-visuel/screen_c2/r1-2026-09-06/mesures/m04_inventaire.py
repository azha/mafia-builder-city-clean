# m04 — inventaire des boites (bords par seuil de fond) + hauteurs de capitale
# Controle positif : REF enseigne mesuree doit valoir 46,4 CSS (7+17+5+6,4+8+3 par la CSS) -> 167 px a x3,6
# Controle negatif : la meme routine sur la bande vide de la capture doit rendre "aucune boite"
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)

def boite_h(px,y,x0,x1,fond,tol=6):
    """extremites horizontales ou le pixel s'ecarte de <fond>"""
    def diff(p): return max(abs(p[i]-fond[i]) for i in range(3))
    l=None;r=None
    for x in range(x0,x1):
        if diff(px[x,y])>tol: l=x;break
    for x in range(x1-1,x0-1,-1):
        if diff(px[x,y])>tol: r=x;break
    return l,r
def boite_v(px,x,y0,y1,fond,tol=6):
    def diff(p): return max(abs(p[i]-fond[i]) for i in range(3))
    t=None;b=None
    for y in range(y0,y1):
        if diff(px[x,y])>tol: t=y;break
    for y in range(y1-1,y0-1,-1):
        if diff(px[x,y])>tol: b=y;break
    return t,b

print("\n### CAPTURE — fond noir (13,13,13)")
NOIR=(13,13,13)
for tag,x,y0,y1 in [("enseigne",540,240,450),("compteur milieu",540,435,650),("pann bas",540,1700,2130)]:
    t,b=boite_v(pc,x,y0,y1,NOIR); print("  %-16s x=%d  y=%s..%s  h=%s"%(tag,x,t,b,(b-t+1) if t else None))
for tag,y in [("enseigne",340),("compteurs",500),("pann bas",1850)]:
    l,r=boite_h(pc,y,0,1080,NOIR); print("  %-16s y=%d  x=%s..%s  w=%s"%(tag,y,l,r,(r-l+1) if l else None))
# les trois fenetres de compteurs : trouver les intervalles non-noirs sur y=500
y=500; runs=[];cur=None
for x in range(1080):
    p=pc[x,y]; ink = max(abs(p[i]-NOIR[i]) for i in range(3))>6
    if ink:
        if cur is None: cur=[x,x]
        else: cur[1]=x
    else:
        if cur: runs.append(tuple(cur)); cur=None
if cur: runs.append(tuple(cur))
print("  fenetres compteurs (y=500) :",runs, " largeurs",[b-a+1 for a,b in runs]," ecarts",[runs[i+1][0]-runs[i][1]-1 for i in range(len(runs)-1)])
print("  CTRL- boite dans le vide y=1200 :", boite_h(pc,1200,0,1080,NOIR))

print("\n### REFERENCE — bords par le liseré #2a3648 / fond du bln6")
# enseigne : bords mesures au scan m03 -> re-mesure ici
def trouve_bord_vert(px,x,y0,y1,cible,tol=14):
    out=[]
    for y in range(y0,y1):
        p=px[x,y]
        if max(abs(p[i]-cible[i]) for i in range(3))<=tol: out.append(y)
    # regroupe
    runs=[];cur=None
    for y in out:
        if cur is None: cur=[y,y]
        elif y==cur[1]+1: cur[1]=y
        else: runs.append(tuple(cur)); cur=[y,y]
    if cur: runs.append(tuple(cur))
    return runs
LISERE=(42,54,72)
print("  REF liseré #2a3648 en x=540, y=440..2100 :", trouve_bord_vert(pr,540,440,2100,LISERE))
print("  REF liseré #2a3648 en x=60,  y=440..2100 :", trouve_bord_vert(pr,60,440,2100,LISERE))
# fenetres compteurs de la reference sur y=700
y=700; runs=[];cur=None
for x in range(30,1050):
    p=pr[x,y]; ink = max(abs(p[i]-(11,16,22)[i]) for i in range(3))>8
    if ink:
        if cur is None: cur=[x,x]
        else: cur[1]=x
    else:
        if cur: runs.append(tuple(cur)); cur=None
if cur: runs.append(tuple(cur))
runs=[r for r in runs if r[1]-r[0]>30]
print("  REF fenetres compteurs (y=700) :",runs," largeurs",[b-a+1 for a,b in runs])
