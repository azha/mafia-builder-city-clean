# m38 — typo du bandeau (ASSUME « chrome commun HUD v3.1 ») : capitale et interlettrage d'ARGENT,
# chaine IDENTIQUE des deux cotes. Verifie seulement que l'assume est rendu proprement.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def argent(ch,y0,y1,t,seuil=70):
    im=Image.open(ch).convert('RGB'); px=im.load()
    xs=[x for x in range(20,320) if any(lum(px[x,y])>seuil for y in range(y0,y1))]
    runs=[];cur=None
    for x in range(20,320):
        v=x in set(xs)
        if v and cur is None: cur=x
        if not v and cur is not None: runs.append((cur,x-1)); cur=None
    if cur: runs.append((cur,319))
    ys=[y for y in range(y0,y1) if any(lum(px[x,y])>seuil for x in range(xs[0],xs[0]+16))]
    gaps=[runs[i+1][0]-runs[i][1]-1 for i in range(len(runs)-1)]
    print(f"  {t:22s} [{im.size}] « ARGENT » x {min(xs)}..{max(xs)} chasse={max(xs)-min(xs)+1}  capitale={ys[-1]-ys[0]+1}  {len(runs)} groupes  gaps={gaps}")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
argent(R,36,64,"REF")
argent(J,24,50,"J1920")
argent(K,24,50,"J2400")
