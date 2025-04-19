import {
  logStream,
  logger,
} from '../logs_config.js'

import {
  parseReactionListPT,
  parseMedicalHistory,
  parseIndication,
  donneSeriousCriteria,
  donneNarratifNbCaractere,
  donneSQL_where_IN,
} from "../util.js"

import {
  donneTbProduit_PT_EU_byId,
} from "./query_Susar_v1.js"

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
  // console.log('tbCtLL : ',tbCtLL)
  // process.exit(1)

  const seriousnessCriteria = await donneSeriousCriteria(tbCtLL);

  const narratifNbCaractere = await donneNarratifNbCaractere(tbCtLL['Narrative Present']);
  // const narratifNbCaractere = 18

  const EvRepID_11Chars = tbCtLL.EV_SafetyReportIdentifier.trim().slice(-11)
  const ICSR_form_link = `https://eudravigilance-human.ema.europa.eu/ev-web/api/reports/safetyreport/${EvRepID_11Chars}?reportType=CIOMS&reportFormat=pdf`;
  const E2B_link = `https://eudravigilance-human.ema.europa.eu/ev-web/api/reports/safetyreport/${EvRepID_11Chars}?reportType=HUMAN_READABLE&reportFormat=html`;
  const Complete_Narrative_link = `http://bi.eudra.org/xmlpserver/PHV%20EudraVigilance%20DWH%20(EVDAS)/_filters/PHV%20EVDAS/Templates/Data%20Warehouse%20Subgroup/Narrative/Narrative.xdo?_xpf=&_xt=Narrative&p_narrati=${EvRepID_11Chars}&_xpt=1&_xf=rtf`;




  const SQL = `INSERT INTO susar_eu (
    ev_safety_report_identifier,
    dlpversion,
    num_eudract,
    world_wide_id,
    sponsorstudynumb,
/*pays_etude,*/
    pays_survenue,
    receive_date,
    receipt_date,
    gateway_date,
    initials_height_weight,
    birth_date,
    primary_source_qualification,
    patient_sex,
    patient_age,
    patient_age_group,
    parent_child,
    utilisateur_import,
    icsr_form_link,
    e2_b_link,
    complete_narrative_link,
    narratif,
    narratif_nb_caractere,
    seriousness_criteria,
    is_case_serious,
    priorisation,
    cas_ime,
    cas_dme,
    cas_europe,
    id_ctll,
    cas_susar_eu_v1,
    date_reprise_susar_eu_v1,
    created_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`;
  // console.log('ev : ',tbCtLL.EV_SafetyReportIdentifier)
  // console.log('tbCtLL : ',tbCtLL)

  const values = [
    tbCtLL.EV_SafetyReportIdentifier,
    tbCtLL.CaseVersion,
    tbCtLL.StudyRegistrationNumber,
    tbCtLL.CaseReportNumber,
    tbCtLL.SponsorStudyNumber,
    tbCtLL.Country,
    tbCtLL.ReceiveDate,
    tbCtLL.ReceiptDate,
    tbCtLL.GatewayDate,
    tbCtLL.Initials_height_weight,
    tbCtLL['Birth Date'],
    tbCtLL['Primary Source Qualification'],
    tbCtLL.Sex,
    tbCtLL.Age,
    tbCtLL['Age Group'],
    tbCtLL.Parent_Child,
    tbCtLL.utilisateur_import,
    ICSR_form_link,
    E2B_link,
    Complete_Narrative_link,
    tbCtLL.Narrative_reporter_comments_sender_comments,
    narratifNbCaractere,
    seriousnessCriteria,
    tbCtLL.Serious,
    tbCtLL.Priorisation,
    tbCtLL.CasEurope,
    tbCtLL.CasIME,
    tbCtLL.casDME,
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
/**
 * Permet de remplir la table de liaison entre susar_eu et intervenant_substance_dmm
 * @param {*} connectionSusarEuV2 
 * @param {*} tbMedicaments 
 * @param {*} idSusarEu 
 */
async function insertInto_intervenant_substance_dmm_susar_eu(connectionSusarEuV2, tbMedicaments, idSusarEu) {

  for (const Med of tbMedicaments) {
    if (!Med.IdInter_Sub_DMM) {
      //logger.error(`Pas de lien avec intervenant_substance pour le médicament : ${Med}`);
      continue; // Passer à l'itération suivante si le produit suspect est manquant
    }

    // On recherche la correspondance dans lienIntSub_v1_v2
    const idIntervenant_substance_dmm = global.lienIntSub_v1_v2[0]
      .filter(item => item.id_inter_sub_dmm_susar_eu_v1 === Med.IdInter_Sub_DMM)
      .map(item => item.id)[0] ?? null; // Extraire uniquement la propriété "id"

    if (!idIntervenant_substance_dmm) {
      // logger.error(`Impossible de faire le lien entre les deux tables intervenant_substance_dmm pour les deux environnement pour le médicament : ${Med}`);
      logger.error(`### missing data ### Impossible de trouver, dans la table liaisons_intervenant_substance_dmm_v1_v2 l'id intervenant susar_v1 : ${Med.IdInter_Sub_DMM}`);
      continue; // Passer à l'itération suivante si le produit suspect est manquant
    }
    const SQL = `INSERT INTO intervenant_substance_dmm_susar_eu (
                      intervenant_substance_dmm_id, 
                      susar_eu_id
                      ) VALUES(?, ?)`;
    const values = [
      idIntervenant_substance_dmm,
      idSusarEu
    ];
    try {
      const resu = await connectionSusarEuV2.query(SQL, values);
      if (resu) {
      } else {
        throw new Error('Insertion dans intervenant_substance_dmm_susar_eu a échoué');
      }
    } catch (error) {
      logger.error(`Erreur lors de l'insertion dans intervenant_substance_dmm_susar_eu : ${error.message}`);
      throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
    }
  }
}

async function insertInto_effets_indesirables(connectionSusarEuV2, tbEffetsIndesirables, idSusarEu) {
  const insertIds = [];
  for (const EI of tbEffetsIndesirables) {



    const EI_parse = parseReactionListPT(EI.Tout)


    const ptCodePtLib = global.ptCodeLibPt[0].filter((pt) => pt.pt_name_en.toLowerCase() === EI_parse.ReactionListPT.toLowerCase());
    // const ptCode = ptCodePtLib[0].pt_code ?? null; // Si pt_code est undefined, le définir sur null
    // let ptCode = null;
    // if (ptCodePtLib.length > 0) {
    //   ptCode = ptCodePtLib[0].pt_code; // Récupérer la valeur si elle existe
    // } else {
    //   // console.log(`Aucune correspondance trouvée pour : ${EI_parse.ReactionListPT}`);
    // }    
    const ptCode = ptCodePtLib[0]?.pt_code ?? null;
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
      codereactionmeddrapt,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      EI.Tout,
      EI_parse.ReactionListPT,
      EI_parse.Outcome,
      EI_parse.Date,
      EI_parse_Date,
      EI_parse.Duration,
      ptCode,
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
 * @param {*} tbMedical_history 
 * @param {*} idSusarEu 
 * @returns 
 */
async function insertInto_medical_history(connectionSusarEuV2, tbMedical_history, idSusarEu) {
  const insertIds = [];
  for (const MedHist of tbMedical_history) {

    const MedHist_parse = parseMedicalHistory(MedHist.Tout)
    // const EI_parse_Date = EI_parse.Date

    const SQL = `INSERT INTO medical_history (
          susar_id,
          medical_history_ctll,
          disease,
          continuing,
          comment,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      MedHist.Tout,
      MedHist_parse.Disease,
      MedHist_parse.Continuing,
      MedHist_parse.Comment,
      MedHist.dateCrea,
      MedHist.dateModif
    ];

    try {
      const resu = await connectionSusarEuV2.query(SQL, values);
      if (resu) {
        insertIds.push(resu[0].insertId);
      } else {
        throw new Error('Insertion dans medical_history a échoué');
      }
    } catch (error) {
      logger.error(`Erreur lors de l'insertion dans medical_history : ${error.message}`);
      throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
    }
  }
  return insertIds; // Retourner tous les IDs insérés
}



/**
 * 
 * @param {*} connectionSusarEuV2 
 * @param {*} tbMedical_history 
 * @param {*} idSusarEu 
 * @returns 
 */

async function insertInto_substance_pt(connectionSusarEuV2, poolSusarDataOdbc, tbProduit_PT_EU_Evaluation, idSusarEu, insertedIdsMedicaments, insertedIdsEI) {
  const insertIds = [];
  // on récupère les données des medicaments et effets indésirables insérés à partir des tableaux passés en paramètre : insertedIdsMedicaments, insertedIdsEI
  //   1 - on transforme les tableaux en chaine de caractères séparées par des virgules ex : [ 2583, 2584, 2585, 2586, 2587, 2588 ] => '2583, 2584, 2585, 2586, 2587, 2588'
  const where_IN_Med = await donneSQL_where_IN(insertedIdsMedicaments)
  const where_IN_EI = await donneSQL_where_IN(insertedIdsEI)
  //   2 - on fait une requete dans la table intervenant_substance_dmm_v1 pour récupérer les substance_PT en fonction des idMedicaments et idEffetsIndesirables
  const lstMed_susar_v2 = await donneMed_susarV2_byId(where_IN_Med)
  const lstEI_susar_v2 = await donneEI_susarV2_byId(where_IN_EI)

  for (const Eval of tbProduit_PT_EU_Evaluation) {

    // On boucle sur les evalutions de ce susar, le champ 'idProduit_PT' nous renseigne sur l'id dans la table susar_v1 Produit_PT_EU.idProduit_PT
    //  1 - On fait une requete dans susar_v1 sur Produit_PT_EU.idProduit_PT
    const Produit_PT_EU_susar_v1 = await donneTbProduit_PT_EU_byId(poolSusarDataOdbc, Eval.idProduit_PT_Eval)
    //  2a - On regarde si on trouve une correspondance entre Produit_PT_EU.DCI_EU et lstMed_susar_v2['substancename']
    //      - Si oui, on stocke la valeur de susar_v2 : const substance_pour_insert = lstMed_susar_v2['substancename']
    //      - Si non, on stocke la valeur de susar_v1 : const substance_pour_insert = Produit_PT_EU.DCI_EU
    // const substance_pour_insert = Produit_PT_EU_susar_v1.DCI_EU
    //  2b - On regarde si on trouve une correspondance entre Produit_PT_EU.Reaction_List_PT et lstEI_susar_v2['substancename']
    //      - Si oui, on stocke la valeur de susar_v2 : const EffInd_pour_insert = lstEI_susar_v2['substancename']
    //      - Si non, on stocke la valeur de susar_v1 : const EffInd_pour_insert = Produit_PT_EU.Reaction_List_PT
    // const EffInd_pour_insert = Produit_PT_EU_susar_v1.Reaction_List_PT
    //  3 - On cherche si il existe une ligne pour substance_pour_insert / EffInd_pour_insert
    let idSubstancePt = await donneIdSubstance_pt_bySubst_byEI(connectionSusarEuV2, Produit_PT_EU_susar_v1.DCI_EU, Produit_PT_EU_susar_v1.Reaction_List_PT)
    //      - Si oui, on récupère son id : const idSubstancePt = susar_eu_v2.substance_pt
    //      - Si non, on crée une ligne dans susar_eu_v2.substance_pt et récupère son id : const idSubstancePt = susar_eu_v2.substance_pt
    if (!idSubstancePt) {
      idSubstancePt = await insertInto_substance_pt_susar_v2(connectionSusarEuV2, Produit_PT_EU_susar_v1)
    }
    //  4 - Insertion dans la table susar_eu_v2.substance_pt_eval avec l'evalution en cours (de cette boucle for)
    const  idSubstancePtEval = await insertInto_substance_pt_eval_susar_v2(connectionSusarEuV2, Eval)
    //      et on récupère son id : const idSubstancePtEval = susar_eu_v2.substance_pt_eval.id
    //  5 - Insertion dans les tables de liaison :
    await insertInto_substance_pt_eval_substance_pt(connectionSusarEuV2, idSubstancePtEval, idSubstancePt)
    //      - substance_pt_eval_substance_pt : INSERT INTO substance_pt_eval_substance_pt (substance_pt_eval_id, substance_pt_id) VALUES(idSubstancePtEval, idSubstancePt); 
    await insertInto_substance_pt_eval_susar_eu(connectionSusarEuV2, idSubstancePtEval, idSusarEu)
    //      - substance_pt_eval_susar_eu : INSERT INTO substance_pt_eval_susar_eu (substance_pt_eval_id, susar_eu_id) VALUES(idSubstancePtEval, idSusarEu);
    await insertInto_substance_pt_susar_eu(connectionSusarEuV2, idSubstancePt, idSusarEu)
    //      - substance_pt_susar_eu : INSERT INTO substance_pt_susar_eu (substance_pt_id, susar_eu_id) VALUES(idSubstancePt, idSusarEu);




    const SQL = `INSERT INTO medical_history (
          susar_id,
          medical_history_ctll,
          disease,
          continuing,
          comment,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      MedHist.Tout,
      MedHist_parse.Disease,
      MedHist_parse.Continuing,
      MedHist_parse.Comment,
      MedHist.dateCrea,
      MedHist.dateModif
    ];

    try {
      const resu = await connectionSusarEuV2.query(SQL, values);
      if (resu) {
        insertIds.push(resu[0].insertId);
      } else {
        throw new Error('Insertion dans medical_history a échoué');
      }
    } catch (error) {
      logger.error(`Erreur lors de l'insertion dans medical_history : ${error.message}`);
      throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
    }
  }
  return insertIds; // Retourner tous les IDs insérés
}



/**
 * 
 * @param {*} connectionSusarEuV2 
 * @param {*} tbMedical_history 
 * @param {*} idSusarEu 
 * @returns 
 */
async function insertInto_indications(connectionSusarEuV2, tbIndication, idSusarEu) {
  const insertIds = [];
  for (const Indication of tbIndication) {

    const Indication_parse = parseIndication(Indication.Tout)
    // const EI_parse_Date = EI_parse.Date

    const SQL = `INSERT INTO indications (
          susar_id,
          indication_ctll,
          product_name,
          product_indications_eng,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`;

    const values = [
      idSusarEu,
      Indication.Tout,
      Indication_parse.product_name,
      Indication_parse.product_indications_eng,
      Indication.dateCrea,
      Indication.dateModif
    ];

    try {
      const resu = await connectionSusarEuV2.query(SQL, values);
      if (resu) {
        insertIds.push(resu[0].insertId);
      } else {
        throw new Error('Insertion dans insications a échoué');
      }
    } catch (error) {
      logger.error(`Erreur lors de l'insertion dans indications : ${error.message}`);
      throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
    }
  }
  return insertIds; // Retourner tous les IDs insérés
}

// /**
//  * 
//  * @param {*} connectionSusarEuV2 
//  * @param {*} tbCtLL 
//  * @param {*} tbMedicaments 
//  * @param {*} tbEffetsIndesirables 
//  */
// async function createSusarV2(connectionSusarEuV2, tbCtLL, tbMedicaments, tbEffetsIndesirables) {

//   // console.log('EV 3 : ',tbCtLL.EV_SafetyReportIdentifier)
//   if (await existeDejaEV_SafetyReportId(connectionSusarEuV2, tbCtLL.EV_SafetyReportIdentifier) === false) {
//     // logger.info(`Je vais devoir créer des lignes pour ce susar la : ${tbCtLL.idCTLL}`);

//     try {
//       await connectionSusarEuV2.beginTransaction();
//       // console.log('tbCtLL : ',tbCtLL)
//       // Insérer dans les différentes tables
//       const idSusarEu = await insertInto_susar_eu(connectionSusarEuV2, tbCtLL);
//       if (idSusarEu) {
//         // console.log(tbMedicaments);
//         // process.exit(1)
//         await insertInto_medicaments(connectionSusarEuV2, tbMedicaments, idSusarEu);
//         await insertInto_effets_indesirables(connectionSusarEuV2, tbEffetsIndesirables, idSusarEu);
//         await connectionSusarEuV2.commit();
//         // process.exit(1)
//       } else {
//         throw new Error('Insertion dans susar_eu a échoué');
//       }

//     } catch (error) {
//       await connectionSusarEuV2.rollback();
//       logger.error(`Erreur lors de la création du SUSAR : ${error.message}`);
//       throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
//     }
//   } else {
//     throw new Error('Le SUSAR existe déjà dans la base de données');
//   }
// }

/**
 * 
 * @param {*} connectionSusarEuV2 
 * @param {*} tbCtLL 
 * @param {*} tbMedicaments 
 * @param {*} tbEffetsIndesirables 
 */
async function createSusarV2_parLot(connectionSusarEuV2, poolSusarDataOdbc, tbCtLL, tbMedicaments, tbEffetsIndesirables, tbMedical_history, tbIndication_EU, tbProduit_PT_EU_Evaluation) {
  for (const Ctll of tbCtLL) {
    // console.log('EV 3 : ',tbCtLL.EV_SafetyReportIdentifier)
    if (await existeDejaEV_SafetyReportId(connectionSusarEuV2, Ctll.EV_SafetyReportIdentifier) === false) {
      // logger.info(`Je vais devoir créer des lignes pour ce susar la : ${tbCtLL.idCTLL}`);
      const Medicaments = tbMedicaments.filter(item => item.idCTLL === Ctll.idCTLL);
      const EffetsIndesirables = tbEffetsIndesirables.filter(item => item.idCTLL === Ctll.idCTLL);
      const MedHist = tbMedical_history.filter(item => item.idCTLL === Ctll.idCTLL);
      const Indication = tbIndication_EU.filter(item => item.idCTLL === Ctll.idCTLL);
      const Produit_PT_EU_Evaluation = tbProduit_PT_EU_Evaluation.filter(item => item.idCTLL === Ctll.idCTLL);

      try {
        await connectionSusarEuV2.beginTransaction();

        const idSusarEu = await insertInto_susar_eu(connectionSusarEuV2, Ctll);
        if (idSusarEu) {

          const insertedIdsMedicaments = await insertInto_medicaments(connectionSusarEuV2, Medicaments, idSusarEu);
          // console.log('insertedIdsMedicaments : ',insertedIdsMedicaments)

          await insertInto_intervenant_substance_dmm_susar_eu(connectionSusarEuV2, Medicaments, idSusarEu);

          const insertedIdsEI = await insertInto_effets_indesirables(connectionSusarEuV2, EffetsIndesirables, idSusarEu);

          // les deux fonctions du dessus devront renvoyer des tableaux, les couples substance_PT seront traités dans une fonction située apres ce commentaire
          await insertInto_substance_pt(connectionSusarEuV2, poolSusarDataOdbc, Produit_PT_EU_Evaluation, idSusarEu, insertedIdsMedicaments, insertedIdsEI);

          await insertInto_medical_history(connectionSusarEuV2, MedHist, idSusarEu);
          await insertInto_indications(connectionSusarEuV2, Indication, idSusarEu);


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


async function donnePtCodeLibPt(poolSusarEuV2) {
  const SQL = `SELECT pt_code, pt_name_en
                FROM susar_eu_v2.meddra_md_hierarchy
                GROUP BY pt_code, pt_name_en;`
  const resu = await poolSusarEuV2.query(SQL);

  if (resu) {
    return (resu)
  } else {
    return null
  }
}


/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} where_IN_Med 
 * @returns 
 */
async function donneMed_susarV2_byId(poolSusarEuV2, where_IN_Med) {
  const SQL = `SELECT * FROM medicaments m WHERE id IN (${where_IN_Med});`
  const resu = await poolSusarEuV2.query(SQL);

  if (resu) {
    return (resu)
  } else {
    return null
  }
}


/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} where_IN_EI 
 * @returns 
 */
async function donneEI_susarV2_byId(poolSusarEuV2, where_IN_EI) {
  const SQL = `SELECT * FROM effets_indesirables ei WHERE id IN (${where_IN_EI});`
  const resu = await poolSusarEuV2.query(SQL);

  if (resu) {
    return (resu)
  } else {
    return null
  }
}

/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} Subst 
 * @param {*} EI 
 * @returns 
 */
async function donneIdSubstance_pt_bySubst_byEI(poolSusarEuV2, Subst, libPT) {
  const SQL = `SELECT id FROM substance_pt WHERE LOWER(active_substance_high_level) = LOWER('${Subst}') AND LOWER(reactionmeddrapt) = LOWER('${libPT}');`

  const resu = await poolSusarEuV2.query(SQL);

  if (resu) {
    return (resu)
  } else {
    return null
  }
}

/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} Subst 
 * @param {*} EI 
 * @returns 
 */
async function insertInto_substance_pt_susar_v2(poolSusarEuV2, Produit_PT_EU_susar_v1) {


  const SQL = `INSERT INTO substance_pt (
    active_substance_high_level,
    codereactionmeddrapt,
    reactionmeddrapt,
  ) VALUES (?, ?, ?)`;
  const values = [
    Produit_PT_EU_susar_v1.DCI_EU,
    Produit_PT_EU_susar_v1.Reaction_List_PT,
    Produit_PT_EU_susar_v1.PT_code,
  ];

  try {
    const resu = await connectionSusarEuV2.query(SQL, values);
    if (resu) {
      const insertId = resu[0].insertId;
      return insertId;
    } else {
      throw new Error('Insertion dans insications a échoué');
    }
  } catch (error) {
    logger.error(`Erreur lors de l'insertion dans indications : ${error.message}`);
    throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
  }
}


/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} Eval_susar_v1 
 * @returns 
 */
async function insertInto_substance_pt_eval_susar_v2(poolSusarEuV2, Eval_susar_v1) {

  const SQL = `INSERT INTO substance_pt_eval (
    assessment_outcome,
    comments,
    date_eval, 
    created_at, 
    updated_at, 
    user_create, 
    user_modif
  ) VALUES (?, ?, ?)`;
  const values = [
    Eval_susar_v1.AssessmentOutcome,
    Eval_susar_v1.Comments,
    Eval_susar_v1.Date,
    Eval_susar_v1.dateCrea,
    Eval_susar_v1.dateModif,
    Eval_susar_v1.UtilisateurCrea,
    Eval_susar_v1.UtilisateurModif,
  ];

  try {
    const resu = await connectionSusarEuV2.query(SQL, values);
    if (resu) {
      const insertId = resu[0].insertId;
      return insertId;
    } else {
      throw new Error('Insertion dans insications a échoué');
    }
  } catch (error) {
    logger.error(`Erreur lors de l'insertion dans indications : ${error.message}`);
    throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
  }
}




/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} idSubstancePtEval 
 * @param {*} idSubstancePt 
 * @returns 
 */
async function insertInto_substance_pt_eval_substance_pt(poolSusarEuV2, idSubstancePtEval, idSubstancePt) {

  const SQL = `INSERT INTO substance_pt_eval_substance_pt (substance_pt_eval_id, substance_pt_id) VALUES (?, ?)`;
  const values = [
    idSubstancePtEval,
    idSubstancePt,
  ];

  try {
    const resu = await connectionSusarEuV2.query(SQL, values);
    if (resu) {
      const insertId = resu[0].insertId;
      return insertId;
    } else {
      throw new Error('Insertion dans insications a échoué');
    }
  } catch (error) {
    logger.error(`Erreur lors de l'insertion dans indications : ${error.message}`);
    throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
  }
}


/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} idSubstancePtEval 
 * @param {*} idSusarEu 
 * @returns 
 */
async function insertInto_substance_pt_eval_susar_eu(poolSusarEuV2, idSubstancePtEval, idSusarEu) {

  const SQL = `INSERT INTO substance_pt_eval_susar_eu (substance_pt_eval_id, susar_eu_id) VALUES (?, ?)`;
  const values = [
    idSubstancePtEval,
    idSusarEu,
  ];

  try {
    const resu = await connectionSusarEuV2.query(SQL, values);
    if (resu) {
      const insertId = resu[0].insertId;
      return insertId;
    } else {
      throw new Error('Insertion dans insications a échoué');
    }
  } catch (error) {
    logger.error(`Erreur lors de l'insertion dans indications : ${error.message}`);
    throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
  }
}


/**
 * 
 * @param {*} poolSusarEuV2 
 * @param {*} idSubstancePt 
 * @param {*} idSusarEu 
 * @returns 
 */
async function insertInto_substance_pt_susar_eu(poolSusarEuV2, idSubstancePt, idSusarEu) {

  const SQL = `INSERT INTO substance_pt_susar_eu (substance_pt_id, susar_eu_id) VALUES (?, ?)`;
  const values = [
    idSubstancePt,
    idSusarEu,
  ];

  try {
    const resu = await connectionSusarEuV2.query(SQL, values);
    if (resu) {
      const insertId = resu[0].insertId;
      return insertId;
    } else {
      throw new Error('Insertion dans insications a échoué');
    }
  } catch (error) {
    logger.error(`Erreur lors de l'insertion dans indications : ${error.message}`);
    throw error; // Lancer l'erreur pour qu'elle puisse être attrapée par un .catch()
  }
}





async function donneLienIntSub_v1_v2(poolSusarEuV2) {
  const SQL = `SELECT * FROM susar_eu_v2.liaisons_intervenant_substance_dmm_v1_v2;`
  const resu = await poolSusarEuV2.query(SQL);

  if (resu) {
    return (resu)
  } else {
    return null
  }
}



export {
  existeDejaEV_SafetyReportId,
  createSusarV2_parLot,
  donnePtCodeLibPt,
  donneLienIntSub_v1_v2,
}