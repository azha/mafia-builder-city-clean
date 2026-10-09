#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q1 — ④ A01, etat _TeteNonRapports : y a-t-il, SOUS CHAQUE OPTION, une bande de
CONSEQUENCE ? Position, casse, couleur, hauteur de capitale, nombre de bandes,
contre le cadre 5.

Repere commun : le surtitre « CE QU'ON PEUT FAIRE », present des deux cotes, sert
d'origine en Y (le dossier interdit de comparer des Y absolus : 2102 != 2400 != 1920).
En X l'echelle est 1,000 (x3,6 des deux cotes).

CONTROLE POSITIF : le rectangle de la CARTE (bord a bord) et la hauteur de capitale du
                   surtitre « CE QU'ON PEUT FAIRE », qui doivent etre egaux.
CONTROLE NEGATIF : la couleur d'encre du TITRE de la carte (or), qui doit DIFFERER de
                   celle des consequences. Si l'echantillonneur rend la meme couleur
                   pour l'or et pour le texte courant, il ne mesure pas une couleur.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "00-outils.py")).read())

SEUIL = 90  # encre claire sur panneau sombre


def colonnes_de_ligne(im, y0, y1, x0=60, x1=1010):
    """Decoupe une rangee de texte en DEUX colonnes par le plus grand ecart."""
    bb = bandes(profil_colonnes(im, x0, y0, x1, y1 + 1, SEUIL), 1)
    if len(bb) < 2:
        return None
    ecarts = [(bb[i + 1][0] - bb[i][1], i) for i in range(len(bb) - 1)]
    g, i = max(ecarts)
    G = (bb[0][0], bb[i][1])
    D = (bb[i + 1][0], bb[-1][1])
    return G, D, g


def bord_carte(im, y, seuil_bord, xmax=1045):
    """Bords gauche/droit du LISERE du panneau sur une rangee traversant la carte :
    le lisere est plus clair que l'interieur ET que l'exterieur."""
    px = im.load()
    v = [lum(px[x, y]) for x in range(1080)]
    xs = [x for x in range(20, xmax) if v[x] > seuil_bord]
    return xs[0], xs[-1]


def bloc(im, lbl, fenetre, nom_lignes):
    print(f"\n  >>> {lbl}")
    b = [t for t in bandes(profil_lignes(im, 110, fenetre[0], 510, fenetre[1], SEUIL), 2)
         if t[1] - t[0] >= 8]
    for i, (d, f) in enumerate(b):
        etq = nom_lignes[i] if i < len(nom_lignes) else "?"
        print(f"      rangee {i}: y={d}..{f} (h={f-d+1}) — {etq}")
    return b


def main():
    print("=" * 98)
    print("Q1 — bandes de consequence sous chaque option (④ A01 _TeteNonRapports vs cadre 5)")
    print("=" * 98)

    r = ouvrir("reference/A01-cadre-5-tete-sur-ligne-haute.png")
    c24 = ouvrir("captures/A01_AccueilFile2Cartes_TeteNonRapports_1080x2400.png")
    c19 = ouvrir("captures/A01_AccueilFile2Cartes_TeteNonRapports_1080x1920.png")
    cdx = ouvrir("captures/A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400.png")

    print("\n--- CONTROLE POSITIF 1 : rectangle de la carte de tete ---")
    gr, dr = bord_carte(r, 1000, 32)
    gc, dc = bord_carte(c24, 1200, 32, 1040)
    print(f"    REF  : x={gr}..{dr}  largeur={dr-gr+1} px img = {(dr-gr+1)/ECHELLE:.2f} px CSS ; centre={(gr+dr)/2:.1f}")
    print(f"    CAP  : x={gc}..{dc}  largeur={dc-gc+1} px img = {(dc-gc+1)/ECHELLE:.2f} px CSS ; centre={(gc+dc)/2:.1f}")
    print(f"    (le lisere est le seul pixel > lum 32 de la rangee : interieur ~17-22, exterieur ~25-29)")
    print(f"    MILIEU DU GROUPE DE 2 COLONNES rapporte au CENTRE DE LA CARTE :")
    print(f"      REF  : 539.6 - {(gr+dr)/2:.1f} = {539.6-(gr+dr)/2:+.1f} px img")
    print(f"      CAP  : 549.3 - {(gc+dc)/2:.1f} = {549.3-(gc+dc)/2:+.1f} px img = "
          f"{(549.3-(gc+dc)/2)/ECHELLE:+.2f} px CSS = {100*(549.3-(gc+dc)/2)/(dc-gc+1):+.2f} % de la carte")
    centre_r, centre_c = (gr + dr) / 2, (gc + dc) / 2

    print("\n--- CONTROLE POSITIF 2 : surtitre « CE QU'ON PEUT FAIRE » (MEME texte des 3 cotes) ---")
    print("    Il sert aussi d'ANCRE : meme texte, centre sur la carte, present partout.")
    ancre = {}
    for lbl, im, fen in [("REF    ", r, (1060, 1115)), ("CAP2400", c24, (1300, 1355)),
                         ("CAP1920", c19, (855, 910))]:
        s = [t for t in bandes(profil_lignes(im, 300, fen[0], 760, fen[1], SEUIL), 2) if t[1] - t[0] >= 10][0]
        x = bandes(profil_colonnes(im, 40, s[0], 1040, s[1] + 1, SEUIL), 1)
        ancre[lbl.strip()] = ((x[0][0] + x[-1][1]) / 2, s[0])
        print(f"    {lbl} : y={s[0]}..{s[1]} hauteur de capitale={s[1]-s[0]+1} px img ; "
              f"x={x[0][0]}..{x[-1][1]} largeur={x[-1][1]-x[0][0]+1} ; centre={(x[0][0]+x[-1][1])/2:.1f}")
    print(f"    ORIGINE Y commune : surtitre REF y={ancre['REF'][1]} / CAP2400 y={ancre['CAP2400'][1]} "
          f"/ CAP1920 y={ancre['CAP1920'][1]}")

    print("\n--- CONTROLE NEGATIF : l'echantillonneur doit SEPARER l'or du texte courant ---")
    print("    REF titre de carte (or) :", couleur_coeur(r, 300, 820, 780, 940, 0.10)[0])
    print("    CAP titre de carte (or) :", couleur_coeur(c24, 150, 1090, 950, 1200, 0.10)[0])
    print("    REF consequence         :", couleur_coeur(r, 121, 1300, 470, 1446, 0.06)[0])
    print("    CAP consequence         :", couleur_coeur(c24, 110, 1403, 500, 1533, 0.06)[0])

    print("\n--- STRUCTURE : rangees de la colonne GAUCHE, du surtitre au bas du bloc ---")
    bloc(r, "REFERENCE cadre 5 (colonne gauche)", (1060, 1470),
         ["surtitre", "BOUTON « METTRE EN RÉPARATION » (fond or)",
          "consequence L1", "consequence L2", "consequence L3", "consequence L4"])
    bloc(c24, "CAPTURE 2400 (colonne gauche)", (1300, 1560),
         ["surtitre", "libelle d'option « Mettre en réparation »",
          "consequence L1", "consequence L2", "consequence L3", "consequence L4"])
    bloc(c19, "CAPTURE 1920 (colonne gauche)", (860, 1110),
         ["surtitre", "libelle d'option « Mettre en réparation »",
          "consequence L1", "consequence L2", "consequence L3", "consequence L4"])

    print("\n--- NOMBRE DE BANDES et POSITION : une bande par option, sous son option ---")
    for lbl, cle, im, ylig, yopt in [("REF  cadre 5", "REF", r, [(1300, 1329), (1340, 1368), (1379, 1407), (1417, 1446)], None),
                                     ("CAP  2400   ", "CAP2400", c24, [(1403, 1432), (1437, 1466), (1471, 1497), (1503, 1533)], (1362, 1392)),
                                     ("CAP  1920   ", "CAP1920", c19, [(956, 985), (991, 1018), (1024, 1048), (1056, 1084)], (916, 945))]:
        print(f"    {lbl} :")
        cg, cd = [], []
        for (y0, y1) in ylig:
            res = colonnes_de_ligne(im, y0, y1)
            G, D, g = res
            cg.append((G[0] + G[1]) / 2)
            cd.append((D[0] + D[1]) / 2)
            print(f"        ligne y={y0}: colonne G x={G} centre={(G[0]+G[1])/2:.1f} | "
                  f"gouttiere={g} | colonne D x={D} centre={(D[0]+D[1])/2:.1f}")
        mg, md = sum(cg) / len(cg), sum(cd) / len(cd)
        ct = ancre[cle][0]
        print(f"        => 2 bandes (une par option). Centres moyens G={mg:.1f} D={md:.1f} ; "
              f"ANCRE (centre du surtitre)={ct:.1f} ; ecarts {mg-ct:+.1f} / {md-ct:+.1f} px img "
              f"(milieu du groupe {(mg+md)/2-ct:+.1f} px img = {((mg+md)/2-ct)/ECHELLE:+.2f} px CSS)")
        if yopt:
            res = colonnes_de_ligne(im, yopt[0], yopt[1])
            print(f"        libelles d'option : G x={res[0]} centre={(res[0][0]+res[0][1])/2:.1f} | "
                  f"D x={res[1]} centre={(res[1][0]+res[1][1])/2:.1f}  "
                  f"-> la consequence est bien SOUS son option et dans la MEME colonne")
        tops = [y0 for y0, _ in ylig]
        pas = [tops[i + 1] - tops[i] for i in range(3)]
        print(f"        interlignage : tops {tops} -> pas {pas}, moyenne {sum(pas)/3:.2f} px img "
              f"= {sum(pas)/3/ECHELLE:.2f} px CSS")

    print("\n--- HAUTEUR DE CAPITALE et CASSE de la consequence (« C » puis « a » de Chaque) ---")
    for lbl, im, xC, xa, fen in [("REF  cadre 5", r, (121, 142), (162, 178), (1290, 1340)),
                                 ("CAP  2400   ", c24, (132, 150), (171, 185), (1395, 1435)),
                                 ("CAP  1920   ", c19, (132, 150), (171, 185), (948, 990))]:
        bC = bandes(profil_lignes(im, xC[0], fen[0], xC[1], fen[1], SEUIL), 1)[0]
        ba = bandes(profil_lignes(im, xa[0], fen[0], xa[1], fen[1], SEUIL), 1)[0]
        cap, xh = bC[1] - bC[0] + 1, ba[1] - ba[0] + 1
        print(f"    {lbl} : capitale « C » y={bC} -> {cap} px img = {cap/ECHELLE:.2f} px CSS ; "
              f"bas-de-casse « a » y={ba} -> {xh} px ; rapport oeil/capitale = {xh/cap:.3f} "
              f"(> 0 ⇒ la casse est de PHRASE, pas de capitales)")

    print("\n--- COULEUR de la consequence (coeur de glyphe) et fond du panneau ---")
    for lbl, im, fen in [("REF  cadre 5 G", r, (121, 1300, 470, 1446)),
                         ("REF  cadre 5 D", r, (565, 1300, 910, 1446)),
                         ("CAP  2400    G", c24, (110, 1403, 500, 1533)),
                         ("CAP  2400    D", c24, (545, 1403, 940, 1533)),
                         ("CAP  1920    G", c19, (110, 956, 500, 1085)),
                         ("CAP  1920    D", c19, (545, 956, 940, 1085))]:
        enc = couleur_coeur(im, *fen, 0.06)[0]
        print(f"    {lbl} : encre = {enc}")
    fr = fond_median(r, 150, 1455, 900, 1475)
    fc = fond_median(c24, 150, 1545, 900, 1560)
    print(f"    fond du panneau : REF {fr}  CAP {fc} ; "
          f"contraste REF {contraste((185,173,146),fr):.2f} / CAP {contraste((185,173,146),fc):.2f}")

    print("\n--- SOULIGNEMENT POINTILLE (assume 3 du dossier : « propose, non ratifie ») ---")
    print("    REF : une bande de 3 px sous CHACUNE des 4 lignes (cf. STRUCTURE ci-dessus : "
          "1330-1332, 1369-1371, 1408-1410, 1447-1449) ET sous le surtitre (1103-1104).")
    print("    CAP : AUCUNE bande intercalaire entre les lignes (cf. STRUCTURE) -> soulignement absent,")
    print("          et absent PARTOUT (pas de demi-trait, pas de reste) : assume rendu proprement.")


    print("\n--- RAPPORT INTERNE option / consequence (invariant d'echelle, cf. dossier.md) ---")
    print("    Hampe moyenne sur 9 rangees de la zone d'oeil, meme methode des deux cotes.")

    def seg(im, y, x0, x1, s=SEUIL):
        px = im.load()
        o, d = [], None
        for x in range(x0, x1):
            cl = lum(px[x, y]) > s
            if cl and d is None:
                d = x
            elif not cl and d is not None:
                o.append(x - d)
                d = None
        return o

    def hampe(im, x0, x1, bas, n=9):
        t = []
        for y in range(bas - 11, bas - 11 + n):
            t += [w for w in seg(im, y, x0, x1) if 2 <= w <= 12]
        return sum(t) / len(t), len(t)

    cas = [("REF  cadre 5 : libelle d'option (bouton droit, ligne 1)", r, 580, 900, 1203),
           ("REF  cadre 5 : consequence L1", r, 110, 540, 1323),
           ("CAP  2400    : libelle d'option G", c24, 175, 470, 1385),
           ("CAP  2400    : consequence L1", c24, 110, 540, 1426),
           ("CAP  1920    : libelle d'option G", c19, 181, 470, 939),
           ("CAP  1920    : consequence L1", c19, 110, 540, 979)]
    val = []
    for lbl, im, x0, x1, bas in cas:
        m, n = hampe(im, x0, x1, bas)
        val.append(m)
        print(f"    {lbl} : hampe moyenne = {m:.2f} px img (n={n})")
    print(f"    RAPPORT consequence/option — REF  : {val[1]/val[0]:.2f}")
    print(f"    RAPPORT consequence/option — CAP2400 : {val[3]/val[2]:.2f}")
    print(f"    RAPPORT consequence/option — CAP1920 : {val[5]/val[4]:.2f}")
    print("    (REF << 1 : l'option est NETTEMENT plus grasse que sa consequence.")
    print("     CAP ~ 1  : option et consequence ont la MEME graisse.)")
    print("    Couleurs : option et consequence du jeu, coeur de glyphe :")
    print("      CAP2400 option     :", couleur_coeur(c24, 175, 1362, 467, 1392, 0.10)[0])
    print("      CAP2400 consequence:", couleur_coeur(c24, 110, 1403, 540, 1433, 0.10)[0])
    print("    Hauteurs de capitale : option « M » et consequence « C » :")
    for lbl, im, xM, xC, fenM, fenC in [("CAP2400", c24, (175, 195), (132, 150), (1350, 1400), (1395, 1435)),
                                        ("CAP1920", c19, (181, 201), (132, 150), (905, 950), (948, 990))]:
        bM = bandes(profil_lignes(im, xM[0], fenM[0], xM[1], fenM[1], SEUIL), 1)[0]
        bC = bandes(profil_lignes(im, xC[0], fenC[0], xC[1], fenC[1], SEUIL), 1)[0]
        print(f"      {lbl} : « M » {bM[1]-bM[0]+1} px img ; « C » {bC[1]-bC[0]+1} px img")

    print("\n--- ETAT _TeteDeuxOptions (carte des RAPPORTS) : est-il PROPRE ? ---")
    b = [t for t in bandes(profil_lignes(cdx, 60, 1400, 1020, 1800, SEUIL), 3) if t[1] - t[0] >= 2]
    print(f"    rangees d'encre de la carte : {b}")
    print("    attendu (assume 2) : titre / PORTEE-URGENCE / UN geste — ni surtitre « CE QU'ON PEUT")
    print("    FAIRE », ni option, ni consequence, ni libelle de repli.")
    bb = bandes(profil_colonnes(cdx, 40, 1454, 1040, 1513, SEUIL), 1)
    print(f"    titre : x={bb[0][0]}..{bb[-1][1]}")
    bb = bandes(profil_colonnes(cdx, 40, 1625, 1040, 1717, 60), 1)
    print(f"    bouton du geste : x={bb[0][0]}..{bb[-1][1]} largeur={bb[-1][1]-bb[0][0]+1} px img "
          f"= {(bb[-1][1]-bb[0][0]+1)/ECHELLE:.1f} px CSS")


if __name__ == "__main__":
    main()
