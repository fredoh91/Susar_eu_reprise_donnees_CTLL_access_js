import {
  logStream , 
  logger,
} from '../logs_config.js'


/**
 * Cette fonction permet de savoir si un susar est deja dans la base susar_eu_v2 (en fonction de son EV_SafetyReportIdentifier)
 * @param {*} poolSusarSusarEuV2 
 * @param {*} CTLL : tableau 
 * @returns 
 */
async function existeDejaEV_SafetyReportId(poolSusarEuV2, EV_SafetyReportId) {
  const SQL_count = `SELECT count(id) AS Nb FROM susar_eu WHERE ev_safety_report_identifier = '${EV_SafetyReportId}';`
  // console.log(SQL_count)
  const resu = await poolSusarEuV2.query(SQL_count);
  // console.log(resu)
  if (resu.length > 0) {
    return resu[0][0].Nb > 0;
  } else {
    return false;  
  }
}


async function insertInto_susar_eu(connectionSusarEuV2, tbCtLL) {
  const SQL = `INSERT INTO susar_eu (
    ev_safety_report_identifier,
    num_eudract,
    world_wide_id,
    utilisateur_import,
    priorisation,
    id_ctll,
    cas_susar_eu_v1,
    date_reprise_susar_eu_v1,
    created_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`;
  // console.log('ev : ',tbCtLL.EV_SafetyReportIdentifier)
  // console.log('tbCtLL : ',tbCtLL)

  const values = [
    tbCtLL.EV_SafetyReportIdentifier,
    tbCtLL.StudyRegistrationNumber,
    tbCtLL.CaseReportNumber,
    tbCtLL.utilisateur_import,
    tbCtLL.Priorisation,
    tbCtLL.idCTLL,
    true,
    tbCtLL.dateCrea,
    tbCtLL.dateModif
  ];

  try {
    const resu = await connectionSusarEuV2.query(SQL, values);
    if (resu) {
      return resu[0].insertId;
    } else {
      throw new Error('Insertion échouée dans susar_eu');
    }
  } catch (error) {
    logger.error(`Erreur lors de l'insertion dans susar_eu : ${error.message}`);
    throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
  }
}

async function insertInto_medicaments(connectionSusarEuV2, tbMedicaments, idSusarEu) {
  const insertIds = [];

  // console.log ('tbMedicaments : ',tbMedicaments)
  for (const Med of tbMedicaments) {
    const SQL = `INSERT INTO medicaments (
      susar_id,
      nom_produit_brut,
      type_sa_ms_mono,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      Med.ProduitSuspect_EU,
      Med.Type_saMS_Mono,
      Med.dateCrea,
      Med.dateModif
    ];
// console.log('idSusarEu : ',idSusarEu)
// console.log('value medic : ',values)
    try {
      const resu = await connectionSusarEuV2.query(SQL, values);
      if (resu) {
        insertIds.push(resu[0].insertId);
      } else {
        throw new Error('Insertion dans medicaments a échoué');
      }
    } catch (error) {
      logger.error(`Erreur lors de l'insertion dans medicaments : ${error.message}`);
      throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
    }
  }
  return insertIds; // Retourner tous les IDs insérés
}

async function insertInto_effets_indesirables(connectionSusarEuV2, tbEffetsIndesirables, idSusarEu) {
  const insertIds = [];
  for (const EI of tbEffetsIndesirables) {
    const SQL = `INSERT INTO effets_indesirables (
      susar_id,
      reaction_list_pt_ctll,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      EI.Tout,
      EI.dateCrea,
      EI.dateModif
    ];

    try {
      const resu = await connectionSusarEuV2.query(SQL, values);
      if (resu) {
        insertIds.push(resu[0].insertId);
      } else {
        throw new Error('Insertion dans effets_indesirables a échoué');
      }
    } catch (error) {
      logger.error(`Erreur lors de l'insertion dans effets_indesirables : ${error.message}`);
      throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
    }
  }
  return insertIds; // Retourner tous les IDs insérés
}

/**
 * 
 * @param {*} connectionSusarEuV2 
 * @param {*} tbCtLL 
 * @param {*} tbMedicaments 
 * @param {*} tbEffetsIndesirables 
 */
async function createSusarV2(connectionSusarEuV2, tbCtLL, tbMedicaments, tbEffetsIndesirables) {

  // console.log('EV 3 : ',tbCtLL.EV_SafetyReportIdentifier)
    if (await existeDejaEV_SafetyReportId(connectionSusarEuV2, tbCtLL.EV_SafetyReportIdentifier) === false) {
        // logger.info(`Je vais devoir créer des lignes pour ce susar la : ${tbCtLL.idCTLL}`);

        try {
            await connectionSusarEuV2.beginTransaction();
            // console.log('tbCtLL : ',tbCtLL)
            // Insérer dans les différentes tables
            const idSusarEu = await insertInto_susar_eu(connectionSusarEuV2, tbCtLL);
            if (idSusarEu) {
                // console.log(tbMedicaments);
                // process.exit(1)
                await insertInto_medicaments(connectionSusarEuV2, tbMedicaments, idSusarEu);
                await insertInto_effets_indesirables(connectionSusarEuV2, tbEffetsIndesirables, idSusarEu);
                await connectionSusarEuV2.commit();
                // process.exit(1)
            } else {
                throw new Error('Insertion dans susar_eu a échoué');
            }

        } catch (error) {
            await connectionSusarEuV2.rollback();
            logger.error(`Erreur lors de la création du SUSAR : ${error.message}`);
            throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
        }
    } else {
        throw new Error('Le SUSAR existe déjà dans la base de données');
    }
}

export {
  existeDejaEV_SafetyReportId,
  createSusarV2,
}