"""09 - Hauteur de CAPITALE : segmentation en glyphes d'une bande de texte, puis extension
verticale du PREMIER glyphe (une capitale connue).
Controle positif : le sous-titre de la reference (.enseigne i, 6.4px CSS DejaVu Sans, x3,6)
doit rendre une capitale de ~17 px (0,729 em x 6,4 x 3,6 = 16,8).
Controle negatif : un glyphe pris dans une zone vide doit rendre 0 glyphe."""
from PIL import Image
def load(p):
    im=Image.open(p).convert('RGB'); print(f"ouvre {p}: {im.size}"); return im
def glyphes(im, x0,y0,x1,y1, fond, tol=45):
    p=im.load(); cols=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if max(abs(p[x,y][i]-fond[i]) for i in range(3))>tol]
        cols.append(ys)
    gl=[];cur=None
    for i,ys in enumerate(cols):
        if ys:
            if cur is None: cur=[x0+i,x0+i,min(ys),max(ys)]
            cur[1]=x0+i; cur[2]=min(cur[2],min(ys)); cur[3]=max(cur[3],max(ys))
        else:
            if cur: gl.append(cur); cur=None
    if cur: gl.append(cur)
    return [g for g in gl if g[1]-g[0]>=2]
def rap(nom, im, box, fond, tol=45, n=4):
    g=glyphes(im,*box,fond,tol)
    print(f"  {nom}: {len(g)} glyphes ; les {n} premiers :")
    for a,b,c,d in g[:n]:
        print(f"      x {a}..{b} (l={b-a+1})  y {c}..{d}  HAUTEUR={d-c+1}")
    if len(g)>=2:
        pas=[g[i+1][0]-g[i][0] for i in range(len(g)-1)]
        print(f"      pas moyen entre glyphes = {sum(pas)/len(pas):.1f} px")
ref=load('../reference-1080x2102.png'); cap=load('../capture-1080x2400.png')
print("\n[+] CONTROLE POSITIF - REF sous-titre .enseigne i (attendu cap ~17 px)")
rap("REF sous-titre L2 'PAS'", ref,(490,610,590,634),(15,21,31),40,3)
print("[-] CONTROLE NEGATIF - REF zone vide de .elast (attendu 0 glyphe)")
rap("REF vide", ref,(200,1250,600,1300),(13,15,16),40,3)

print("\n=== TITRES ===")
rap("REF titre 'Le dossier' (L,e,d)", ref,(295,505,600,570),(17,23,33),45,5)
rap("CAP titre 'Ce qui se voit' (C,e,q)", cap,(300,322,600,400),(22,22,28),45,5)
print("\n=== SOUS-TITRES ===")
rap("REF sous-titre L1 'TROIS...'", ref,(105,585,400,612),(15,21,31),40,5)
rap("CAP sous-titre 'TROIS SIGNAUX...'", cap,(290,396,600,432),(22,22,28),40,5)
print("\n=== EYEBROW de colonne / de carte ===")
rap("REF .pi i 'LA COMPTABILITE'", ref,(112,900,340,928),(17,24,35),40,5)
rap("CAP carte1 'RISQUE D'AUDIT'", cap,(70,530,330,570),(22,22,28),40,5)
print("\n=== VERDICT / PHRASE ===")
rap("REF 'on regarde'", ref,(140,1100,320,1140),(17,24,35),45,5)
rap("CAP 'On vous regarde'", cap,(70,578,470,640),(22,22,28),45,5)
print("\n=== EYEBROW du panneau bas ===")
rap("REF 'POURQUOI TROIS COLONNES'", ref,(85,1604,505,1632),(17,24,35),40,5)
rap("CAP 'CE QUE CET ECRAN...'", cap,(70,1640,680,1678),(22,22,28),40,5)
print("\n=== TITRE SERIF du panneau bas ===")
rap("REF 'On peut etre propre...'", ref,(85,1645,930,1700),(17,24,35),45,5)
rap("CAP 'Une bande sans source...'", cap,(70,1685,930,1735),(22,22,28),45,5)
print("\n=== CORPS ===")
rap("REF corps L1", ref,(85,1768,960,1800),(17,24,35),35,5)
rap("CAP corps L1", cap,(70,1805,940,1845),(22,22,28),35,5)
