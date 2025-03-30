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

/**
 * Cette fonction permet de parser les données effets indésirables provenant des fichiers CTLL
 * @param {*} reactionString 
 * @returns 
 */
function parseMedicalHistory(MedicalHistoryString) {
  const parsedData = {
    Disease: null,
    Continuing: null,
    Comment: null,
  };

  // Supprimer une virgule à la fin de la chaîne, si elle existe
  MedicalHistoryString = MedicalHistoryString.trim().replace(/,$/, '');

  // Vérifier si la chaîne contient une parenthèse fermante
  const firstParenIndex = MedicalHistoryString.indexOf('(');
  const lastParenIndex = MedicalHistoryString.lastIndexOf(')');

  if (firstParenIndex === -1 || lastParenIndex === -1) {
    // Si pas de parenthèses, extraire uniquement la maladie
    parsedData.Disease = MedicalHistoryString.trim();
    return parsedData;
  }

  // Extraire la partie avant la première parenthèse comme Disease
  parsedData.Disease = MedicalHistoryString.slice(0, firstParenIndex).trim();

  // Extraire la partie entre parenthèses
  const detailsString = MedicalHistoryString.slice(firstParenIndex + 1, lastParenIndex).trim();

  // Diviser les détails par le séparateur "-"
  const details = detailsString.split('-').map(item => item.trim());

  // Assigner les valeurs si elles existent
  parsedData.Continuing = details[0] || null;
  parsedData.Comment = details[1] || null;

  return parsedData;
}

/**
 * Cette fonction permet de parser les indications des produits.
 * Elle divise la chaîne en deux parties : "product_name" et "product_indications_eng",
 * en utilisant " - " comme séparateur.
 *
 * @param {string} IndicationString - La chaîne à parser.
 * @returns {Object} - Un objet contenant "product_name" et "product_indications_eng".
 */
function parseIndication(IndicationString) {
  const parsedData = {
    product_name: null,
    product_indications_eng: null,
  };

  // Supprimer une virgule à la fin de la chaîne, si elle existe
  IndicationString = IndicationString.trim().replace(/,$/, '');

  // Diviser la chaîne en deux parties en utilisant " - " comme séparateur
  const parts = IndicationString.split(' - ');

  // Assigner les valeurs si elles existent
  parsedData.product_name = parts[0] ? parts[0].trim() : null;
  parsedData.product_indications_eng = parts[1] ? parts[1].trim() : null;

  return parsedData;
}

export {
  generateRandomString,
  donneformattedDate,
  parseReactionListPT,
  parseMedicalHistory,
  parseIndication,
};
