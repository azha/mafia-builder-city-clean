# m14 — LES JETONS (aplats) et le FOND DU CADRE.
# Points d'echantillonnage derives de m12 (filets de panneau) : jamais choisis a l'oeil.
# Mediane d'une fenetre (rayon donne, 1 px pour les filets de 3 px, 4 px pour les aplats).
# Controle positif : peau, creme, cyan, or et libelle doivent etre a 0-1/255 (jetons partages).
# Controle negatif : deux fenetres du meme aplat doivent rendre 0/255.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
pr,pc=px(ref),px(cap)
# offsets par rapport au filet haut du cadre : REF 452, JEU 482
J=[('fond du cadre (entre elast et panneau bas)', (540,1630),(540,1674),4),
   ('interieur du panneau enseigne',              (140, 520),(140, 550),4),
   ('interieur d\'une boite de compteur',         (100, 760),(96, 785),4),
   ('interieur du panneau elastique',             (960, 1470),(960,1450),4),
   ('fond de la carte portrait',                  (120,1000),(116,1026),4),
   ('peau du visage',                             (293,1170),(291,1195),4),
   ('creme du col',                               (279,1300),(276,1330),3),
   ('torse (veste)',                              (200,1420),(196,1450),4),
   ('interieur du panneau bas',                   (940,1680),(940,1723),4),
   ('interieur de la boite du CTA',               (120,2000),(120,2035),4),
   ('filet or du cadre (rail gauche)',            (22,1200),(19,1230),1),
   ('filet de panneau (bord d\'une tuile)',       (700,1001),(700, 998),1),
   ('cyan des chiffres',                          (175, 743),(176, 767),1),
   ('libelle de compteur (creme grise)',          (0,0),(0,0),0)]
print("\n  jeton                                     REF                JEU                Δ")
for nom,a,b,r in J:
    if r==0: continue
    ca=mediane_fenetre(pr,a[0],a[1],r); cb=mediane_fenetre(pc,b[0],b[1],r)
    print(f"   {nom:40s} {str(ca):18s} {str(cb):18s} {dist(ca,cb):>3}/255")
print("\n  === profil du FOND DU CADRE (colonne x=1040 REF / x=1045 JEU, hors panneaux) ===")
print("   offset  REF                JEU")
for off in (10, 200, 400, 700, 1000, 1300, 1500, 1600):
    ca=mediane_fenetre(pr,1042,452+off,3); cb=mediane_fenetre(pc,1046,482+off,3)
    print(f"   {off:>5}   {str(ca):18s} {str(cb):18s} Δ={dist(ca,cb)}")
print("\n  [controle negatif] meme aplat, deux fenetres (fond de carte REF x120 vs x140) :",
      dist(mediane_fenetre(pr,120,1000,4), mediane_fenetre(pr,140,1000,4)),"/255")
