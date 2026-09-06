# m09 : carte des ecarts. On rehausse la REFERENCE dans le repere de la CAPTURE
# (s=1.0225, dx=-12, dy=+8), on floute les deux (rayon 5) pour absorber le
# reechantillonnage, puis on compare cellule par cellule (36 x 30 px).
# Controle positif : les cellules du fleuve et des blocs nus doivent etre < 8/255.
# Controle negatif : les cellules des plaques doivent ressortir tres haut.
from PIL import Image, ImageFilter
import statistics
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB')
cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
# rehaussement : nouvelle image 1080x2400 ou ref est placee selon (S,DX,DY)
W,H=1080,2400
rr=ref.resize((int(1080*S),int(2102*S)),Image.LANCZOS)
canvas=Image.new('RGB',(W,H),(0,0,0))
canvas.paste(rr,(DX,DY))
canvas.save('mesures/vues/ref_rehaussee.png')
print(f"reference rehaussee -> {rr.size} collee en ({DX},{DY})")
a=canvas.filter(ImageFilter.GaussianBlur(5)).load()
b=cap.filter(ImageFilter.GaussianBlur(5)).load()
CW,CH=36,30
# zone valide de la reference rehaussee dans la capture : y de DY.. DY+2102*S
ytop, ybot = DY+6, int(DY+2102*S)-6
print(f"zone comparable : y {ytop}..{ybot}")
cells=[]
for cy in range(ytop, ybot-CH, CH):
    for cx in range(0, W-CW, CW):
        dr=dg=db=0; n=0
        for y in range(cy,cy+CH,3):
            for x in range(cx,cx+CW,3):
                p,q=a[x,y],b[x,y]
                dr+=q[0]-p[0]; dg+=q[1]-p[1]; db+=q[2]-p[2]; n+=1
        cells.append((cx,cy,dr/n,dg/n,db/n,(abs(dr)+abs(dg)+abs(db))/(3*n)))
cells.sort(key=lambda c:-c[5])
print(f"\ncellules {CW}x{CH} : {len(cells)} ; ecart median = {statistics.median([c[5] for c in cells]):.2f}/255")
print(f"{'x':>5} {'y':>5} {'|d|':>6} {'dR':>7} {'dG':>7} {'dB':>7}   (les 30 pires)")
for c in cells[:30]:
    print(f"{c[0]:>5} {c[1]:>5} {c[5]:>6.1f} {c[2]:>+7.1f} {c[3]:>+7.1f} {c[4]:>+7.1f}")
print("\n-- CONTROLE POSITIF : cellules du fleuve (y 1150..1250, x 200..800) --")
fl=[c for c in cells if 1150<=c[1]<=1250 and 200<=c[0]<=800]
print(f"  n={len(fl)} ecart median={statistics.median([c[5] for c in fl]):.2f}/255  max={max(c[5] for c in fl):.2f}")
print("-- CONTROLE NEGATIF : cellules sous les plaques --")
pl=[c for c in cells if (78<=c[0]<=254 and 483<=c[1]<=516) or (462<=c[0]<=638 and 479<=c[1]<=512)]
print(f"  n={len(pl)} ecart median={statistics.median([c[5] for c in pl]) if pl else '-'}")
