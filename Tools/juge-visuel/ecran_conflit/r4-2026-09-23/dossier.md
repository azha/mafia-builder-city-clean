# Dossier aveugle — ㉙ Le conflit — r4 — 2026-09-23

## Autorité et périmètre

- Référence visuelle unique : `reference-1080x2102.png` (1080×2102).
- Capture principale : `capture-1080x2400.png` (1080×2400).
- Autre résolution, position initiale : `capture-1080x1920.png` (1080×1920).
- Preuve de défilement à la même résolution : `capture-1080x1920-bas.png` (1080×1920).
- Juger l'écran de conflit, son insertion dans le shell, son scroll et sa fidélité à la référence.
- Ne pas lire le code, les anciens rapports ni l'historique git. Le présent dossier et les quatre PNG sont les seules pièces.

## Provenance des captures

Les trois captures jeu ont été produites par le même test PlayMode déterministe, dans le vrai `AppShell`, sur une `RenderTexture` native de la taille annoncée. La capture `-bas` est prise après déplacement du `ScrollRect` à son extrémité basse ; elle sert uniquement à prouver l'accès à Saltline et au CTA sur 1920 px.

Journal : `/tmp/conflit-ds-capture-r6b.log`.

- `capture-1080x1920.png` : ligne 997.
- `capture-1080x1920-bas.png` : ligne 1027.
- `capture-1080x2400.png` : ligne 1203.
- Résultat capture : `passed=1 failed=0`, lignes 1276 et 1336.
- Résultat suite fonctionnelle : `/tmp/conflit-ds-r6-tests.log`, `passed=32 failed=0`, lignes 3495 et 3555.

Les DTO de l'ordre sont déterministes : lieutenant `Lt. Kest`, famille `La Coil`, axe `infrastructure`, aucun engagement antérieur. Ils prouvent le rendu et l'interaction, pas l'état d'un compte live. Le fichier de secrets de capture annoncé dans un ancien handoff n'existe pas sur cette machine ; aucune valeur live n'est donc revendiquée.

## Contraintes de données à ne pas confondre avec un écart graphique

Le client ne reçoit ni possession rivale, ni bâtiment rival, ni district cible. L'unique choix servi au POST est un axe parmi `muscle`, `finance`, `intel`, `infrastructure`, `leadership`. Il serait donc faux d'imprimer l'exemple de maquette « l'entrepôt de Dépôt-Est » comme s'il venait du compte. Pour l'axe déterministe `infrastructure`, la cible reste honnêtement « leurs installations » et la prise devient « la ferraille de leurs installations ». Juger la hiérarchie et la fonction de la fiche ; classer la précision du bâtiment en arbitrage de données, pas en invention attendue du client.

Le shell sans session affiche `ARGENT —`, `JOUR —` et `CHALEUR`. Ces valeurs absentes sont assumées. La géométrie, le manomètre, la scène urbaine, les insets et le dock restent à juger.

## États et interactions

- La capture principale montre l'état nominal complet : ordre composé, famille ciblée, quatre familles, réplique et CTA actif.
- Sur 1080×2400, tout le dossier et la bande basse sont visibles sans défilement.
- Sur 1080×1920, l'état initial privilégie le début de l'ordre ; la preuve `-bas` montre l'extrémité accessible et le CTA entier au-dessus du dock.
- Les états pressé/confirmé, réseau, historique non vide et absence de gros bras ne sont pas fournis dans ce dossier.

## Empreintes SHA-256

- `reference-1080x2102.png` : `57b9ccb511bee9de4ab577882fca0933fbee7a2fa17eb41cb18bde9d2446eabf`
- `capture-1080x2400.png` : `607dafc65def8cc050adcf65dd4f7971c569b1ddb0930ccc24d0d9f5666802d1`
- `capture-1080x1920.png` : `b9d72d19117a510505f2abb58b3be7628de43eecde3a22dce35b126455bd577a`
- `capture-1080x1920-bas.png` : `4e10dc7c751dbca6873069b64660fee163da99f2fe6aea8f4f504ffd27e77e50`

## Attendu du juge

Appliquer strictement le mandat visuel du projet : commencer par les contrôles positifs, mesurer les écarts par parties, vérifier les deux résolutions et le scroll, classer bloquant/majeur/mineur/assumé/arbitrage, puis écrire `rapport.md` dans ce dossier. Toute mesure doit être reproductible par un script placé sous `mesures/`.
