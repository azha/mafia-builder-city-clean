# TD-956 — pas d'appui sur un écran qu'on ne voit pas encore (CLIENT-2, 12/11/2026) — UNE page

**Base** : cumul `5a9fb20f`. **Constat** : pendant les 160 ms de `shell.entree`, `ContentSlot` est à α ≈ 0 mais son `CanvasGroup` garde `blocksRaycasts = true` (la régie n'écrit jamais `blocksRaycasts` : G8, `Modele.cs:12`). Un joueur rapide touche un bouton qu'il ne voit pas.
**Fichiers** : `AppShell.cs` seul + tests. **Regie.cs, CatalogueHud.cs : intacts** (la régie reste ignorante des appuis ; le PROPRIÉTAIRE de la piste, le shell, porte la règle).

## Règle
Tant que la piste `shell.entree` du dernier montage d'onglet est vivante ET que la politique de mouvement est `Plein`, le `CanvasGroup` de `ContentSlot` a `blocksRaycasts = false`. Rendu dès que la piste finit, est détachée ou libérée, et en tout cas jamais gardé faux au-delà.
- **Pas de seuil d'α.** Un seuil serait un chiffre inventé ; la fenêtre entière dure 160 ms < `AnimMaxBlockMs` (250 ms, G8). Un appui perdu pendant le fondu = comportement ordinaire d'une transition. Le blocage couvre exactement la vie de la piste (T1 le mesure).
- **`Reduit` inchangé** : `GelDeMouvement` gèle le canal, ContentSlot reste à α = 1 (harnais L1 « reduit-shell-entree » : 1). On ne pose le blocage QUE sous `Plein` : sous `Reduit` (et `Aucun`) l'écran visible reste touchable, aucun appui perdu.
- **Cold-open / surimpression** : pas de piste (`premierMontageFait`, surimpression) ⇒ pas de blocage. Inchangé.

## Code (AppShell, autour de `AnimerEntreeDeLOnglet`)
1. `AnimerEntreeDeLOnglet()` : au début, après le `Detacher` de la piste précédente, `RendreLesAppuisAuContenu()` (rend `blocksRaycasts = true` : le montage suivant ne reçoit jamais le faux de l'ancien). Après l'`Attacher` : si le handle est vivant ET `RegieMouvement.Courante.Politique == Plein` ⇒ `ContentSlot.GetComponent<CanvasGroup>().blocksRaycasts = false`, `appuisBloques = true`. `quandFini` = `FinDeLEntreeDeLOnglet` (rend les appuis si le handle est celui de la piste courante).
2. Filet : `Update` — si `appuisBloques` et la piste n'est plus vivante (détachée par un autre chemin, libérée hors champ, cible détruite), `RendreLesAppuisAuContenu()`. Aucun chemin ne peut laisser `ContentSlot` sourd.
3. Le `CanvasGroup` est celui que la régie a posé (l'`Attacher` vivant le garantit) ; sans lui (piste refusée ⇒ handle nul) rien n'est bloqué.

## Preuves (gardes d'EFFET : un vrai lancer de rayon, pas la valeur de la propriété)
- **T1** : à `Tick(0)` d'un 2ᵉ montage d'onglet, un `GraphicRaycaster.Raycast` au centre d'un `Graphic` à `raycastTarget` de `ContentSlot` ne rend AUCUN coup sous `ContentSlot` ; à 80 ms idem ; à 170 ms (piste finie) il en rend ≥ 1. **Contrôle positif** : retrait du blocage (bug réinjecté sur copie) ⇒ T1 rouge à `Tick(0)`.
- **T2 `Reduit`** : politique `Reduit`, même geste : le rayon touche dès `Tick(0)`.
- **T3 filet** : piste détachée par `RegieMouvement.Detacher` hors `AnimerEntreeDeLOnglet` ⇒ au `Update` suivant, le rayon touche (aucune surdité résiduelle). Et deux montages d'onglet enchaînés dans le fondu : le second rend, puis rebloque (jamais coincé à faux après la fin du second).
- Non-régression : P3a-c (L1) inchangés.

## Hors périmètre
Surimpressions sans `shell.entree` : TD-955 (SPECS-2). Raycasts du bandeau (`bandeau.entree`) : il reste cliquable à α 0 pendant 200 ms ; consigné, non traité ici (hors du ticket de f2 : « le contenu »).
