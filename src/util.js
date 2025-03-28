/**
 * Cette fonction est utilisée pour les tests, elle pourra être supprimée quand le script sera en PROD
 * Elle permet de générer une chaîne de caractères aléatoire de caractères de longueur spécifiée (par défaut 4 caractères)
 * Elle était utilisée pour générer des identifiants aléatoires pour des INSERT pour les tests
 * 
 * @param {number} length - Longueur de la chaîne de caractères à générer
 * @returns {string} - Chaîne de caractères aléatoire
 */
function generateRandomString(length = 4) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters[randomIndex];
  }

  return result;
}

/**
 * Cette fonction retourne une chaîne de caractère formatée en TIMESTAMP pour la date et l'heure
 * Elle permet de stocker la date et l'heure d'export CODEX
 * 
 * @returns {string} - Chaîne de caractère formatée en TIMESTAMP
 */
function donneformattedDate() {
  const now = new Date();

  // Utiliser des méthodes pour obtenir la date et l'heure locales
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Les mois sont indexés à partir de 0
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Cette fonction permet de parser les données effets indésirables provenant des fichiers CTLL
 * @param {*} reactionString 
 * @returns 
 */
function parseReactionListPT_deepseek(reactionString) {
  // Initialiser un objet pour stocker les résultats
  const regex = /^([^(]+)\s*\(([^)]+)\)$/;
  const match = reactionString.match(regex);

  if (!match) {
    return {
      error: "Format de chaîne non reconnu"
    };
  }

  const reaction = match[1].trim();
  const details = match[2].split('-').map(item => item.trim());

  // Vérification qu'on a bien tous les éléments attendus
  if (details.length < 3) {
    return {
      error: "Détails incomplets dans la chaîne"
    };
  }

  return {
    "ReactionListPT": reaction.trim(),
    "Outcome": details[0].trim(),
    "Date": details[1].trim(),
    "Duration": details[2].trim()
  };
}

/**
 * Cette fonction permet de parser les données effets indésirables provenant des fichiers CTLL
 * @param {*} reactionString 
 * @returns 
 */
function parseReactionListPT(reactionString) {
  const parsedData = {
    ReactionListPT: null,
    Outcome: null,
    Date: null,
    Duration: null,
  };

  // // Supprimer une virgule à la fin de la chaîne, si elle existe
  // reactionString = reactionString.trim().replace(/,$/, '');

  // Vérifier si la chaîne contient une parenthèse fermante
  if (!reactionString.includes(')')) {
    // Si pas de parenthèse fermante, extraire la partie avant la première parenthèse ouvrante
    const firstParenIndex = reactionString.indexOf('(');
    parsedData.ReactionListPT = firstParenIndex !== -1
      ? reactionString.slice(0, firstParenIndex).trim()
      : reactionString.trim();
    return parsedData;
  }

  // Expression régulière pour extraire les données
  const pattern = /^(?<ReactionListPT>[^(]+)\s*\((?<Outcome>[^-]+)\s*-\s*(?<Date>[^-]+)\s*-\s*(?<Duration>[^\)]+)\)$/;
  const matches = reactionString.match(pattern);

  if (matches && matches.groups) {
    // Extraire les valeurs capturées par les groupes nommés
    parsedData.ReactionListPT = matches.groups.ReactionListPT.trim();
    parsedData.Outcome = matches.groups.Outcome.trim();
    parsedData.Date = matches.groups.Date.trim();
    parsedData.Duration = matches.groups.Duration.trim();
  }

  return parsedData;
}

export {
  generateRandomString,
  donneformattedDate,
  parseReactionListPT,
};
