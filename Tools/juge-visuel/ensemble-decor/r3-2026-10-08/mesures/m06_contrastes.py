"""m06 — CONTRASTE TEXTE/FOND sur l'art reel (doctrine : >= 3:1 grands textes,
>= 4,5:1 petits ; l'atelier tient la garde a 4,5:1 sur les 152 cadres, donc un texte
sous le seuil DANS LE JEU est un ecart).

Methode : dans un rect ne contenant qu'un bloc de texte, le FOND est la couleur modale
(exacte) du rect ; l'ENCRE est la mediane des 5 % de pixels les plus eloignes du fond en
luminance — le coeur du glyphe, pas la frange d'anti-crenelage. On imprime les deux
couleurs, la part de pixels d'encre, et le rapport WCAG.

CONTROLE POSITIF : le titre « Le journal » de ㊳ (or sur bleu nuit) doit ressortir
nettement au-dessus de 4,5:1 des DEUX cotes.
CONTROLE NEGATIF : le fond du rect compare a lui-meme doit donner 1,00:1.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as O


def contraste_bloc(im, rect, etiq, part=0.05):
    x0, y0, x1, y1 = rect
    px = im.load()
    pts = []
    comptes = {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            pts.append(p)
            comptes[p] = comptes.get(p, 0) + 1
    fond = max(comptes.items(), key=lambda kv: kv[1])[0]
    lf = O.lum(fond)
    pts.sort(key=lambda p: abs(O.lum(p) - lf), reverse=True)
    n = max(1, int(len(pts) * part))
    coeur = pts[:n]
    coeur.sort(key=O.lum)
    encre = coeur[len(coeur) // 2]
    c = O.contraste(encre, fond)
    print("   %-46s fond=%-16s encre=%-16s  contraste=%.2f:1" % (etiq, str(fond), str(encre), c))
    return c, encre, fond


print("=== m06 CONTRASTES ===")
print()
print("-- CONTROLE POSITIF : le titre « Le journal » de ㊳ --")
contraste_bloc(O.ref("E01-cadre-125.png"), (300, 505, 760, 560), "REF  titre or / bleu nuit")
contraste_bloc(O.cap("E01_Journal_1080x2400.png"), (320, 570, 760, 635), "JEU  titre or / bleu nuit")
print("-- CONTROLE NEGATIF : un rect sans texte (doit donner ~1,0:1) --")
contraste_bloc(O.cap("E01_Journal_1080x2400.png"), (120, 2150, 220, 2200), "JEU  fond nu")

print()
print("-- ㊳ E01 : le geste principal « Y PRETER ATTENTION » --")
contraste_bloc(O.ref("E01-cadre-125.png"), (330, 1936, 750, 1980), "REF  cadre 125 (actif)")
contraste_bloc(O.ref("E01-cadre-127.png"), (240, 1940, 850, 1985), "REF  cadre 127 (etat inactif de la maquette)")
contraste_bloc(O.cap("E01_Journal_1080x2400.png"), (330, 1950, 760, 1995), "JEU  2400")

print()
print("-- ㉞ E02 : le geste principal « Lancer la soiree » --")
contraste_bloc(O.ref("E02-cadre-85.png"), (90, 1975, 500, 2020), "REF  cadre 85")
contraste_bloc(O.cap("E02_Carnet_1080x2400.png"), (130, 1980, 480, 2030), "JEU  2400")

print()
print("-- ㉞ E02 : le bouton « Poser un ordre » (boite grise de la rangee 1) --")
contraste_bloc(O.cap("E02_Carnet_1080x2400.png"), (850, 865, 1000, 925), "JEU  2400")

print()
print("-- ㉓ E07 : la mention d'indisponibilite --")
contraste_bloc(O.ref("E07-cadre-98.png"), (700, 1040, 900, 1075), "REF  « hors d'atteinte »")
contraste_bloc(O.cap("E07_Boutique_1080x2400.png"), (680, 1070, 920, 1105), "JEU  « pas assez de Marks »")

print()
print("-- ⑮ E09 : les textes de la fiche de depot et le registre --")
contraste_bloc(O.ref("E09-cadre-33-signalement.png"), (250, 1030, 820, 1070), "REF  « DEPOSER UN SIGNALEMENT »")
contraste_bloc(O.cap("E09_Inspections_1080x2400.png"), (240, 1410, 840, 1450), "JEU  « DEPOSER UN SIGNALEMENT »")
contraste_bloc(O.cap("E09_Inspections_1080x2400.png"), (130, 1270, 950, 1320), "JEU  ligne « 18 DISTRICTS ... » du registre")
contraste_bloc(O.cap("E09_Inspections_1080x2400.png"), (280, 1655, 820, 1685), "JEU  « au bout de plusieurs ... »")

print()
print("-- ㉚ E03 / ㉛ E05 : sous-titre du bandeau --")
contraste_bloc(O.ref("E03-cadre-48.png"), (50, 535, 910, 570), "REF ㉚ sous-titre")
contraste_bloc(O.cap("E03_Chanedappro_1080x2400.png"), (55, 610, 950, 655), "JEU ㉚ sous-titre")

print()
print("-- A01 : l'eyebrow « LA SUITE » --")
contraste_bloc(O.ref("A01-cadre-4-la-suite.png"), (450, 865, 630, 900), "REF  cadre 4")
contraste_bloc(O.cap("A01_AccueilFile2Cartes_1080x2400.png"), (460, 962, 620, 995), "JEU  2400")
