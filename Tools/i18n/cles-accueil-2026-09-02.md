# Accueil — les clés `accueil.*` (item 0.6)

> `8` clés générées depuis le code. **`en` = le littéral EXACT**, en additif.

## ⚠️ Une subtilité de MESURE, notée pour les écrans restants

Mon recensement comptait 24 « littéraux » sur cet écran. **La plupart n'en étaient pas** :
`NewText(name, parent, value, …)` prend le NOM DE L'OBJET en premier argument — « Glyph »,
« Header », « Label », « WalletBand »… Ces chaînes ne s'affichent nulle part.
★ Un compteur de littéraux qui ne sait pas quel ARGUMENT il regarde surestime le travail et,
pire, désigne des cibles qui n'en sont pas. Le vrai contenu de cet écran est dans ses `return`.

Les glyphes `[....]` `[????]` `[$...]` `[$$$$]` restent intacts : des formes, pas de la langue.

| clé | `en` attendu (byte-identique) |
|---|---|
| `accueil.etat.broke` | `Broke` |
| `accueil.etat.flush` | `Flush` |
| `accueil.etat.high` | `High` |
| `accueil.etat.in_progress` | `In progress` |
| `accueil.etat.locked` | `Locked` |
| `accueil.etat.low` | `Low` |
| `accueil.etat.moderate` | `Moderate` |
| `accueil.etat.unlocked` | `Unlocked` |
