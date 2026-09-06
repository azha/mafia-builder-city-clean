import sys; sys.path.insert(0,'.')
from lib import *
print("=== m19 : pieces du buste — col, cou, yeux, bouche, montre, torse ===")
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
def creme(c):
    r,g,b=c; return r>215 and g>205 and b>180
CAS=[('REF','../reference-1080x2102.png',(85,880),1099,1232, (11,16,22),(17,24,35)),
     ('JEU','../capture-1080x2400.png',  (81,908),1118,1257, (13,14,23),(13,22,34))]
for nom,f,(ox,oy),ytop,ybot,sombre,fondc in CAS:
    im=ouvrir(f); p=px(im)
    print(f"  --- {nom} (origine carte = {ox},{oy}) ---")
    # COL creme
    bc=bbox_masque(im, creme, ox, ytop, ox+418, oy+660)
    aire=bc[4]; bw=bc[2]-bc[0]+1; bh=bc[3]-bc[1]+1
    print(f"     COL creme : x{bc[0]}..{bc[2]} ({bw}) y{bc[1]}..{bc[3]} ({bh}) aire={aire} remplissage aire/boite={aire/(bw*bh):.3f}")
    print(f"        centre x = {(bc[0]+bc[2])/2:.1f} ; relatif carte = {(bc[0]+bc[2])/2-ox:.1f}")
    # COU : peau sous le visage
    lignes=[]
    for y in range(ybot+2, ybot+80):
        xs=[x for x in range(140,420) if peau(p[x,y])]
        if xs and (max(xs)-min(xs)+1)<100: lignes.append((y,min(xs),max(xs)))
    if lignes:
        ws=[b-a+1 for _,a,b in lignes]
        print(f"     COU : y {lignes[0][0]}..{lignes[-1][0]} (h={len(lignes)}) largeur med={sorted(ws)[len(ws)//2]} px ; centre x={(lignes[0][1]+lignes[0][2])/2:.1f}")
    # YEUX : taches sombres dans le visage
    bbg=bbox_masque(im, lambda c: all(abs(c[i]-sombre[i])<=8 for i in range(3)), ox+80, ytop+20, ox+165, ytop+70)
    bbd=bbox_masque(im, lambda c: all(abs(c[i]-sombre[i])<=8 for i in range(3)), ox+170, ytop+20, ox+260, ytop+70)
    print(f"     OEIL G : {bbg[0]}..{bbg[2]} x {bbg[1]}..{bbg[3]} ({bbg[2]-bbg[0]+1}x{bbg[3]-bbg[1]+1}) n={bbg[4]}")
    print(f"     OEIL D : {bbd[0]}..{bbd[2]} x {bbd[1]}..{bbd[3]} ({bbd[2]-bbd[0]+1}x{bbd[3]-bbd[1]+1}) n={bbd[4]}")
    print(f"        ecartement des centres = {(bbd[0]+bbd[2])/2-(bbg[0]+bbg[2])/2:.1f} px ; axe des yeux = {((bbg[0]+bbg[2])/2+(bbd[0]+bbd[2])/2)/2:.1f}")
    # BOUCHE
    bb=bbox_masque(im, lambda c: all(abs(c[i]-sombre[i])<=8 for i in range(3)), ox+120, ytop+75, ox+230, ytop+125)
    if bb: print(f"     BOUCHE : x{bb[0]}..{bb[2]} ({bb[2]-bb[0]+1}) y{bb[1]}..{bb[3]} ({bb[3]-bb[1]+1}) n={bb[4]} centre=({(bb[0]+bb[2])/2:.1f},{(bb[1]+bb[3])/2:.1f})")
