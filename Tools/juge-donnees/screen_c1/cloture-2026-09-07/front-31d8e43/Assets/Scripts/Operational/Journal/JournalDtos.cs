using System;

namespace MafiaCleanCity.Operational
{
    // screen_c1 « Journal » — DTO générés par Tools/nouvel-ecran.py. Un warning de compilation
    // "field never assigned" est ATTENDU tant que les champs MÉTIER ICI ne sont pas remplis :
    // c'est le signal que ce fichier n'est pas encore fini, pas une erreur de l'outil.

    /// <summary>`GET /v1/news/feed` — LA UNE, mesurée sur le corps réel le 2026-09-03.
    ///
    /// ⛔ CORPS RELEVÉ, pas lu dans une interface TypeScript (`[C1-SONDE]`, compte frais) :
    ///   `{"beats":[{"beat_id":…,"headline_i18n_key":"news_beat.digest.ambient_micro.free_weekly.headline",
    ///     "headline_params":{"outlet":…,"subject":…,"district":"district-12"},
    ///     "category":"brennar_local","outlet_i18n_key":"press.outlet.free_weekly.name",
    ///     "frame_tag_i18n_key":null,"district":"district-12","recency_band":"fading"}]}`
    /// ⚠️ `frame_tag_i18n_key` est arrivé à `null` sur toutes les brèves mesurées : le champ
    /// EXISTE, sa valeur non. Déclaré quand même — un champ absent du DTO est jeté en silence
    /// par `JsonUtility`, et c'est ainsi qu'on ne voit jamais arriver une donnée.</summary>
    [Serializable]
    public class GetNewsFeedResponseDto
    {
        public NewsBeatDto[] beats;
    }

    /// <summary>Une brève. Tout y est CLÉ : le titre, le journal, l'angle — rien n'est du texte.
    /// C'est ce que la maquette montre (les clés s'affichent SOUS les titres) et ce que le cadre
    /// 130 déclare comme son maillon L1 : « écrire les titres et les brèves ».
    ///
    /// ⛔⛔ `headline_params` EST UN OBJET À CLÉS LIBRES et `JsonUtility` NE SAIT PAS LE LIRE.
    /// Mesuré : `{"outlet":…,"subject":…,"district":…}` ici, mais rien ne garantit ces trois
    /// clés-là ailleurs — c'est un gabarit à trous dont le nombre de trous dépend du titre.
    /// ★ C'est exactement le maillon L2 que la maquette ratifiée déclare : « `headline_params`
    ///   est un objet libre ; sans le texte on ignore même combien de trous ». Le corps réel le
    ///   CONFIRME — la dette n'est pas une prudence de dessinateur, elle est dans la donnée.
    /// ⇒ Le champ n'est donc PAS déclaré : le déclarer en `string` rendrait `null`, et le
    ///   déclarer en objet typé inventerait les trois clés observées comme si elles étaient le
    ///   contrat. Tant que les titres ne sont pas écrits, l'écran montre la CLÉ, qui est la
    ///   vérité d'aujourd'hui. Le jour où les textes existent, il faudra un lecteur à la main —
    ///   `I18nCatalog.LecteurJson` a été écrit pour ce même besoin sur le bundle.</summary>
    [Serializable]
    public class NewsBeatDto
    {
        public string beat_id;
        public string headline_i18n_key;
        public string category;              // brennar_local | … (domaine non clos, non mesuré)
        public string outlet_i18n_key;
        public string frame_tag_i18n_key;    // null sur tout le corps mesuré
        public string district;
        public string recency_band;          // fresh | fading | … (mesuré : fading)
    }

    [Serializable] public class GetNewsFeedPayload { public GetNewsFeedResponseDto data; }
    [Serializable] public class GetNewsFeedEnvelope { public GetNewsFeedPayload payload; }
    /// <summary>`GET /v1/news/beats/:id` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetNewsBeatsResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetNewsBeatsPayload { public GetNewsBeatsResponseDto data; }
    [Serializable] public class GetNewsBeatsEnvelope { public GetNewsBeatsPayload payload; }
    /// <summary>`GET /v1/ambient/feed` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetAmbientFeedResponseDto
    {
        public AmbientEventDto[] events;
        public int total;
        public int limit;
        public int offset;
    }

    /// <summary>Une brève de la rue. Corps mesuré le 2026-09-03 :
    ///   `{"event_id":…,"district":"district-16","kind":"stalled_tram",
    ///     "channel":"trade_channel","descriptor_i18n_key":"ambient.micro_event.stalled_tram",
    ///     "recency_band":"fresh"}`
    /// ⚠️ `kind` et `descriptor_i18n_key` disent la même chose sous deux formes — le mot brut et
    /// sa clé. On affiche la CLÉ (doctrine de l'écran : les titres restent à écrire, cadre 130
    /// L1) et on garde `kind` parce qu'il est servi, pas parce qu'on s'en sert.</summary>
    [Serializable]
    public class AmbientEventDto
    {
        public string event_id;
        public string district;
        public string kind;
        public string channel;               // trade_channel | … (domaine non clos, non mesuré)
        public string descriptor_i18n_key;
        public string recency_band;          // mesuré : fresh
    }

    [Serializable] public class GetAmbientFeedPayload { public GetAmbientFeedResponseDto data; }
    [Serializable] public class GetAmbientFeedEnvelope { public GetAmbientFeedPayload payload; }
    /// <summary>`POST /v1/ambient/attend/:id` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostAmbientAttendResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class PostAmbientAttendPayload { public PostAmbientAttendResponseDto data; }
    [Serializable] public class PostAmbientAttendEnvelope { public PostAmbientAttendPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/ambient/attend/:id`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostAmbientAttendBody
    {
        // MÉTIER ICI
    }
    /// <summary>`GET /v1/random-world/active` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetRandomWorldActiveResponseDto
    {
        public RandomWorldEventDto[] events;
    }

    /// <summary>Un événement de la ville. Corps mesuré le 2026-09-03 :
    ///   `{"event_id":…,"template_i18n_key":"random_world.template.hollow_at_the_corner",
    ///     "district":"district-16","severity_band":"faint","phase_band":"lingering",
    ///     "recency_band":"fresh"}`
    ///
    /// ⚠️ `phase_band` PORTE L'ÉCRAN. Le cadre 126 en montre quatre qui passent — « ça commence »,
    /// « ça se déploie », « ça retombe », « ça traîne » — et le cadre 127 en donne un CINQUIÈME
    /// son cadre à lui : `permanent`, « ça ne partira pas ». Mesuré ici : `lingering`.
    /// ⛔ Une phase INCONNUE devra s'afficher TELLE QUELLE, comme la bande de ㊴ : le seul cran
    /// qui compte vraiment est celui qui ne s'en va pas, et le rabattre sur « ça traîne » par
    /// défaut effacerait la seule distinction que cet écran existe pour montrer.
    /// ⚠️ `severity_band` vaut `faint` — le MÊME mot que l'échelle des rejets de ㊴
    /// (`clear→faint→visible→glaring`). Deux pistes différentes qui partagent un vocabulaire :
    /// à NE PAS supposer identiques sans mesure, la leçon de `clear` vs `clean` d'aujourd'hui.</summary>
    [Serializable]
    public class RandomWorldEventDto
    {
        public string event_id;
        public string template_i18n_key;
        public string district;
        public string severity_band;         // mesuré : faint
        public string phase_band;            // mesuré : lingering · `permanent` a son propre cadre
        public string recency_band;          // mesuré : fresh
    }

    [Serializable] public class GetRandomWorldActivePayload { public GetRandomWorldActiveResponseDto data; }
    [Serializable] public class GetRandomWorldActiveEnvelope { public GetRandomWorldActivePayload payload; }
    /// <summary>`GET /v1/random-world/known-couplings` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetRandomWorldKnownCouplingsResponseDto
    {
        // ⛔ MESURÉ VIDE : `{"couplings":[]}` sur un compte frais. La FORME d'un couplage n'est
        // donc PAS mesurable aujourd'hui — et je ne l'invente pas.
        // ★ Le cadre 128 dessine « source → cible » et une ligne « ? → ? » en pointillés : le
        //   dessin prévoit déjà qu'on ne sache pas. Déclarer un `source`/`cible` supposé ferait
        //   passer une hypothèse pour un contrat, et l'écran afficherait des flèches dont
        //   personne n'aurait vérifié le SENS — or le sens est justement ce que ce cadre montre.
        // ⇒ Le tableau est déclaré, ses éléments non : le compte est vrai, la forme attend une
        //   mesure sur un compte qui en a. C'est le vide DÉCLARÉ que le lot demande.
        public string[] couplings;
    }

    [Serializable] public class GetRandomWorldKnownCouplingsPayload { public GetRandomWorldKnownCouplingsResponseDto data; }
    [Serializable] public class GetRandomWorldKnownCouplingsEnvelope { public GetRandomWorldKnownCouplingsPayload payload; }
    /// <summary>`POST /v1/random-world/hollow/:eventId/attend-funeral` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostRandomWorldHollowAttendFuneralResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class PostRandomWorldHollowAttendFuneralPayload { public PostRandomWorldHollowAttendFuneralResponseDto data; }
    [Serializable] public class PostRandomWorldHollowAttendFuneralEnvelope { public PostRandomWorldHollowAttendFuneralPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/random-world/hollow/:eventId/attend-funeral`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostRandomWorldHollowAttendFuneralBody
    {
        // MÉTIER ICI
    }
}
