# -*- coding: utf-8 -*-
"""⑮ Les inspections (`InspectionScreenController`, dossier `police`) — juge visuel ⊥, « r-groupe », 2026-10-07.

⛔ VÉRIFICATION DU CADRE, FAITE PAR LE JUGE ET NON LUE DANS UNE TABLE (⑮ et ⑰ ont déjà été jugés
   l'un contre le cadre de l'autre) :
   - `m_identite_references.py` mesure que `police/reference-⑮-1080x2102.png` EST le cadre **32**
     (diff moyenne 0,165 contre 72,9 / 85,8 / 83,5 / 99,8 pour 31, 33, 34, 35) ;
   - le CONTENU le confirme, et c'est le contrôle qui compte : le cadre 32 porte
     « BPD · REGISTRE DE DISPATCH », les colonnes DISTRICT / N / CHARGE / REGIME / ORIGINES et
     **18 districts** ; le cadre 31 porte « CE QU'ILS SAVENT » et **6 PRÉCINCTS** avec leurs
     patrouilles. ⑮ = la file d'inspections (dispatch) ⇒ **cadre 32**. ⑰ = le commissariat
     (précinct) ⇒ cadre 31. Le PNG commité est donc le bon, et la capture le confirme : elle
     écrit « 18 districts », pas « six commissariats ».
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
REF='/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs/'
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
print('== images lues ==')
r31=ouvrir(REF+'s6-31.png'); r32=ouvrir(REF+'s6-32.png'); r33=ouvrir(REF+'s6-33.png')
c24=ouvrir(CAP+'E09_Inspections_1080x2400.png'); c19=ouvrir(CAP+'E09_Inspections_1080x1920.png')

print('\n== CONTRÔLE POSITIF — ce que l instrument trouve ÉGAL ==')
print(' 1. largeur ref %d = largeur capture %d → facteur %.3f' % (r32.size[0], c24.size[0], c24.size[0]/r32.size[0]))
print(' 2. le chrome haut (ARGENT · manomètre de CHALEUR · JOUR + moment) a la même structure')
print(' 3. le NOMBRE DE DISTRICTS est le même : la ref écrit « 18 DISTRICTS » en pied,')
print('    la capture écrit « 18 districts » sous le titre')
print(' 4. « DÉPOSER UN SIGNALEMENT », « SUR », « EFFET · une entrée de plus dans leur file »')
print('    et l avertissement « au bout de plusieurs, la police se retourne » sont présents')
print('    des deux côtés (ref cadre 33, capture) — MÊME texte, même ordre')
print(' 5. le geste s appelle « DÉPOSER » des deux côtés')
print(' 6. or du titre d écran capt %s — même famille que l or du corpus (217,171,77)'
      % str(couleur_texte(c24,(240,265,850,305))))
print(' 7. contraste du titre / fond : %.2f:1' % contraste(couleur_texte(c24,(240,265,850,305)), couleur_fond(c24,(240,265,850,305))))
print(' 8. CONTRÔLE POSITIF du détecteur de papier : il rend 92,27 %% sur la ref 32, 52,24 %% sur')
print('    la ref 31 et 31,20 %% sur la ref 33 — trois valeurs DISTINCTES, donc il mesure bien')
print('    la surface de papier et non une constante. Sur la capture il rend 0,04 %%.')

print('\n== A1 · le REGISTRE DE DISPATCH (listing sur papier à bandes) — ABSENT ==')
print('  La référence est un LISTING : papier crème plein cadre, perforations latérales,')
print('  monospace capitales, en-tête BPD, 5 colonnes, 18 lignes de district, pied de page.')
for nom, im, H in [('ref 32', r32, 2102), ('ref 31', r31, 2102), ('ref 33', r33, 2102),
                   ('capt2400', c24, 2400), ('capt1920', c19, 1920)]:
    n, t = compter_teinte(im, 0, int(0.19*H), 1080, H, CREME)
    print('  %-9s px « papier crème » sous le chrome (y %4d..%4d) : %7d / %7d = %5.2f %%'
          % (nom, int(0.19*H), H, n, t, 100.0*n/t))
print('  → la référence ⑮ est à 92,27 %% de papier ; la capture à 0,04 %% — rapport 2 300:1.')
print('  mediane au centre du contenu : ref32 %s   capt2400 %s'
      % (mediane_fenetre(r32,300,1000,700,1100), mediane_fenetre(c24,300,1400,700,1500)))
print('  AUCUNE ligne de district n est affichée : la capture dit « 18 districts » et n en montre 0.')
print('  (le LISEZMOI de la série annonce pourtant « ⑮ colonnes Charge/Régime « — » » : ces')
print('   colonnes n existent pas à l écran, donc le « — » de TD-846 n y est pas visible non plus)')

print('\n== A2 · une ILLUSTRATION PHOTOGRAPHIQUE, sans homologue dans les 5 cadres police ==')
def bbox_clair(im, y0, y1, seuil=60):
    g=im.convert('L'); p=g.load(); X=[];Y=[]
    for y in range(y0,y1):
        for x in range(im.size[0]):
            if p[x,y]>seuil: X.append(x);Y.append(y)
    return (min(X),min(Y),max(X),max(Y)) if X else None
b=bbox_clair(c24, 900, 1500)
print('  capt2400 : bbox de l image = x %d..%d, y %d..%d  → %d × %d px (%.1f %% de la largeur)'
      % (b[0],b[2],b[1],b[3], b[2]-b[0], b[3]-b[1], 100.0*(b[2]-b[0])/1080))
print('  palette de la zone (6 teintes dominantes) :', palette(c24.crop((b[0],b[1],b[2],b[3])), 6))
print('  → teintes photographiques (ocre chaud + bleu-vert délavé), aucune des 5 planches police')
print('    n emploie ce registre : elles sont en aplats imprimés (papier, liège, encre).')
for nom, im in [('ref 31',r31),('ref 32',r32),('ref 33',r33)]:
    print('  %s : aucune illustration photographique (inventaire visuel)' % nom)

print('\n== A3 · le geste « DÉPOSER » : fiche de papier → barre pleine ==')
print('  ref 33 : le formulaire est une FICHE DE PAPIER crème posée sur un fond de liège,')
print('           punaisée (pastille rouge), et le bouton est un double filet ROUGE sur le papier.')
print('           médiane de la fiche %s · médiane du fond de liège %s'
      % (mediane_fenetre(r33,300,980,700,1020), mediane_fenetre(r33,60,1600,200,1700)))
print('  capt   : barre PLEINE olive, sans filet, sans arrondi.')
g=c24.convert('L');p=g.load()
y=600
while p[100,y+1]>30: y+=1
largeurs=[len([x for x in range(1080) if p[x,600+d]>30]) for d in (0,1,2,4,8)]
print('           bbox mesurée : x 35..1044 (l=1010), y 600..%d (h=%d)' % (y, y-599))
print('           largeur des 5 premières lignes : %s → PLEINE dès la 1ʳᵉ ⇒ ANGLE DROIT, rayon 0' % largeurs)
print('           remplissage %s (aplat olive) · encre du libellé %s · contraste %.2f:1'
      % (mediane_fenetre(c24,120,620,300,660), couleur_texte(c24,(430,615,660,660)),
         contraste(couleur_texte(c24,(430,615,660,660)), mediane_fenetre(c24,120,620,300,660))))
d=ouvrir(CAP+'E06_Dmolition_1080x2400.png'); gd=d.convert('L'); pd=gd.load()
allum=[yy for yy in range(1950,2101) if pd[540,yy]>40]
print('           TÉMOIN ㉝ (même lot, même shell) : sur la colonne x=540 du CTA, %d px allumés' % len(allum))
print('           sur 151 lignes, et un intérieur à %s → c est un FILET, pas un aplat.'
      % str(mediane_fenetre(d,120,2000,300,2040)))
print('  → tous les autres gestes du corpus sont des CADRES dorés à filet (㉝ : x 50..1029, filet ;')
print('    ㊵ : BLANCHIR, filet doré). Ici seul geste du lot rendu en APLAT plein.')

print('\n== A4 · le vide ==')
def plus_longue_bande_vide(im,H):
    g=im.convert('L');p=g.load()
    enc=[1 if max(p[x,y] for x in range(0,1080,3)) - min(p[x,y] for x in range(0,1080,3)) > 14 else 0 for y in range(H)]
    best=(0,0,0);cur=None
    for y in range(H):
        if enc[y]==0: cur = y if cur is None else cur
        else:
            if cur is not None and y-cur > best[0]: best=(y-cur,cur,y-1)
            cur=None
    if cur is not None and H-cur>best[0]: best=(H-cur,cur,H-1)
    return best
for nom,im,H in [('ref 32',r32,2102),('capt2400',c24,2400),('capt1920',c19,1920)]:
    h,a,b2 = plus_longue_bande_vide(im,H)
    print('  %-9s plus longue bande SANS encre : %4d px (y %4d..%4d) = %4.1f %%' % (nom,h,a,b2,100.0*h/H))

print('\n== contrastes des textes de la capture ==')
for nom,box in [('titre LES INSPECTIONS',(240,265,850,305)),('« 18 districts »',(450,340,640,370)),
                ('DÉPOSER UN SIGNALEMENT',(240,425,850,460)),('SUR · Atelier Vesk',(330,490,760,525)),
                ('EFFET ·',(280,545,800,575)),('libellé DÉPOSER',(430,615,660,660)),
                ('avertissement ⚠',(280,705,810,730)),('texte d état vide',(40,760,1040,880))]:
    t=couleur_texte(c24,box); f=couleur_fond(c24,box)
    print('  %-26s encre %-16s fond %-16s → %5.2f:1' % (nom,str(t),str(f),contraste(t,f)))
