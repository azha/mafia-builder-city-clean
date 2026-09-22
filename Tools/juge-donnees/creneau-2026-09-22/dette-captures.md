# Dette des captures — ouverte le 2026-09-23 (non corrigée : consigne de l'orchestrateur)

Instrument : `python3 Tools/verifier-identite-des-captures.py` (« une suite de capture ne photographie QUE le compte de démo »),
lancé avant et après le merge de CLIENT-2 (34aab08c) : sortie IDENTIQUE — ces cas sont antérieurs au regroupement.

| site | forme | date d'entrée | statut |
|---|---|---|---|
| `DelegationScreenPlayModeTests.cs:183` | `auth.SignUp(callsign, "ecran-32-pw", …)` dans une suite qui écrit une image : photographie un compte FRAIS, donc un écran vide | bb75c530, 2026-09-03 | **dette**, non touchée |
| `ReputationScreenPlayModeTests.cs:50` | `auth.SignUp(callsign, "screen-b3-pw", …)` — même forme | ≤ 2026-09-03 | **dette**, non touchée |
| `CaptureSupport.cs:106` | le mot `SignUp` est DANS UNE CHAÎNE (« sur un `SignUp` neuf. ») | — | **faux positif de l'instrument** : il retire les commentaires, pas les chaînes |

À trancher par site avant correction : le `SignUp` sert-il la CAPTURE (alors il faut l'identité de capture, voie `CaptureSousShell`)
ou un test FONCTIONNEL voisin dans le même fichier (alors l'instrument devrait classer par méthode, pas par fichier) ?
Les deux captures de ces classes (`EcranDelegationC1`, `B3C1`) passent déjà par `IdentiteDeCaptureOuEchoue` + garde d'effet
depuis 2a72662a : la lecture du corps dira si ces `SignUp` sont hors capture.
