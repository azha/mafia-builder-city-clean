# m28 — (a) profil du FILET LAITON du haut du panneau : etendue et degrade.
#       (b) "LA SUITE" : etendue, centrage, interlettrage.
# Controle positif : les deux images ont le MEME panneau x48..1032, centre 540.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CIB=[('REF',B+"r2-2026-10-07/reference/cadre-4-la-suite.png",828,(865,895)),
     ('J1920',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",823,(860,890)),
     ('J2400',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1230,(1266,1296))]
print("=== (a) FILET LAITON du bord haut du panneau (panneau x48..1032, centre 540) ===")
for nom,ch,yor,_ in CIB:
    im=Image.open(ch).convert('RGB'); px=im.load()
    prof=[(x,px[x,yor][0]-px[x,yor][2]) for x in range(40,1045)]
    sup=[x for x,v in prof if v>20]
    pic=max(v for x,v in prof)
    print(f"  {nom:6s} [{im.size}] y={yor} : R-B max={pic}  etendue(R-B>20) x {min(sup)}..{max(sup)} = {max(sup)-min(sup)+1}px "
          f"({100*(max(sup)-min(sup)+1)/985:.0f} % du panneau), centre={(min(sup)+max(sup))//2}")
    print("     profil R-B : " + " ".join(f"{x}:{v}" for x,v in prof if x%60==0))
print("\n=== (b) LA SUITE ===")
for nom,ch,_,(ya,yb) in CIB:
    im=Image.open(ch).convert('RGB'); px=im.load()
    xs=[x for x in range(200,900) if any(lum(px[x,y])>60 for y in range(ya,yb))]
    # plages = lettres
    runs=[];cur=None
    for x in range(200,900):
        v=x in set(xs)
        if v and cur is None: cur=x
        if not v and cur is not None: runs.append((cur,x-1)); cur=None
    print(f"  {nom:6s} [{im.size}] encre x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1}) centre={(min(xs)+max(xs))//2}  "
          f"{len(runs)} plages={[a for a,b in runs]}")
