# r10-m28 : couche globale sur la ZONE DU CADRE seule (memes 1626 px de haut des deux cotes).
#  luminance moyenne, densite d'encre (part des pixels a L > fond+25), couverture des 12 jetons.
# Controle positif : les deux zones ont la MEME aire (imprimee) -> les % sont comparables.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,1058,2078),
    "CAP":(D+"capture-1080x2400.png",18,18,1061,1644)}
JT={'fond':(11,16,22),'fond2':(13,15,16),'carte':(17,24,35),'carte2':(22,25,27),'rang':(35,42,45),
    'lisere':(42,54,72),'creme':(234,224,200),'creme2':(185,173,146),'muet':(138,151,156),
    'eteint':(107,115,125),'or_vif':(242,201,107),'or_filet':(176,141,62),'cyan':(127,212,217),
    'vert':(125,179,106)}
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
R={}
for k,(p,x0,y0,x1,y1) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    n=0; s=0.0; enc=0; cnt={j:0 for j in JT}
    for v in range(y0,y1+1):
        for u in range(x0,x1+1):
            c=px[u,v]; n+=1; L=lum(c); s+=L
            if L>40: enc+=1
            for j,t in JT.items():
                if max(abs(c[i]-t[i]) for i in range(3))<=8: cnt[j]+=1; break
    R[k]=(n,s/n,100*enc/n,{j:100*cnt[j]/n for j in JT})
    print(f"{k} taille={im.size} zone {x1-x0+1}x{y1-y0+1} = {n} px  "
          f"luminance moyenne={s/n:.2f}  densite d'encre (L>40)={100*enc/n:.2f} %")
print(f"\n{'jeton':10s} {'REF %':>8s} {'CAP %':>8s} {'delta pt':>9s}")
for j in JT:
    a,b=R["REF"][3][j],R["CAP"][3][j]
    print(f"{j:10s} {a:8.2f} {b:8.2f} {b-a:+9.2f}")
print(f"\nluminance moyenne : REF {R['REF'][1]:.2f}  CAP {R['CAP'][1]:.2f}  ({100*(R['CAP'][1]/R['REF'][1]-1):+.1f} %)")
print(f"densite d'encre   : REF {R['REF'][2]:.2f} %  CAP {R['CAP'][2]:.2f} %  ({100*(R['CAP'][2]/R['REF'][2]-1):+.1f} %)")
