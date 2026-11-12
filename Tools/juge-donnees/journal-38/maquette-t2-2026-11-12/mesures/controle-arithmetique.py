#!/usr/bin/env python3 -I
"""Contrôle d'arithmétique de la table de couverture — ㊳ Le journal, mode maquette.

Convention (mandat §5) : UNE LIGNE PAR CLÉ B (appariée ou non) + UNE LIGNE PAR ÉLÉMENT M NON APPARIÉ.
  |clés B| + |éléments M non appariés| = nombre de lignes.

Deux clés B qui portent la même information gardent chacune leur ligne (le doublon est noté dans la
colonne « note »), sinon l'équation ne ferme plus.

`--negatif` injecte une faute (une ligne retirée) : le script DOIT rougir (rc != 0).
"""
import json
import os
import sys

OUT = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────────────────────────────────────
# B — une entrée par CLÉ servie. mesure : MESURÉE (fichier) | DÉDUIT (raison)
# ─────────────────────────────────────────────────────────────────────────────
B = [
    # route 1 — GET /v1/ambient/feed — MESURÉE sur la pile (build 8d0184a4)
    ("B01", "ambient/feed", "events[].event_id",            "MESURÉE 02-ambient-feed.json", None,  "id opaque — plomberie"),
    ("B02", "ambient/feed", "events[].district",            "MESURÉE 02-ambient-feed.json", "M19", "servi en SLUG « district-16 » ; M19 dessine le NOM"),
    ("B03", "ambient/feed", "events[].kind",                "MESURÉE 02-ambient-feed.json", "M18", "doublon de B05 (descriptor = ambient.micro_event.<kind>)"),
    ("B04", "ambient/feed", "events[].channel",             "MESURÉE 02-ambient-feed.json", None,  "3 valeurs ; AUCUN libellé i18n servi"),
    ("B05", "ambient/feed", "events[].descriptor_i18n_key", "MESURÉE 02-ambient-feed.json", "M18", ""),
    ("B06", "ambient/feed", "events[].recency_band",        "MESURÉE 02-ambient-feed.json", "M20", "aussi M17 (pastille) et M22"),
    ("B07", "ambient/feed", "total",                        "MESURÉE 02-ambient-feed.json", "M08", "le SEUL total servi des trois listes"),
    ("B08", "ambient/feed", "limit",                        "MESURÉE 02-ambient-feed.json", None,  "pagination — plomberie"),
    ("B09", "ambient/feed", "offset",                       "MESURÉE 02-ambient-feed.json", None,  "pagination — plomberie"),
    # route 2 — GET /v1/news/feed — MESURÉE
    ("B10", "news/feed", "beats[].beat_id",                      "MESURÉE 03-news-feed.json", None,  "id opaque — plomberie (clé du GET détail)"),
    ("B11", "news/feed", "beats[].headline_i18n_key",            "MESURÉE 03-news-feed.json", "M14", ""),
    ("B12", "news/feed", "beats[].headline_params",              "MESURÉE 03-news-feed.json", "M14", "objet libre — doublon de B13..B16"),
    ("B13", "news/feed", "beats[].headline_params_fields.district", "MESURÉE 03-news-feed.json", "M14", "valeur mesurée « district-7 » : SLUG dans la fente ICU {district}"),
    ("B14", "news/feed", "beats[].headline_params_fields.subject",  "MESURÉE 03-news-feed.json", None, "clé i18n du sujet ; absente sur cooper_affair"),
    ("B15", "news/feed", "beats[].headline_params_fields.outlet",   "MESURÉE 03-news-feed.json", "M12", "doublon de B18"),
    ("B16", "news/feed", "beats[].headline_params_fields.frame",    "MESURÉE 03-news-feed.json", "M16", "doublon (brut) de B19"),
    ("B17", "news/feed", "beats[].category",                      "MESURÉE 03-news-feed.json", None,  "5 valeurs ; AUCUN libellé i18n servi"),
    ("B18", "news/feed", "beats[].outlet_i18n_key",               "MESURÉE 03-news-feed.json", "M12", ""),
    ("B19", "news/feed", "beats[].frame_tag_i18n_key",            "MESURÉE 03-news-feed.json", "M16", "null sur 15 des 20 beats mesurés"),
    ("B20", "news/feed", "beats[].district",                      "MESURÉE 03-news-feed.json", "M15", "servi en SLUG ; M15 dessine le NOM"),
    ("B21", "news/feed", "beats[].recency_band",                  "MESURÉE 03-news-feed.json", "M13", ""),
    ("B22", "news/feed", "nextCursor",                            "MESURÉE 03-news-feed.json", None,  "pagination — aucun geste de page dessiné"),
    # route 3 — GET /v1/random-world/active — MESURÉE À VIDE ; clés DÉDUITES de l'interface
    ("B23", "random-world/active", "events[].event_id",        "DÉDUIT (corps mesuré VIDE sur compte frais — random-world.projection.service.ts:51-58)", None, "id opaque"),
    ("B24", "random-world/active", "events[].template_i18n_key","DÉDUIT (idem)", None, "14 clés random_world.template.* servies"),
    ("B25", "random-world/active", "events[].district",        "DÉDUIT (idem)", None, "slug"),
    ("B26", "random-world/active", "events[].severity_band",   "DÉDUIT (idem)", None, "journal.gravite.{faint,noticeable,heavy} DÉJÀ servis"),
    ("B27", "random-world/active", "events[].phase_band",      "DÉDUIT (idem)", None, "journal.bloc.{ca_commence,ca_se_deploie,ca_retombe,ca_traine,ca_ne_partira_pas} DÉJÀ servis"),
    ("B28", "random-world/active", "events[].recency_band",    "DÉDUIT (idem)", None, ""),
    # route 4 — POST /v1/ambient/attend/:id — DÉDUIT (POST INTERDIT par le dossier : événement GLOBAL)
    ("B29", "POST ambient/attend/:id", "event_id",          "DÉDUIT (POST interdit — ambient-attend-view.ts:13-19)", None, ""),
    ("B30", "POST ambient/attend/:id", "district",          "DÉDUIT (idem)", None, "slug"),
    ("B31", "POST ambient/attend/:id", "status",            "DÉDUIT (idem)", None, "toujours 'attended'"),
    ("B32", "POST ambient/attend/:id", "residue_band",      "DÉDUIT (idem)", "M24", "4 bandes = les 4 cadres 155-158"),
    ("B33", "POST ambient/attend/:id", "residue_i18n_key",  "DÉDUIT (ambient-attend-view.ts:24-29)", "M24", ""),
    # route 5 — GET /v1/news/beats/:id — HORS liste du dossier ; non exercée
    ("B34", "news/beats/:id", "beat_id",                   "DÉDUIT (route non exercée — news.projection.service.ts:137-170)", None, ""),
    ("B35", "news/beats/:id", "headline_i18n_key",         "DÉDUIT (idem)", None, ""),
    ("B36", "news/beats/:id", "headline_params",           "DÉDUIT (idem)", None, ""),
    ("B37", "news/beats/:id", "headline_params_fields.district", "DÉDUIT (idem)", None, ""),
    ("B38", "news/beats/:id", "headline_params_fields.subject",  "DÉDUIT (idem)", None, ""),
    ("B39", "news/beats/:id", "headline_params_fields.outlet",   "DÉDUIT (idem)", None, ""),
    ("B40", "news/beats/:id", "headline_params_fields.frame",    "DÉDUIT (idem)", None, ""),
    ("B41", "news/beats/:id", "body_i18n_key",             "DÉDUIT (idem)", None, "LE TEXTE de la une — rien ne l'ouvre dans les 6 cadres"),
    ("B42", "news/beats/:id", "body_params",               "DÉDUIT (idem)", None, ""),
    ("B43", "news/beats/:id", "category",                  "DÉDUIT (idem)", None, ""),
    ("B44", "news/beats/:id", "frame_tag_i18n_key",        "DÉDUIT (idem)", None, ""),
    ("B45", "news/beats/:id", "district",                  "DÉDUIT (idem)", None, "slug"),
    ("B46", "news/beats/:id", "outlet_i18n_key",           "DÉDUIT (idem)", None, ""),
    ("B47", "news/beats/:id", "byline_i18n_key",           "DÉDUIT (idem)", None, "le NOM du journaliste"),
    ("B48", "news/beats/:id", "sourceless_badge",          "DÉDUIT (idem)", None, "« sans source citée »"),
    ("B49", "news/beats/:id", "wire_badge",                "DÉDUIT (idem)", None, "« dépêche »"),
    ("B50", "news/beats/:id", "subject_i18n_key",          "DÉDUIT (idem)", None, ""),
    # route 6 — GET /v1/random-world/known-couplings — HORS liste ; mesurée À VIDE
    ("B51", "random-world/known-couplings", "couplings[].pair_i18n_key",            "DÉDUIT (corps mesuré VIDE — 05-random-world-known-couplings.json)", None, "2 clés random_world.coupling.pair.* servies"),
    ("B52", "random-world/known-couplings", "couplings[].source_system_label",      "DÉDUIT (idem)", None, "⚠ libellé EN EN DUR côté back (R2.2/F1)"),
    ("B53", "random-world/known-couplings", "couplings[].target_system_label",      "DÉDUIT (idem)", None, "idem"),
    ("B54", "random-world/known-couplings", "couplings[].discovered_recency_band",  "DÉDUIT (idem)", None, ""),
    # route 7 — POST /v1/random-world/hollow/:eventId/attend-funeral — HORS liste ; DÉDUIT
    ("B55", "POST random-world/hollow/:id/attend-funeral", "event_id", "DÉDUIT (random-world.controller.ts:90-94)", None, ""),
    ("B56", "POST random-world/hollow/:id/attend-funeral", "status",   "DÉDUIT (idem)", None, "'attended'"),
]

# ─────────────────────────────────────────────────────────────────────────────
# M — un élément porteur d'information par entrée. apparie = la clé B qui le porte.
# ─────────────────────────────────────────────────────────────────────────────
M = [
    ("M01", "barre : ARGENT « 24 850 € »",                  None,  "HORS DOMAINE (barre commune)"),
    ("M02", "barre : CHALEUR « Tiède » + jauge",            None,  "HORS DOMAINE (barre commune)"),
    ("M03", "barre : « JOUR 12 » / « Plein jour »",         None,  "HORS DOMAINE (barre commune)"),
    ("M04", "enseigne : « Le journal »",                    None,  "COPIE STATIQUE — journal.bloc.le_journal"),
    ("M05", "enseigne : « ce qui se dit ce matin »",        None,  "COPIE STATIQUE — journal.bloc.ce_qui_se_dit_ce_matin"),
    ("M06", "compteur « à la une » (01)",                   None,  "ASSUMÉ (décision) — aucun total servi par news/feed"),
    ("M07", "libellé « à la une »",                         None,  "COPIE STATIQUE — journal.bloc.a_la_une"),
    ("M08", "compteur « dans la rue » (03 / 02)",           "B07", ""),
    ("M09", "libellé « dans la rue »",                      None,  "COPIE STATIQUE — journal.bloc.dans_la_rue"),
    ("M10", "compteur « en cours » (00)",                   None,  "ÉCART NEUF — aucun total servi par random-world/active, aucune décision"),
    ("M11", "libellé « en cours »",                         None,  "COPIE STATIQUE — journal.bloc.en_cours"),
    ("M12", "une : nom du journal",                         "B18", ""),
    ("M13", "une : mot de fraîcheur + sa teinte",           "B21", ""),
    ("M14", "une : titre (gabarit ICU rempli)",             "B11", ""),
    ("M15", "une : NOM de quartier (.cle)",                 "B20", "servi en slug, dessiné en nom"),
    ("M16", "une : étiquette d'angle",                      "B19", ""),
    ("M17", "brève : pastille (teinte)",                    "B06", "2 teintes pour 3 bandes"),
    ("M18", "brève : descripteur",                          "B05", "capitale initiale ajoutée"),
    ("M19", "brève : NOM de quartier",                      "B02", "servi en slug, dessiné en nom"),
    ("M20", "brève : mot de fraîcheur + sa teinte",         "B06", ""),
    ("M21", "brève : marque « visée » (cerne + liseré)",    None,  "ASSUMÉ (décision) — aucune clé ne désigne la brève"),
    ("M22", "cardinal de la liste des brèves (3 / 2)",      "B07", ""),
    ("M23", "CTA « Y PRÊTER ATTENTION »",                   None,  "COPIE STATIQUE — journal.bloc.y_preter_attention ; geste = route 4"),
    ("M24", "note de pied (1 avant geste + 4 bandes)",      "B33", ""),
]


def recompter(b, m):
    nb_B = len(b)
    apparies = {x[2] for x in m if x[2]}
    m_non_app = [x for x in m if x[2] is None]
    lignes = nb_B + len(m_non_app)
    return nb_B, len(m_non_app), lignes, apparies, m_non_app


def verifier(b, m, bavard=True):
    ok = True
    nb_B, nb_Mna, lignes, apparies, m_non_app = recompter(b, m)
    ids_B = [x[0] for x in b]
    ids_M = [x[0] for x in m]
    if len(set(ids_B)) != len(ids_B):
        print("ERREUR : id B en double"); ok = False
    if len(set(ids_M)) != len(ids_M):
        print("ERREUR : id M en double"); ok = False
    inconnues = apparies - set(ids_B)
    if inconnues:
        print("ERREUR : M apparié à une clé B inexistante : %s" % sorted(inconnues)); ok = False
    # chaque clé B citée dans la colonne « apparie » de B doit exister côté M
    for bid, _, _, _, mref, _ in b:
        if mref and mref not in ids_M:
            print("ERREUR : %s renvoie à %s, absent de M" % (bid, mref)); ok = False
    if bavard:
        print("|clés B|                  = %d" % nb_B)
        print("|éléments M|              = %d   (dont appariés : %d)" % (len(m), len(m) - nb_Mna))
        print("|éléments M non appariés| = %d" % nb_Mna)
        print("SOMME = %d + %d           = %d lignes" % (nb_B, nb_Mna, lignes))
        print("B appariés à un M : %d  |  B sans M (« passé à côté ? » ou plomberie) : %d"
              % (sum(1 for x in b if x[4]), sum(1 for x in b if not x[4])))
        print("M non appariés :")
        for x in m_non_app:
            print("   %s  %-48s  %s" % (x[0], x[1], x[3]))
    return ok, lignes


if "--negatif" in sys.argv:
    print("=== CONTRÔLE NÉGATIF : on retire une ligne M non appariée, la somme annoncée (68) doit casser ===")
    ok, lignes = verifier(B, [x for x in M if x[0] != "M21"], bavard=False)
    attendu = 68
    print("lignes recomptées = %d  |  annoncé dans le rapport = %d" % (lignes, attendu))
    if lignes != attendu:
        print("ROUGE comme attendu : le recompte (%d) contredit le chiffre annoncé (%d)." % (lignes, attendu))
        sys.exit(1)
    print("PROBLÈME : le contrôle négatif n'a pas rougi.")
    sys.exit(0)

print("=== CONTRÔLE POSITIF — table de couverture ㊳ Le journal (maquette t2, 2026-11-12) ===")
ok, lignes = verifier(B, M)
ATTENDU = 68
print()
if not ok or lignes != ATTENDU:
    print("ÉCHEC : recompte %d != annoncé %d (ou table incohérente)" % (lignes, ATTENDU))
    sys.exit(1)
json.dump({"cles_B": [dict(zip(("id", "route", "cle", "mesure", "apparie_M", "note"), x)) for x in B],
           "elements_M": [dict(zip(("id", "element", "apparie_B", "note"), x)) for x in M],
           "comptes": {"B": len(B), "M": len(M),
                       "M_non_apparies": sum(1 for x in M if x[2] is None), "lignes": lignes}},
          open(os.path.join(OUT, "table-couverture.json"), "w", encoding="utf-8"),
          indent=1, ensure_ascii=False)
print("VERT : %d = %d  — table-couverture.json écrite" % (lignes, ATTENDU))
