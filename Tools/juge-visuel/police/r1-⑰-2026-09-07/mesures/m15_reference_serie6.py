# -*- coding: utf-8 -*-
"""m15 — inventaire de la RÉFÉRENCE série 6 (#32) : papier listing, perforations, bandes vertes,
typographie monospace. Sert l'inventaire du temps 1 et la couche globale.
Contrôle positif : la largeur du papier doit être ~100 % de la largeur d'écran (le panneau est plein-cadre)."""
import commun as C

print('== m15 : reference serie 6 (cadre #32) ==')
ref = C.ouvrir('reference'); cap = C.ouvrir('capture')
p = ref.load()

print('\n-- couleurs du papier (medianes de fenetres 9x9) --')
for x,y,ou in [(540, 470, 'bande CREME (entete)'), (540, 590, 'bande VERTE (ligne 1)'),
               (540, 690, 'bande creme (ligne 2)'), (540, 745, 'bande verte (ligne 3)'),
               (30, 900, 'marge gauche (perforations)'), (540, 250, 'art du bandeau')]:
    print('     %-26s (%4d,%4d) = %s' % (ou,x,y,C.hx(C.mediane_fenetre(ref,x,y,4))))

print('\n-- perforations : trous sombres de la marge gauche --')
col = C.profil_lignes(ref, 18, 40, 400, 2100, 60)
trous=[]; dedans=False
for y,n in col:
    if n < 4 and not dedans: dedans=True; d=y
    elif n >= 4 and dedans: dedans=False; trous.append((d, y-1, y-d))
trous=[t for t in trous if t[2]>=8]
print('     %d perforations detectees a gauche ; pas median = %s px'
      % (len(trous), sorted([trous[i+1][0]-trous[i][0] for i in range(len(trous)-1)])[max(0,(len(trous)-1)//2)] if len(trous)>1 else 'n/a'))

print('\n-- empan du papier --')
def empan(im, y, nom, cible=110):
    q=im.load(); W=im.size[0]
    xs=[x for x in range(W) if (lambda c:(c[0]*299+c[1]*587+c[2]*114)//1000)(q[x,y])>cible]
    if xs: print('     %-26s y=%4d  x=%d..%d  = %.1f %% de la largeur' % (nom,y,min(xs),max(xs),100.0*(max(xs)-min(xs)+1)/W))
empan(ref, 700, 'papier (bande de ligne)')
empan(ref, 430, 'titre du listing')

print('\n-- hauteur de capitale du monospace de la reference --')
bb,n = C.bbox_encre(ref, 75, 415, 660, 445, 100, 'sombre')
print('     titre "BPD . REGISTRE..." : bbox=%s -> hauteur de capitale = %s px' % (str(bb), (bb[3]-bb[1]+1) if bb else '?'))
bb2,n2 = C.bbox_encre(ref, 75, 585, 260, 615, 100, 'sombre')
print('     ligne "LES BASSINS"       : bbox=%s -> hauteur de capitale = %s px' % (str(bb2), (bb2[3]-bb2[1]+1) if bb2 else '?'))

print('\n-- CAPTURE : y a-t-il la moindre trace de la matiere papier ? --')
q=cap.load(); n=0
for y in range(143, 2160, 3):
    for x in range(0, 1080, 3):
        c=q[x,y]
        if c[0]>150 and c[1]>150 and c[2]>120 and abs(c[0]-c[1])<25:   # creme/vert papier
            n+=1
print('     pixels "papier" (clairs, desatures) dans le rect libre de la capture : %d sur %d echantillons (%.3f %%)'
      % (n, (2160-143)//3*360, 100.0*n/(((2160-143)//3)*360)))
print('     CONTRÔLE POSITIF : la meme sonde sur la reference --')
n2=0
for y in range(400, 2100, 3):
    for x in range(0, 1080, 3):
        c=p[x,y]
        if c[0]>150 and c[1]>150 and c[2]>120 and abs(c[0]-c[1])<25:
            n2+=1
print('     -> %d sur %d (%.1f %%)' % (n2, ((2100-400)//3)*360, 100.0*n2/(((2100-400)//3)*360)))

print('\n-- carte 2 : interieur re-echantillonne hors du texte --')
print('     capture carte 2 interieur (250,700) = %s ; sol (540,605) = %s'
      % (C.hx(C.mediane_fenetre(cap,250,700,6)), C.hx(C.mediane_fenetre(cap,540,605,6))))
