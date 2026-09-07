# m13 (v2) — le cadran : le secteur colore est-il un TRAIT d'epaisseur constante (arc)
# ou un COIN PLEIN (chevron/wedge) ? Grandeur : epaisseur verticale du masque colore, colonne par colonne.
# Controle positif : sur le CANON du HUD, l'arc est un stroke-width:3 CSS -> epaisseur ~ constante.
# Controle NEGATIF exige : si les deux rendent la meme chose, la sonde ne discrimine pas -> a jeter.
from PIL import Image
def masque(path, box, mode):
    im=Image.open(path).convert('RGB'); print(f"  {path} {im.size}  boite {box}  mode {mode}")
    px=im.load(); cols={}
    for x in range(box[0],box[2]):
        n=0; ys=[]
        for y in range(box[1],box[3]):
            p=px[x,y]; r,g,b=p
            if mode=='teal'  and b>g>r and (b-r)>18 and b>60: n+=1; ys.append(y)
            if mode=='rouge' and r>g and r>b and (r-b)>25 and r>70: n+=1; ys.append(y)
        if n: cols[x]=(n, ys[0], ys[-1])
    return cols
def resume(c,nom):
    if not c: print(f"   {nom}: RIEN"); return
    ep=[v[0] for v in c.values()]; m=sum(ep)/len(ep)
    et=(sum((e-m)**2 for e in ep)/len(ep))**0.5
    print(f"   {nom}: n_colonnes={len(c)}  epaisseur moy={m:.1f}  ecart-type={et:.1f}  min={min(ep)} max={max(ep)}  ratio max/moy={max(ep)/m:.2f}")
    xs=sorted(c); ech=[(x,c[x][0]) for x in xs[::max(1,len(xs)//12)]]
    print(f"      epaisseur par x : {ech}")
    print(f"      bord SUPERIEUR y par x : {[(x,c[x][1]) for x in xs[::max(1,len(xs)//12)]]}")

print("CANON HUD — cadran (boite 520..660 x 60..190)")
resume(masque('hud-canon-1176.png',(520,60,660,190),'teal'),'teal  CANON')
resume(masque('hud-canon-1176.png',(520,60,660,190),'rouge'),'rouge CANON')
print("\nCAPTURE — cadran (boite 470..620 x 40..135)")
resume(masque('capture-1080x2400.png',(470,40,620,135),'teal'),'teal  CAPTURE')
resume(masque('capture-1080x2400.png',(470,40,620,135),'rouge'),'rouge CAPTURE')
