# m11 - les 3 tuiles compteur : bbox, bordure, fond, et couleur/position du glyphe.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
# bande des tuiles reperee par m03 (CSS 69.7..119.7 ref ; 67.8..116.9 cap)
CASES=[("ref_m120",D+"reference/m-120.png",18,376,3.0,585,736),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,258,442)]
def med(v):
    v=sorted(v); return v[len(v)//2]
for k,f,ox,oy,sc,ya,yb in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); W,H=im.size
    print(f"== {k} size={W}x{H} bande y={ya}..{yb}")
    ymid=(ya+yb)//2
    # profil horizontal : luminance de la ligne mediane -> detecte bords verticaux des tuiles
    row=[px[x,ya+6] for x in range(W)]
    # detecte transitions fond-cadre -> tuile
    seq=[]
    for x in range(20,W-20):
        a=row[x]; b=row[x-1]
        if abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])>25: seq.append(x)
    print("  transitions x (haut de tuile+6):",seq)
    # bbox des tuiles par regroupement
    # couleurs : bordure (au bord) vs fond (centre)
    for name,xr in [("bord_haut_T1",None)]: pass
    # colonnes de bordure : cherche pixels non-fond sur la ligne mediane
    fond=med([px[x,ya-8][0] for x in range(30,W-30)])
    print("  ligne mediane y=",ymid)
