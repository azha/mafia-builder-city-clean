# Icône d'application Android

**Motif retenu le 2026-09-06 (ruling user, « m1v2 ») : un homme de dos, casquette plate, devant la porte
éclairée d'un conteneur.** Le motif précédent — la pile de conteneurs seule — reste archivé sous
`Tools/fal/generees/2026-09-06/` avec ses variantes ; rien n'est jeté.

Générée par `Tools/fal/generer.py` (`fal-ai/flux/dev`, graine 11) — source, prompt et sidecar de
provenance dans `Source/`.

## Comment le cadre est construit, et la garde qui le prouve

Une icône adaptive ne montre que les **66,7 % centraux** de son calque. Le motif entier est donc placé
dans cette zone visible (288 px sur 432), et la marge que le lanceur rogne est **prolongée par
réplication des bords** — jamais un aplat choisi, qui trancherait sur l'art.

**La garde qui discrimine** : le disque visible doit montrer le motif ENTIER. Écart au motif source —
**composé 0,00** · **contrôle positif, plein cadre : 24,00** niveaux ⇒ le contrôle rougit. Posé plein
cadre, le lanceur ne montrerait que **44 %** de l'image : le haut du conteneur et le sol sont coupés.

⚠️ **Une garde écartée parce qu'elle ne discriminait pas** : « la lumière chaude tombe-t-elle dans le
disque visible ? » rend 99,4 % composé contre 95,5 % plein cadre — sur ce motif la lampe est centrale,
donc elle passe des deux façons. Une garde dont le contrôle positif ne rougit pas ne prouve rien : elle
a été remplacée, pas assouplie.

## Le régime des deux calques

**`sujet-en-fond`** (choix user du 2026-09-06 sur la question A/B) : le fond porte l'image opaque,
l'avant-plan est entièrement transparent. Le lanceur n'anime alors rien — c'est assumé.
`icone_legacy_192.png` et `icone_round_192.png` reprennent la zone visible.

Les `.meta` et leurs GUID sont **inchangés** : remplacer le contenu des PNG suffit, aucune référence de
`ProjectSettings.asset` n'est touchée (24 références Android déjà câblées).
