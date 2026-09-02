# Autonomie + Blanchiment — les clés (item 0.6)

> `8` clés générées depuis le code. **`en` = le littéral EXACT**, en additif.

## Une nuance : glyphe SEUL vs glyphe DANS une phrase

· Autonomie rend `[$] Opportunity cost` — un glyphe **suivi de mots**. La phrase entière passe
  par une clé : le traducteur doit pouvoir déplacer ou adapter les mots, et le crochet fait
  partie de la ligne telle qu'elle se lit.
· Blanchiment rend `[####]`, `[###.]`… — des barres **sans un mot**. Elles ne passent pas :
  il n'y a rien à traduire, et les keyer inviterait à « localiser » une jauge.

★ La règle n'est donc pas « un crochet ⇒ on épargne », c'est **« y a-t-il quelque chose à
lire ? »**. Sur ⑨ et Famille les glyphes étaient seuls ; ici l'un des deux écrans les mêle à du
texte, et la même règle donne deux réponses opposées.

| clé | `en` attendu (byte-identique) |
|---|---|
| `autonomie.etat.elevated_exposure` | `[!] Elevated exposure` |
| `autonomie.etat.minimal` | `[~] Minimal` |
| `autonomie.etat.opportunity_cost` | `[$] Opportunity cost` |
| `autonomie.etat.tradeoff` | `[<>] Tradeoff` |
| `autonomie.etat.unknown` | `[?] Unknown` |
| `blanchiment.purete.clean` | `Clean` |
| `blanchiment.purete.dirty` | `Dirty` |
| `blanchiment.purete.mostly_clean` | `Mostly clean` |
