namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §2 — le puits générique de la propriété `Parametre` : un graphe sur mesure (la ficelle de ㉘) qui reçoit
    /// une valeur par canal. Un seul point d'extension, testable avec un faux implémenteur. La régie le cherche sur la
    /// cible elle-même (`GetComponent`) à l'attachement.
    /// </summary>
    public interface IParametreAnime
    {
        void PoserParametre(int canal, float v);
    }
}
