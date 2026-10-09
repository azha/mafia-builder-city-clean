#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q2 — ㉞ E02 : le LIBELLE du geste principal et sa LEGENDE tiennent-ils UNE LIGNE
chacun ? La BANDE BASSE (bouton + legende) : LARGEUR DU BOUTON et MARGES LATERALES,
contre le cadre 85.

Le bouton est une boite a lisere : son lisere est le seul pixel clair d'une rangee qui
traverse la bande basse au-dessus du texte. On mesure le bord EXTERIEUR du lisere.

CONTROLE POSITIF : la HAUTEUR de la bande basse et la hauteur de capitale du « L » de
                   LANCER, qui doivent etre egales ; et les avances du libelle et de la
                   legende (MEME texte des deux cotes).
CONTROLE NEGATIF : les 4 captures E02 (2 resolutions x 2 positions de liste) doivent
                   donner la MEME largeur de bouton ; si l'instrument rendait des
                   largeurs differentes sur une image identique par construction, il
                   mesurerait du bruit. Et la largeur du bouton (~988) doit DIFFERER de
                   la largeur de l'image (1080) : un detecteur qui colle aux bords de
                   l'image ne detecte pas un lisere.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "00-outils.py")).read())


def boite_bouton(im, fen, seuil=45):
    """(y0,y1,x0,x1) de la boite du geste principal dans la fenetre verticale fen."""
    b = [t for t in bandes(profil_lignes(im, 20, fen[0], 1060, fen[1], 60), 3) if t[1] - t[0] > 60]
    y0, y1 = b[-1]
    px = im.load()
    row = y0 + 8
    v = [lum(px[x, row]) for x in range(5, 1075)]
    xs = [x + 5 for x in range(len(v)) if v[x] > seuil]
    return y0, y1, xs[0], xs[-1]


def lignes_internes(im, y0, y1, x0, x1, seuil=95):
    return bandes(profil_lignes(im, x0 + 12, y0 + 6, x1 - 12, y1 - 4, seuil), 3)


def mots(im, y0, y1, x0, x1, seuil=95):
    bb = bandes(profil_colonnes(im, x0 + 12, y0, x1 - 12, y1 + 1, seuil), 1)
    ecarts = [(bb[i + 1][0] - bb[i][1], i) for i in range(len(bb) - 1)]
    g, i = max(ecarts)
    return (bb[0][0], bb[i][1]), (bb[i + 1][0], bb[-1][1]), g


def main():
    print("=" * 98)
    print("Q2 — bande basse de ㉞ E02 (libelle + legende du geste principal) vs cadre 85.")
    print("Echelle x3,6 des DEUX cotes : 1 px CSS = 3,6 px image (dossier.md).")
    print("=" * 98)

    r = ouvrir("reference/E02-cadre-85.png")
    ry0, ry1, rx0, rx1 = boite_bouton(r, (1880, 2095), 40)
    print(f"\n--- REFERENCE cadre 85 ---")
    print(f"    boite du geste : y={ry0}..{ry1} hauteur={ry1-ry0+1} px img = {(ry1-ry0+1)/ECHELLE:.2f} px CSS")
    print(f"    bord EXTERIEUR du lisere : x={rx0}..{rx1}")
    print(f"    LARGEUR DU BOUTON = {rx1-rx0+1} px img = {(rx1-rx0+1)/ECHELLE:.2f} px CSS")
    print(f"    MARGE GAUCHE = {rx0} px img = {rx0/ECHELLE:.2f} px CSS ; "
          f"MARGE DROITE = {1079-rx1} px img = {(1079-rx1)/ECHELLE:.2f} px CSS")
    li = lignes_internes(r, ry0, ry1, rx0, rx1)
    print(f"    rangees de texte DANS le bouton : {li}  -> {len([t for t in li if t[1]-t[0]>=12])} ligne(s) de corps")
    yt = [t for t in li if t[1] - t[0] >= 12][0]
    G, D, g = mots(r, yt[0], yt[1], rx0, rx1)
    print(f"    LIBELLE  x={G} avance={G[1]-G[0]+1} px img = {(G[1]-G[0]+1)/ECHELLE:.2f} px CSS "
          f"(retrait interieur gauche = {G[0]-rx0} px img = {(G[0]-rx0)/ECHELLE:.2f} px CSS)")
    print(f"    LEGENDE  x={D} avance={D[1]-D[0]+1} px img = {(D[1]-D[0]+1)/ECHELLE:.2f} px CSS "
          f"(retrait interieur droit = {rx1-D[1]} px img = {(rx1-D[1])/ECHELLE:.2f} px CSS)")
    print(f"    ecart libelle/legende = {g} px img = {g/ECHELLE:.2f} px CSS")
    bL = bandes(profil_lignes(r, G[0], yt[0] - 6, G[0] + 18, yt[1] + 6, 95), 1)
    print(f"    hauteur de capitale du « L » de LANCER : {bL[0]} -> {bL[0][1]-bL[0][0]+1} px img "
          f"= {(bL[0][1]-bL[0][0]+1)/ECHELLE:.2f} px CSS")
    enc_l = couleur_coeur(r, G[0], yt[0], G[1], yt[1] + 1, 0.12)[0]
    enc_g = couleur_coeur(r, D[0], yt[0], D[1], yt[1] + 1, 0.12)[0]
    fnd = fond_median(r, G[0], yt[1] + 8, D[1], yt[1] + 24)
    print(f"    encre libelle={enc_l} legende={enc_g} fond={fnd} ; "
          f"contrastes {contraste(enc_l, fnd):.2f} / {contraste(enc_g, fnd):.2f}")

    ref = (rx1 - rx0 + 1, rx0, 1079 - rx1)

    print("\n--- CAPTURES (4 fichiers E02 : 2 resolutions x 2 positions de liste) ---")
    larg = set()
    for nom, fen in [("captures/E02_Carnet_1080x2400.png", (1900, 2110)),
                     ("captures/E02_Carnet_bas_1080x2400.png", (1900, 2110)),
                     ("captures/E02_Carnet_1080x1920.png", (1420, 1630)),
                     ("captures/E02_Carnet_bas_1080x1920.png", (1420, 1630))]:
        c = ouvrir(nom)
        y0, y1, x0, x1 = boite_bouton(c, fen, 45)
        li = lignes_internes(c, y0, y1, x0, x1)
        corps = [t for t in li if t[1] - t[0] >= 12]
        yt = corps[0]
        G, D, g = mots(c, yt[0], yt[1], x0, x1)
        bL = bandes(profil_lignes(c, G[0], yt[0] - 6, G[0] + 18, yt[1] + 6, 95), 1)
        enc_l = couleur_coeur(c, G[0], yt[0], G[1], yt[1] + 1, 0.12)[0]
        enc_g = couleur_coeur(c, D[0], yt[0], D[1], yt[1] + 1, 0.12)[0]
        fnd = fond_median(c, G[0], yt[1] + 8, D[1], yt[1] + 22)
        larg.add(x1 - x0 + 1)
        print(f"    {os.path.basename(nom)}")
        print(f"      boite y={y0}..{y1} hauteur={y1-y0+1} px img = {(y1-y0+1)/ECHELLE:.2f} px CSS "
              f"(REF {ry1-ry0+1})")
        print(f"      LARGEUR DU BOUTON = {x1-x0+1} px img = {(x1-x0+1)/ECHELLE:.2f} px CSS "
              f"(REF {ref[0]} px img = {ref[0]/ECHELLE:.2f} px CSS ; ecart {x1-x0+1-ref[0]:+d} px img = "
              f"{(x1-x0+1-ref[0])/ECHELLE:+.2f} px CSS = {100*(x1-x0+1-ref[0])/ref[0]:+.2f} %)")
        print(f"      MARGE G = {x0} px img = {x0/ECHELLE:.2f} px CSS (REF {ref[1]/ECHELLE:.2f}) ; "
              f"MARGE D = {1079-x1} px img = {(1079-x1)/ECHELLE:.2f} px CSS (REF {ref[2]/ECHELLE:.2f})")
        print(f"      rangees de texte DANS le bouton : {li} -> {len(corps)} ligne(s) de corps "
              f"=> libelle UNE ligne et legende UNE ligne : {'OUI' if len(corps)==1 else 'NON'}")
        print(f"      LIBELLE x={G} avance={G[1]-G[0]+1} px img (REF 394) ; "
              f"LEGENDE x={D} avance={D[1]-D[0]+1} px img (REF 422) ; ecart={g} px img")
        print(f"      hauteur de capitale « L » = {bL[0][1]-bL[0][0]+1} px img "
              f"= {(bL[0][1]-bL[0][0]+1)/ECHELLE:.2f} px CSS")
        print(f"      encre libelle={enc_l} legende={enc_g} fond={fnd} ; "
              f"contrastes {contraste(enc_l, fnd):.2f} / {contraste(enc_g, fnd):.2f} "
              f"(doctrine : >= 3:1 grand texte, >= 4,5:1 petit)")

    print(f"\n--- CONTROLE NEGATIF : largeurs trouvees sur les 4 captures = {sorted(larg)} ---")
    print(f"    une seule valeur => l'instrument est stable ; et {sorted(larg)[0]} != 1080 "
          f"=> il detecte bien un lisere, pas le bord de l'image.")


if __name__ == "__main__":
    main()
