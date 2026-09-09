# -- m23 : geometrie du bandeau. Blocs ARGENT / valeur / barre de ratio / aile droite ; VOLUTES.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib2 import *

creme2 = lambda p: abs(p[0]-185)<26 and abs(p[1]-173)<26 and abs(p[2]-146)<30 and p[0]>p[2]
creme  = lambda p: abs(p[0]-234)<22 and abs(p[1]-224)<22 and abs(p[2]-200)<30
orvif  = lambda p: abs(p[0]-242)<22 and abs(p[1]-201)<26 and abs(p[2]-107)<38 and p[0]-p[2]>90
orbar  = lambda p: abs(p[0]-217)<26 and abs(p[1]-171)<26 and abs(p[2]-78)<34 and p[0]-p[2]>90

def bb(key,box,pred,nom,capitale=None):
    m,pl=profil_lignes(key,box,pred)
    if not m: print("  %-4s %-24s : AUCUN"%(key,nom)); return None
    print("  %-4s %-24s x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)  n=%d"%(key,nom,m['x0'],m['x1'],m['w'],m['y0'],m['y1'],m['h'],m['n']))
    return m

print("=== CANON ===")
bb('ref',(10,6,120,20),creme2,'ARGENT (libelle)')
bb('ref',(10,20,160,42),orvif,'valeur argent')
bb('ref',(10,42,160,52),orbar,'barre de ratio (or)')
bb('ref',(250,8,382,22),creme2,'JOUR ... (libelle)')
bb('ref',(250,22,382,44),creme,'valeur droite')
print("=== c19 ===")
bb('c19',(40,6,150,20),creme2,'ARGENT (libelle)')
bb('c19',(40,20,240,44),orvif,'valeur argent')
bb('c19',(40,44,240,52),orbar,'barre de ratio (or)')
bb('c19',(250,8,382,22),creme2,'JOUR ... (libelle)')
bb('c19',(250,22,382,46),creme,'valeur droite')
print("=== c24 ===")
bb('c24',(40,6,150,20),creme2,'ARGENT (libelle)')
bb('c24',(40,20,240,44),orvif,'valeur argent')
bb('c24',(40,44,240,52),orbar,'barre de ratio (or)')
bb('c24',(250,8,382,22),creme2,'JOUR ... (libelle)')
bb('c24',(250,22,382,46),creme,'valeur droite')
print()
print("=== FLECHE RETOUR (jeu seulement) — masque creme, fenetre gauche ===")
bb('c19',(5,20,45,45),creme,'fleche retour')
bb('ref',(5,20,45,45),creme,'(canon : rien attendu)')
