# Provenance des captures — COPIES avec empreinte (jamais de lien)

> ⚠️ « dernier commit » = le commit du PNG, PAS le SHA de l'arbre qui l'a rendu ((g) 0/16 : non imprimé). ⚠️ Le run a SEGFAULTÉ (EXIT 139) après le test `Capture_EcranReputation_SousChrome` (PASSED) qui a produit ces deux planches ; le test suivant (écran seul, paire) a été tué, ses sorties restaurées, non commitées.

| capture | source | dernier commit du PNG | sha256 | blob | arbre de rendu | note |
|---|---|---|---|---|---|---|
| `capture-1080x2400.png` | `Assets/Screenshots/screen_b3_reputation_sous_chrome_1080x2400.png` @ `f52fbe2` | `f52fbe2 2026-09-07 00:52:59 +0200` | `452ecd57d25d008c…` | `58f71ca6` | non imprimé | sous chrome — `CaptureReputation` (test PASSED avant le segfault) : exerce le cadre face au bandeau ET au dock |
| `capture-1080x1920.png` | `Assets/Screenshots/screen_b3_reputation_sous_chrome_1080x1920.png` @ `f52fbe2` | `f52fbe2 2026-09-07 00:52:59 +0200` | `f444402a6bea1ce2…` | `a9be4765` | non imprimé | sous chrome — `CaptureReputation` (même test) : c’est ICI que le placement (bandeau / dock) se juge |
