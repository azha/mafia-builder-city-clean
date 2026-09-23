# Dossier aveugle — ㉙ Le conflit — r5 — 2026-09-23

## Pièces autorisées

- `reference-1080x2102.png` : référence unique, 1080×2102.
- `capture-1080x2400.png` : capture principale, 1080×2400.
- `capture-1080x1920.png` : autre résolution, position initiale.
- `capture-1080x1920-bas.png` : même résolution après scroll jusqu'en bas.

Ne lire ni code source, ni git, ni anciens rapports. Juger uniquement ces quatre PNG et le présent dossier, selon le mandat visuel du projet. Écrire les mesures reproductibles sous `mesures/` et le verdict dans `rapport.md`.

## Provenance

Les trois images jeu sont produites par le même test PlayMode déterministe dans le vrai `AppShell`, sur des `RenderTexture` natives. La capture `-bas` est prise après déplacement du `ScrollRect` à son extrémité basse.

- Journal capture : `/tmp/conflit-ds-capture-r7.log`, images lignes 719, 749 et 925 ; résultat `passed=1 failed=0`, lignes 998 et 1058.
- Journal fonctionnel : `/tmp/conflit-ds-r7-tests.log`, `passed=32 failed=0`, lignes 3214 et 3274.
- Compilation hors Unity : 17/17 assemblages vertes avant ces deux runs.

## Données et arbitrages déclarés

L'ordre nominal emploie des DTO déterministes : `Lt. Kest`, `La Coil`, axe `infrastructure`, aucun engagement antérieur. Il prouve le rendu et l'interaction, pas l'état d'un compte live. Le secret de capture annoncé dans un ancien handoff est absent de cette machine.

L'API client ne fournit ni possession rivale, ni bâtiment rival, ni district cible. Le POST ne reçoit qu'un axe parmi cinq. Le jeu ne doit donc pas fabriquer « l'entrepôt de Dépôt-Est » : il affiche honnêtement « leurs installations » et « la ferraille de leurs installations ». Classer cette précision en arbitrage de données.

Le shell sans session affiche `ARGENT —`, `JOUR —` et `CHALEUR`. Ces valeurs absentes sont assumées ; sa géométrie reste à juger.

## Interactions et résolutions

- 1080×2400 : état nominal complet, sans défilement.
- 1080×1920 initial : début du dossier, bas volontairement hors fenêtre.
- 1080×1920 bas : Saltline, réplique et CTA doivent être entièrement accessibles au-dessus du dock.
- Les états pressé/confirmé, réseau, historique non vide et absence de gros bras ne sont pas fournis.

## Empreintes SHA-256

- Référence : `57b9ccb511bee9de4ab577882fca0933fbee7a2fa17eb41cb18bde9d2446eabf`
- 2400 : `9cce40efbacb4ac96af76b8c8c5b904ec1ff4fef0a1bfd89da1cd389046dc571`
- 1920 initial : `ff89c9a0f2d351463dcb902da66f8a29ad4a063bbb38f378e78b8621b597a814`
- 1920 bas : `7078a9e30fa1be79c8ed89c4c9f7eb228576506a35e7fe0d00cf7c5f6ca41cd2`
