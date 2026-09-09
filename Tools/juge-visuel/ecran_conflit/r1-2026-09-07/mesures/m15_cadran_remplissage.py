# m15 — le cadran : TRAIT fin (arc) ou SECTEUR PLEIN ? Grandeur : taux de remplissage colore
# (pixels teal+rouge) rapporte a l'aire de la BOITE du cadran, a l'echelle de chacun.
# .cadran = 44x28 CSS dans les deux -> canon 132x84 px (x3), capture 121x77 px (x2,755).
# Controle POSITIF : un arc de stroke-width 3 CSS sur 44x28 couvre ~ 3*(pi*R) / (44*28) ~ 12-16 %.
# Controle NEGATIF : deux secteurs pleins couvriraient ~ 45-60 %.
from PIL import Image
def compte(path, box):
    im=Image.open(path).convert('RGB'); print(f"  {path} {im.size} boite {box} = {box[2]-box[0]}x{box[3]-box[1]}")
    px=im.load(); t=0; r=0; xs=[];ys=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            R,G,B=px[x,y]
            teal  = (B>G>R) and (B-R)>25 and B>65
            rouge = (R>G>B) and (R-B)>30 and R>75
            if teal: t+=1; xs.append(x); ys.append(y)
            if rouge: r+=1; xs.append(x); ys.append(y)
    aire=(box[2]-box[0])*(box[3]-box[1])
    print(f"     teal={t}  rouge={r}  total={t+r}  aire boite={aire}  remplissage={(t+r)*100/aire:.1f} %")
    if xs: print(f"     bbox du colore = ({min(xs)},{min(ys)})-({max(xs)},{max(ys)})  soit {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px")
    return t,r
print("CANON HUD : cadran suppose centre sous le medaillon")
compte('hud-canon-1176.png',(523,55,655,139))
print("\nCAPTURE : cadran du medaillon du shell")
compte('capture-1080x2400.png',(480,42,601,119))
print("\nCONTROLE NEGATIF : meme sonde sur une zone SANS cadran")
compte('capture-1080x2400.png',(100,300,221,377))
compte('hud-canon-1176.png',(100,600,232,684))
