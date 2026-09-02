#!/usr/bin/env python3
"""Refuse un arbre (ou un commit) dont un atlas de police a été BLANCHI à 1x1.

⛔ POURQUOI (mesuré 4 runs sur 4, puis constaté COMMITÉ le 2026-09-02).
   Chaque run PlayMode réduit `LiberationSans SDF.asset` de `m_Width: 1024` à `m_Width: 1` —
   la texture d'atlas est VIDÉE, ce n'est pas un repack de coordonnées. Restaurer à la main
   marche tant qu'on y pense : `pilote-F` l'a commité (`m_Width: 1`) pendant que `main` le
   porte à 1024. Un merge naïf ferait entrer le fichier vide, et **tout texte TMP rendu en
   LiberationSans disparaîtrait** — dans un APK que personne ne relit glyphe par glyphe.
   ⇒ *Un geste qui dépend de la vigilance d'un lecteur n'est pas une garde.* Celui-ci
   s'exécute, et il refuse.

⚠️ CE QU'IL NE FAIT PAS : il ne répare rien et ne devine pas la bonne valeur. Il NOMME le
   fichier et le commit à restaurer (`git checkout <ref> -- <fichier>`), parce que la bonne
   version dépend de qui a raison — et ça, seul un humain le sait.
"""
import pathlib, re, subprocess, sys

# ⛔⛔ LA GRANDEUR QUI DISCRIMINE N'EST PAS CELLE QU'ON ATTRAPE EN PREMIER (mesuré 2026-09-02).
#    Ma v1 lisait `m_Width`. Il apparaît **461 fois** dans `DejaVuSans SDF.asset` — presque toutes
#    sont les métriques PAR GLYPHE. Elle lisait donc la largeur du premier glyphe (69) et la
#    comparait à un plancher de 64 : elle passait **par chance, à trois unités près**, et un glyphe
#    plus étroit l'aurait fait crier au vidage. Elle a attrapé le vrai cas pour la mauvaise raison.
#    ⇒ `m_CompleteImageSize` est la charge utile de la TEXTURE, sans homonyme : 1 048 576 intacte,
#      **1** vidée. Une seule occurrence, aucune ambiguïté, aucun seuil à choisir.
PLANCHER = 1024   # octets ; une texture réelle en fait ~1 Mo, une vidée en fait 1.

def taille_texture(contenu):
    m = re.search(r'm_CompleteImageSize:\s*(\d+)', contenu)
    return int(m.group(1)) if m else None

def atlas_du_depot(racine):
    return sorted(p for p in racine.rglob('*SDF.asset')
                  if 'Examples' not in str(p) and p.is_file())

def main():
    ref = sys.argv[1] if len(sys.argv) > 1 else None
    racine = pathlib.Path('Assets')
    fichiers = atlas_du_depot(racine)
    # ⛔ ANTI-VACUITÉ : zéro atlas trouvé rendrait « aucun blanchi » — un vert de non-exécution.
    if not fichiers:
        print("⛔ AUCUN atlas *SDF.asset trouvé sous Assets/ — ce contrôle n'a rien lu.")
        return 2
    blanchis = []
    print(f"  {len(fichiers)} atlas examiné(s){f' @ {ref}' if ref else ' (arbre de travail)'}")
    for f in fichiers:
        rel = str(f)
        if ref:
            r = subprocess.run(['git', 'show', f'{ref}:{rel}'], capture_output=True, text=True)
            if r.returncode != 0:
                print(f"    {f.name:30} absent de {ref}"); continue
            # ⛔ PAS DE TRONCATURE : le bloc de texture vit APRÈS des centaines d'entrées de
            #    glyphes. Lire 8 000 caractères rendait 2 fichiers sur 3 « non mesurables » — une
            #    couverture d'un tiers pour une garde qui se croyait complète.
            contenu = r.stdout
        else:
            contenu = f.read_text(encoding='utf-8', errors='replace')
        w = taille_texture(contenu)
        if w is None:
            print(f"    {f.name:30} m_CompleteImageSize ABSENT — non mesurable, je ne conclus pas")
            continue
        etat = 'ok' if w >= PLANCHER else '⛔ BLANCHI'
        print(f"    {f.name:30} texture={w} octets  {etat}")
        if w < PLANCHER:
            blanchis.append(rel)
    if blanchis:
        print(f"\n  ⛔ {len(blanchis)} atlas VIDÉ(S) — refus. Tout texte TMP rendu avec eux disparaîtrait.")
        for rel in blanchis:
            print(f"     restaurer :  git checkout main -- '{rel}'")
        return 1
    print("\n  ⇒ ✅ aucun atlas vidé.")
    return 0

sys.exit(main())
