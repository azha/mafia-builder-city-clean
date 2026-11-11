#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle d'arithmétique OBLIGATOIRE du juge données ⊥ — écran ㊳ « Le journal », mode maquette.

Mandat : « |clés B| + |éléments M non appariés| (+ |rendus F sans source|) = nombre de lignes ».
Mode maquette ⇒ pas de colonne F.

La table de couverture est encodée ICI comme DONNÉE : les trois comptes sont CALCULÉS, jamais
recopiés du rapport. Lancer :  python3 -I controle-arithmetique.py           → rc 0 attendu
                               python3 -I controle-arithmetique.py --negatif → rc 1 attendu
Le contrôle négatif retire une clé B **non appariée** (m=None) sans retirer sa ligne : la somme
baisse de 1 et l'égalité DOIT rougir. ⚠️ Retirer une clé B *appariée* ne contrôle rien : son
élément M redevient « non apparié » et la somme est conservée — première version de ce script,
rc 0 sur le négatif, corrigée ici.
"""
import sys

# ── B : une entrée par (route, clé) réellement mesurée sur la pile 8d0184a4 ────────────────
# m = l'élément M qui la rend, ou None (ligne « ● – » = « passé à côté ? »)
B = [
    # GET /v1/ambient/feed — enveloppe (ambient.controller.ts:53-70)
    ("ambient/feed", "events",                 "M22"),
    ("ambient/feed", "total",                  "M08"),
    ("ambient/feed", "limit",                  None),
    ("ambient/feed", "offset",                 None),
    # GET /v1/ambient/feed — item (AmbientFeedItemView, ambient.projection.service.ts:38-45)
    ("ambient/feed", "event_id",               None),
    ("ambient/feed", "district",               "M18"),
    ("ambient/feed", "kind",                   "M17b"),
    ("ambient/feed", "channel",                None),
    ("ambient/feed", "descriptor_i18n_key",    "M16"),
    ("ambient/feed", "recency_band",           "M19"),
    # POST /v1/ambient/attend/:id (AmbientAttendView, ambient-attend-view.ts:13-19)
    ("ambient/attend", "event_id",             None),
    ("ambient/attend", "district",             None),
    ("ambient/attend", "status",               "M20"),
    ("ambient/attend", "residue_band",         "M21"),
    ("ambient/attend", "residue_i18n_key",     "M21"),
    # GET /v1/news/feed — enveloppe (news.controller.ts:39-48)
    ("news/feed", "beats",                     "M23"),
    ("news/feed", "nextCursor",                None),
    # GET /v1/news/feed — item (NewsFeedBeatView, news.projection.service.ts:119-132)
    ("news/feed", "beat_id",                   None),
    ("news/feed", "category",                  None),
    ("news/feed", "district",                  "M14"),
    ("news/feed", "frame_tag_i18n_key",        "M15"),
    ("news/feed", "headline_i18n_key",         "M12"),
    ("news/feed", "headline_params",           "M12"),
    ("news/feed", "headline_params_fields",    None),
    ("news/feed", "outlet_i18n_key",           "M10"),
    ("news/feed", "recency_band",              "M11"),
    # GET /v1/random-world/active — enveloppe (random-world.controller.ts:46)
    ("random-world/active", "events",          "M09"),
]

# ── M : un élément par information DESSINÉE dans les cadres gatés 155-158 ──────────────────
# (cadre 125 = le même panneau AVANT le geste ; seuls 3 octets diffèrent, cf rapport §Annexe 4)
M = [
    "M01", "M02", "M03", "M04",          # barre partagée : argent, chaleur, jour, phase
    "M05", "M06",                        # titre « Le journal », sous-titre « ce qui se dit ce matin »
    "M07", "M08", "M09",                 # compteurs 01 « à la une », 04 « dans la rue », 03 « en cours »
    "M10", "M11", "M12", "M13", "M14", "M15",   # la une : outlet, fraîcheur, titre, clé annotée, district, angle
    "M16", "M17", "M17b", "M18", "M19",  # brève : titre, clé annotée, kind annoté, district, fraîcheur
    "M20", "M21",                        # CTA éteint, note de bande
    "M22", "M23",                        # liste des brèves rendue (3), la une rendue (1)
]


def comptes(bt, mt):
    apparies = {m for (_r, _k, m) in bt if m is not None}
    inconnus = apparies - set(mt)
    if inconnus:
        raise SystemExit("INCOHERENT : M cites par B et absents de M : %s" % sorted(inconnus))
    m_non_apparies = [m for m in mt if m not in apparies]
    return len(bt), m_non_apparies, len(bt) + len(m_non_apparies)


def main():
    negatif = "--negatif" in sys.argv
    bt = list(B)
    if negatif:
        # une clé B NON APPARIÉE retirée : la somme baisse de 1, LIGNES_RAPPORT ne bouge pas
        i = next(n for n, (_r, _k, m) in enumerate(bt) if m is None)
        retiree = bt.pop(i)
        print("CONTROLE NEGATIF : clé B non appariée retirée = %s" % (retiree,))
    nb_b, m_libres, somme = comptes(bt, M)
    LIGNES_RAPPORT = 36  # le nombre de lignes de la table du rapport.md

    print("|B| (clés de route mesurées)      = %d" % nb_b)
    print("|M non appariés|                  = %d  %s" % (len(m_libres), m_libres))
    print("somme                             = %d" % somme)
    print("lignes de la table du rapport     = %d" % LIGNES_RAPPORT)
    b_sans_m = [(r, k) for (r, k, m) in bt if m is None]
    print("dont « passé à côté ? » (● – )    = %d" % len(b_sans_m))

    ok = somme == LIGNES_RAPPORT
    print("EGALITE |B| + |M non apparies| = lignes : %s" % ("OK" if ok else "ROUGE"))
    if negatif:
        print("CONTROLE NEGATIF : rc attendu != 0")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
