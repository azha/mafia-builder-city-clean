# ⑩ — les clés `exception_detail.*` (item 0.6)

> Généré depuis le code : `7` clés. **`en` = le littéral EXACT**, en additif.

## ⛔ Ce qui ne doit JAMAIS devenir une clé sur cet écran

`MethodFor` rend `ADD_RULE` / `ONE_TIME` / le type d'effet. **Ces chaînes ne s'affichent pas** :
elles partent dans le corps de `POST /v1/exceptions/:id/resolve` comme valeur de `method`.
Les keyer serait sans effet aujourd'hui (repli = littéral) et **casserait la résolution** le jour
où le dictionnaire les porterait — le client enverrait un `method` traduit, et **le serveur ne
le dirait pas** : TD-451 a mesuré qu'un corps mal formé rend 200, ignore le champ, et consomme
la carte quand même.

★ Une chaîne qui VOYAGE vers le serveur n'est pas un libellé, même écrite en majuscules
lisibles. La question n'est pas « est-ce du texte ? » mais « qui le lit — un joueur ou un
handler ? ». Une garde le fixe désormais (`MethodFor_RendUneValeurDeProtocole_…`).

⚠️ De même, le talon `"+" + restantes.Count` est CALCULÉ : aucune clé n'en dérive.

| clé | `en` attendu (byte-identique) |
|---|---|
| `exception_detail.bloc.back` | `Back` |
| `exception_detail.bloc.escalate` | `Escalate` |
| `exception_detail.bloc.issue` | `Issue :` |
| `exception_detail.bloc.lui_apprendre` | `Lui apprendre` |
| `exception_detail.bloc.resolu` | `Résolu ✓` |
| `exception_detail.bloc.risque` | `Risqué` |
| `exception_detail.bloc.suggere` | `Suggéré` |
