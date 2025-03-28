import {
  logStream,
  logger,
} from '../logs_config.js'

import {
  parseReactionListPT,
} from "../util.js"


import MedicParser from '../MedicParser.js';


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
  const parser = new MedicParser();

  // console.log ('tbMedicaments : ',tbMedicaments)
  for (const Med of tbMedicaments) {

    const Med_parse = parser.parseMedicCtll(Med.ProduitSuspect_EU)
    const Med_parse_Date = Med_parse.start_date && Med_parse.start_date.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ? Med_parse.start_date.split('/').reverse().join('-') // Convertir 'DD/MM/YYYY' en 'YYYY-MM-DD'
      : null; // Si la date est invalide, définir sur NULL
    let prodCharac = 'NA'
    switch (Med_parse.drug_char) {
      case 'S':
        prodCharac = 'Suspect'
        break
      case 'C':
        prodCharac = 'Concomitant'
        break
      case 'I':
        prodCharac = 'Interacting'
        break
      default:
        prodCharac = 'NA'
        break
    }

    // const prodCharac = Med_parse.drug_char

    const SQL = `INSERT INTO medicaments (
      susar_id,
      nom_produit_brut,
      productcharacterization,
      productname,
      substancename,
      maladie,
      statut_medic_apres_effet,
      date_derniere_admin,
      date_derniere_admin_format_date,
      delai_administration_survenue,
      dosage,
      voie_admin,
      comment,
      type_sa_ms_mono,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      Med.ProduitSuspect_EU,
      prodCharac,
      Med_parse.produit,
      Med_parse.substance,
      Med_parse.indication_pt,
      Med_parse.action_taken,
      Med_parse.start_date,
      Med_parse_Date,
      Med_parse.duration,
      Med_parse.dose,
      Med_parse.route,
      Med_parse.comment,
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

    const EI_parse = parseReactionListPT(EI.Tout)
    // const EI_parse_Date = EI_parse.Date
    const EI_parse_Date = EI_parse.Date && EI_parse.Date.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ? EI_parse.Date.split('/').reverse().join('-') // Convertir 'DD/MM/YYYY' en 'YYYY-MM-DD'
      : null; // Si la date est invalide, définir sur NULL
    // console.log (EI_parse.ReactionListPT)
    // process.exit(1)

    const SQL = `INSERT INTO effets_indesirables (
      susar_id,
      reaction_list_pt_ctll,
      reaction_list_pt,
      outcome,
      date,
      date_format_date,
      duration,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      EI.Tout,
      EI_parse.ReactionListPT,
      EI_parse.Outcome,
      EI_parse.Date,
      EI_parse_Date,
      EI_parse.Duration,
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

/**
 * 
 * @param {*} connectionSusarEuV2 
 * @param {*} tbCtLL 
 * @param {*} tbMedicaments 
 * @param {*} tbEffetsIndesirables 
 */
async function createSusarV2_parLot(connectionSusarEuV2, tbCtLL, tbMedicaments, tbEffetsIndesirables) {
  for (const Ctll of tbCtLL) {
    // console.log('EV 3 : ',tbCtLL.EV_SafetyReportIdentifier)
    if (await existeDejaEV_SafetyReportId(connectionSusarEuV2, Ctll.EV_SafetyReportIdentifier) === false) {
      // logger.info(`Je vais devoir créer des lignes pour ce susar la : ${tbCtLL.idCTLL}`);
      const Medicaments = tbMedicaments.filter(item => item.idCTLL === Ctll.idCTLL);
      const EffetsIndesirables = tbEffetsIndesirables.filter(item => item.idCTLL === Ctll.idCTLL);

      try {
        await connectionSusarEuV2.beginTransaction();

        const idSusarEu = await insertInto_susar_eu(connectionSusarEuV2, Ctll);
        if (idSusarEu) {

          await insertInto_medicaments(connectionSusarEuV2, Medicaments, idSusarEu);
          await insertInto_effets_indesirables(connectionSusarEuV2, EffetsIndesirables, idSusarEu);
          await connectionSusarEuV2.commit();

        } else {
          throw new Error('Insertion dans susar_eu a échoué');
        }

      } catch (error) {
        await connectionSusarEuV2.rollback();
        logger.error(`Erreur lors de la création du SUSAR : ${error.message}`);
        throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
      }
    } else {
      // throw new Error('Le SUSAR existe déjà dans la base de données');
    }
  }
}

export {
  existeDejaEV_SafetyReportId,
  createSusarV2,
  createSusarV2_parLot,
}