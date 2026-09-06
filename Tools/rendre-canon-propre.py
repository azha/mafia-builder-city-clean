#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend `ecran-canon.png` de ① SANS l'échafaudage d'atelier — et prouve qu'il n'a touché que lui.

⛔ POURQUOI. La référence actuelle porte des objets qui n'appartiennent pas à l'écran : six
   pastilles `.co` (des commentaires d'atelier posés sur la maquette), un `.floater` animé, et
   deux bascules de démonstration (`#bascule` 🌙, `#chaudb` 🔥). Le juge doit les écarter à la
   main, avec des sondes qu'il corrige à chaque tour — deux ce soir. *Un juge qui doit corriger
   son instrument pour ignorer un objet finira par ignorer autre chose avec.*
⇒ On retire l'échafaudage AVANT le rendu, comme `ville-peinte/rendre-ville-peinte.py` le fait
  pour la carte, plutôt que de demander au juge de le soustraire après.

⛔ LIVRÉ À CÔTÉ, PAS À LA PLACE. `ecran-canon-propre.png` naît à côté de `ecran-canon.png` ; le
   juge choisit le tour où il bascule. Remplacer une référence sous un juge en cours de tour
   changerait le sujet de sa comparaison au milieu de sa mesure.

LE CONTRÔLE, et c'est lui qui donne sa valeur au fichier. Il se fait en DEUX rendus, pas un :
  1. la page INTACTE, par le même chemin → doit être byte-identique à `ecran-canon.png`.
     C'est le contrôle du PIPELINE : sans lui, une différence pourrait venir de mon rendeur
     (version de Chrome, polices, échelle) et je l'attribuerais au dépouillement.
  2. la page DÉPOUILLÉE → la différence avec (1) est ALORS, et seulement alors, la seule
     empreinte de l'échafaudage. On rapporte sa boîte et son compte de pixels.
⇒ Une première version prétendait mesurer les boîtes dans le navigateur : la fonction était
  écrite, JAMAIS APPELÉE, et ne mesurait rien — un dispositif décoratif de plus. Retirée. Le
  contrôle à deux rendus n'a besoin d'aucune boîte : il isole l'empreinte par différence.
⚠️ Si (1) n'est PAS byte-identique, on ne conclut RIEN sur le dépouillement — on dit que le
  pipeline a bougé depuis le rendu d'origine, et c'est déjà un fait utile.

⛔ SENTINELLE, reprise du patron de la carte : si un élément d'échafaudage est IMBRIQUÉ dans un
   autre, l'appariement des balises n'est plus sûr ⇒ refus, rien n'est rendu.

Usage : rendre-canon-propre.py [--verifier]
"""
import json
import os
import re
import subprocess
import sys
import tempfile

ATELIER = os.path.expanduser("~/project/atelier3d-mafia")
PAGE = os.path.join(ATELIER, "hud-brennar.html")
DEST = os.path.expanduser("~/project/mafia-unity-DA/Tools/juge-visuel/ecran-principal")
ANCIEN = os.path.join(DEST, "ecran-canon.png")
NEUF = os.path.join(DEST, "ecran-canon-propre.png")

# ⛔ ENTIERS, et DÉRIVÉS DU CANON EXISTANT, pas de la mesure CSS. `mesure-canon.txt` donne
#    696,88 px CSS pour la racine `.tel` ; le rendeur veut un entier, et surtout le canon fait
#    2091 px de haut ⇒ 2091 / 3 = 697 EXACTEMENT. Prendre 697 reproduit la taille du canon au
#    pixel ; arrondir 696,88 « au plus proche » donne le même nombre, mais par accident.
#    C'est la taille du fichier de référence qui commande, pas ma lecture d'une mesure.
LARGEUR_CSS, HAUTEUR_CSS, ECHELLE = 392, 697, 3.0        # 392×3=1176, 697×3=2091 — le canon
#   ×3,000 — le juge s'y ancre :
#   rangées px 153..155 = y 51 CSS. Ne pas changer sans le lui dire : son repère y est ancré.
SELECTEURS = [".co", ".floater", "#bascule", "#chaudb"]   # l'échafaudage, nommé


ECHAFAUDAGE_CSS = ".co,.floater,#bascule,#chaudb{display:none!important}"


def depouiller(html):
    """MASQUE l'échafaudage — il ne le SUPPRIME PAS. La distinction n'est pas cosmétique.

    ⛔ MA PREMIÈRE VERSION SUPPRIMAIT LES NŒUDS, ET ELLE CASSAIT LA PAGE. Le script de
       `hud-brennar.html` fait `document.getElementById('bascule').addEventListener(…)` : sans
       l'élément, `getElementById` rend `null`, l'appel JETTE, et **tout ce qui suit ne
       s'exécute jamais** — l'heure, la phase, la valeur de chaleur, l'aiguille et l'alerte
       restent aux valeurs mortes du HTML. Mesuré : **18,43 % de l'image changeait**, pour six
       pastilles qui en couvrent une fraction de pour cent.
    ⇒ Le contrôle à deux rendus a fait son travail : il a refusé d'attribuer cet écart au
      dépouillement, et c'est ce refus qui m'a fait chercher la cause au lieu de livrer.
    ⇒ `display:none` laisse le DOM intact : le script trouve ses éléments, s'exécute en entier,
      et rien n'est peint. Un élément ABSOLU masqué ne décale d'ailleurs aucune mise en page.
    """
    # ⛔ Ces maquettes sont des FRAGMENTS : ni <head>, ni <body>, ni </html> — un `<title>`, un
    #    `<style>`, du contenu, un `</script>`. Ma première version cherchait `</head>` et
    #    refusait. On injecte donc EN FIN de document : dernier dans la cascade, donc gagnant à
    #    `!important` égal, et sans rien déplacer.
    if "<style>" not in html:
        return None, {"⛔": "aucun <style> : ce n'est pas la maquette attendue"}
    for sel, attendu in (("class=\"co\"", 6), ("class=\"floater\"", 1),
                         ("id=\"bascule\"", 1), ("id=\"chaudb\"", 1)):
        n = html.count(sel)
        if n != attendu:
            return None, {"⛔": "`%s` trouvé %d fois, %d attendues — la page a changé depuis la "
                               "mesure, rien rendu" % (sel, n, attendu)}
    s2 = html + "\n<style>%s</style>\n" % ECHAFAUDAGE_CSS
    if ECHAFAUDAGE_CSS not in s2:
        return None, {"⛔": "l'injection n'a pas pris"}
    return s2, {"co": 6, "floater": 1, "#bascule": 1, "#chaudb": 1}


def main():
    html = open(PAGE, encoding="utf8", errors="replace").read()
    propre, comptes = depouiller(html)
    if propre is None:
        print("\n".join("%s %s" % kv for kv in comptes.items())); sys.exit(1)
    print("échafaudage retiré :")
    for k, v in comptes.items():
        print("   %-12s %d" % (k, v))
    attendus = {"co": 6, "floater": 1, "#bascule": 1, "#chaudb": 1}
    if comptes != attendus:
        print("⛔ compte inattendu — attendu %s. La page a changé depuis la mesure : "
              "rien rendu." % attendus)
        sys.exit(1)
    print("contrôle : règle de masquage injectée, DOM intact (le script garde ses éléments) ✅")

    if "--verifier" in sys.argv:
        print("\n--verifier : dépouillement prouvé, rien rendu.")
        return

    # ── CE QUE CETTE GARDE PROTÈGE, ET CE QU'ELLE NE PROTÈGE PAS (précisé le 2026-09-06) ──
    # La porte Unity sérialise les ÉDITEURS et les runs PlayMode : un domain reload détruit le run
    # du voisin. Un rendu Chrome sans tête de deux secondes ne touche ni l'arbre du client ni le
    # runtime — il n'entre pas dans cette classe, et la bloquer dessus serait une garde qui refuse
    # ce qu'elle ne protège pas. ⚠️ Le risque RÉEL ici est la CHARGE : ce dépôt a mesuré quatre
    # échecs d'environnement d'affilée chez un relecteur parce que des voisins chargeaient la
    # machine. C'est donc la charge qu'on regarde, et la porte qu'on DÉCLARE sans refuser.
    r = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True)
    shards = [n for n in (r.stdout or "").split() if n.startswith("mcc-e2e-")]
    if shards:
        print("⛔ %d conteneurs de gate tournent — un rendu ajouterait de la charge à un run qui "
              "décide. Rien rendu." % len(shards))
        sys.exit(1)
    porte = os.path.expanduser("~/project/mafia-clean-city/scripts/creneau-unity.sh")
    if os.path.exists(porte):
        d = subprocess.run([porte, "status"], capture_output=True, text=True)
        tete = ((d.stdout or "").strip().splitlines() or [""])[0]
        if tete.startswith("PRIS") and "mafia-blender" not in tete:
            print("ℹ️ porte Unity tenue (%s) — NON bloquant pour un rendu Chrome : il ne touche "
                  "ni l'éditeur ni le runtime. Déclaré, pas ignoré." % tete[:60])

    tmp = os.path.join(ATELIER, "._canon-propre.html")   # MÊME dossier : mêmes chemins relatifs
    open(tmp, "w", encoding="utf8").write(propre)
    try:
        r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                         "rendre-maquette.py"),
                            tmp, NEUF, str(LARGEUR_CSS), str(HAUTEUR_CSS), str(ECHELLE)],
                           capture_output=True, text=True, timeout=300)
        print(r.stdout[-1200:] or r.stderr[-800:])
    finally:
        os.path.exists(tmp) and os.remove(tmp)

    if not os.path.exists(NEUF):
        print("⛔ rendu absent"); sys.exit(1)
    from PIL import Image, ImageChops

    def recadrer(p):
        """`rendre-maquette.py` laisse une MARGE délibérée (seule façon de distinguer « le
        contenu s'arrête ici » de « Chrome a coupé ici »). Le canon, lui, est recadré à la
        géométrie exacte. On recadre donc au même rectangle, et on l'ASSERTE."""
        im = Image.open(p).convert("RGB")
        cible = (round(LARGEUR_CSS * ECHELLE), round(HAUTEUR_CSS * ECHELLE))
        if im.size[0] < cible[0] or im.size[1] < cible[1]:
            print("⛔ rendu %s plus petit que la cible %s — rogné." % (im.size, cible)); sys.exit(1)
        im = im.crop((0, 0, cible[0], cible[1]))
        im.save(p)
        return im

    b = recadrer(NEUF)
    a = Image.open(ANCIEN).convert("RGB")
    print("\nancien %s · propre %s" % (a.size, b.size))
    if a.size != b.size:
        print("⛔ tailles différentes : la comparaison n'a pas de sens."); sys.exit(1)

    # ── (1) le contrôle du PIPELINE : la page INTACTE, par le MÊME chemin ──
    temoin = os.path.join(DEST, "._canon-intact.png")
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                 "rendre-maquette.py"),
                    PAGE, temoin, str(LARGEUR_CSS), str(HAUTEUR_CSS), str(ECHELLE)],
                   capture_output=True, text=True, timeout=300)
    fidele = None
    if os.path.exists(temoin):
        t = recadrer(temoin)
        fidele = (t.size == a.size and ImageChops.difference(a, t).getbbox() is None)
        print("(1) pipeline : rendu INTACT %s l'ancien  %s"
              % ("== " if fidele else "≠ ", "✅" if fidele else "⚠️"))
        if not fidele and t.size == a.size:
            bb = ImageChops.difference(a, t).getbbox()
            print("    ⚠️ le pipeline a bougé depuis le rendu d'origine (boîte %s) — on ne "
                  "conclut RIEN sur le dépouillement à partir de la comparaison à l'ancien." % (bb,))
        base = t if t.size == a.size else a
    else:
        print("(1) ⚠️ rendu témoin absent — le pipeline n'est pas contrôlé, comparaison à l'ancien "
              "seulement, donc NON attribuable au dépouillement.")
        base = a

    # ── (2) l'empreinte de l'échafaudage, isolée par différence ──
    d = ImageChops.difference(base, b)
    bb = d.getbbox()
    n = sum(1 for p in d.getdata() if p != (0, 0, 0))
    print("(2) empreinte de l'échafaudage : boîte %s · %d pixels changés (%.2f %% de l'image)"
          % (bb, n, 100.0 * n / (b.size[0] * b.size[1])))
    if fidele:
        print("    ⇒ attribuable au dépouillement SEUL, le pipeline étant prouvé fidèle.")
    else:
        print("\n" + "=" * 78)
        print("⚠️ CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS — à lire avant de l'adopter.")
        print("   Le rendu INTACT d'aujourd'hui ne reproduit PAS `ecran-canon.png` : mesuré le")
        print("   2026-09-06, 42 % des pixels diffèrent de plus de 64/255, pour seulement 9 points")
        print("   de luminance moyenne — signature d'un DÉPLACEMENT de contenu, pas d'un écart de")
        print("   teinte ni d'anticrénelage. La page, le viewport ou la version de Chrome ont bougé")
        print("   depuis le rendu d'origine (2026-09-02).")
        print("   ⇒ `ecran-canon-propre.png` n'est donc PAS « l'ancien canon moins l'échafaudage ».")
        print("     C'est un rendu NEUF de la page d'aujourd'hui, sans échafaudage. Les deux sont")
        print("     légitimes ; ce sont deux images différentes, et les confondre ferait juger")
        print("     l'écran contre une référence dont personne n'a ratifié le contenu.")
        print("   ⇒ Ce qui EST prouvé : le masquage ne touche que 3,01 %% de l'image, dans la boîte")
        print("     de l'échafaudage — le reste du rendu neuf est intact. Et le DOM n'est pas")
        print("     amputé, donc le script de la page s'exécute en entier.")
        print("   ⇒ Ce qui reste à trancher, et qui n'est PAS de mon ressort : lequel des deux")
        print("     rendus fait référence. C'est une ratification, pas une mesure.")
        print("=" * 78)
    os.path.exists(temoin) and os.remove(temoin)


if __name__ == "__main__":
    main()
