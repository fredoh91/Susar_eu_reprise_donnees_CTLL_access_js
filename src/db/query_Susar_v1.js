import {
  logStream,
  logger,
} from '../logs_config.js'

import {
  // existeDejaEV_SafetyReportId,
  // createSusarV2,
  createSusarV2_parLot,
} from './query_Susar_v2.js'

import odbc from 'odbc';

import {
  sauvegardeObjet,
  chargementObjet,
} from '../JSON_Save.js'

async function donneEvalSubstance(poolSusarDataOdbc) {
  // requete test dans susarDataOdbc
  // const SQL_test = `SELECT * FROM Intervenant_Substance_DMM ;`
  const SQL_test = `SELECT Intervenant_Substance_DMM.evaluateur FROM Intervenant_Substance_DMM ;`

  const evals = await poolSusarDataOdbc.query(SQL_test);
  // console.log(evals);
  return evals.map((evalu) => {
    // console.log(evalu.evaluateur);
    return evalu.evaluateur
  });
}

async function donneListIdCtll(poolSusarDataOdbc, poolSusarArchiveOdbc, idCtllDebut, idCtllFin) {
  const SQL_data = `SELECT CTLL.idCTLL, CTLL.EV_SafetyReportIdentifier, False AS BaseArchive FROM CTLL WHERE CTLL.idCTLL Between ${idCtllDebut} And ${idCtllFin};`
  const SQL_archive = `SELECT CTLL_archive.idCTLL, CTLL_archive.EV_SafetyReportIdentifier, True AS BaseArchive FROM CTLL_archive WHERE CTLL_archive.idCTLL Between ${idCtllDebut} And ${idCtllFin};`

  const idCtll_data = await poolSusarDataOdbc.query(SQL_data);
  const idCtll_archive = await poolSusarArchiveOdbc.query(SQL_archive);

  // Fusionner les deux tableaux
  const mergedidCtll = idCtll_data.concat(idCtll_archive);

  // Trier par idCTLL
  mergedidCtll.sort((a, b) => a.idCTLL - b.idCTLL);
  // console.log(mergedidCtll)
  return mergedidCtll;
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
*/
async function donneLotTbCTLL(poolSusarData, lstCtll, typeBase, poolSusarDataOdbc) {
  let resu = null;

  if (typeBase === 'ARCHIVE') {
    const SQL = `SELECT * FROM CTLL_archive WHERE CTLL_archive.idCTLL IN (${lstCtll});`;
    resu = await poolSusarData.query(SQL);
  } else if (typeBase === 'DATA') {
    const SQL = `SELECT * FROM CTLL WHERE CTLL.idCTLL IN (${lstCtll});`;
    resu = await poolSusarData.query(SQL);
  } else {
    return false;
  }

  if (resu) {
    // Itérer sur chaque élément pour ajouter "utilisateur_import"
    for (const tbCTLL of resu) {
      // console.log(tbCTLL.UtilisateurImport)
      const mailUserName = await donneAdresseMail(tbCTLL.UtilisateurImport);
      // console.log(mailUserName)
      // process.exit(1)
      tbCTLL.utilisateur_import = mailUserName ? mailUserName : null; // Ajouter l'élément utilisateur_import
    }
    return resu;
  } else {
    return false;
  }
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneLotTbProduits_EU(poolSusarData, lstCtll, typeBase) {
  let resu = null
  if (typeBase === 'ARCHIVE') {
    const SQL = `SELECT * FROM Produits_EU_archive WHERE Produits_EU_archive.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL);
    return resu
  } else if (typeBase === 'DATA') {
    const SQL = `SELECT * FROM Produits_EU WHERE Produits_EU.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL)
    return resu
  } else {
    return false
  }
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneLotTbPT_EU(poolSusarData, lstCtll, typeBase) {
  let resu = null
  if (typeBase === 'ARCHIVE') {
    const SQL = `SELECT * FROM PT_EU_archive WHERE PT_EU_archive.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL);
    return resu
  } else if (typeBase === 'DATA') {
    const SQL = `SELECT * FROM PT_EU WHERE PT_EU.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL)
    return resu
  } else {
    return false
  }
}


/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneLotTbMedHist_EU(poolSusarData, lstCtll, typeBase) {

  let resu = null
  if (typeBase === 'ARCHIVE') {
    const SQL = `SELECT * FROM Structured_Medical_History_EU_archive WHERE Structured_Medical_History_EU_archive.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL);
    return resu
  } else if (typeBase === 'DATA') {
    const SQL = `SELECT * FROM Structured_Medical_History_EU WHERE Structured_Medical_History_EU.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL)
    return resu
  } else {
    return false
  }
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneLotTbIndication_EU(poolSusarData, lstCtll, typeBase) {

  let resu = null
  if (typeBase === 'ARCHIVE') {
    const SQL = `SELECT * FROM Indication_EU_archive WHERE Indication_EU_archive.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL);
    return resu
  } else if (typeBase === 'DATA') {
    const SQL = `SELECT * FROM Indication_EU WHERE Indication_EU.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL)
    return resu
  } else {
    return false
  }
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneLotTbProduit_PT_EU_Evaluation(poolSusarData, lstCtll, typeBase) {

  let resu = null
  if (typeBase === 'ARCHIVE') {
    const SQL = `SELECT * FROM Produit_PT_EU_Evaluation_archive WHERE Produit_PT_EU_Evaluation_archive.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL);
    return resu
  } else if (typeBase === 'DATA') {
    const SQL = `SELECT * FROM Produit_PT_EU_Evaluation WHERE Produit_PT_EU_Evaluation.idCTLL IN (${lstCtll});`
    resu = await poolSusarData.query(SQL)
    return resu
  } else {
    return false
  }
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneTbProduit_PT_EU_byId(poolSusarDataOdbc, lstCtll) {
  let resu = null
  const SQL = `SELECT * FROM Produit_PT_EU WHERE Produit_PT_EU.idProduit_PT = ${lstCtll};`
  resu = await poolSusarDataOdbc.query(SQL);
  return resu

}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneAdresseMail(userName) {
  // Filtrer les adresses e-mail correspondant au userName (insensible à la casse)
  const adrMailObj = global.userAdresseMail.filter((mail) => mail.UserName.toLowerCase() === userName.toLowerCase());

  let adrMail = null;

  if (adrMailObj.length > 0) {
    adrMail = adrMailObj[0].mail; // Récupérer l'adresse e-mail si elle existe
  } else {
    console.log(`Aucun e-mail trouvé pour le userName : ${userName}`); // Log du userName problématique
  }

  if (adrMail) {
    return adrMail;
  } else {
    return userName; // Retourne le userName si aucun mail n'est trouvé
  }
}
/**
 * Permet de récupérer toutes les adresses mails des utilisateurs, pour la stocker en global
 * @param {*} poolSusarDataOdbc 
 * @returns 
 */
async function donneToutAdresseMail(poolSusarDataOdbc) {

  const SQL = `SELECT TbUsers.mail, TbUsers.UserName 
                  FROM TbUsers 
              GROUP BY TbUsers.mail, TbUsers.UserName 
            HAVING TbUsers.mail Is Not Null;`
  const resu = await poolSusarDataOdbc.query(SQL);

  if (resu) {
    return (resu)
  } else {
    return null
  }
}

async function donneSQL_IN(tabIdCtll, typeBase) {

  if (typeBase === 'DATA') {

    const tabIdCtll_filter = tabIdCtll.filter(item => item.BaseArchive === 0)
    const idCTLLString = tabIdCtll_filter.map(item => item.idCTLL).join(',');
    return idCTLLString
  } else if (typeBase === 'ARCHIVE') {
    const tabIdCtll_filter = tabIdCtll.filter(item => item.BaseArchive === -1)
    const idCTLLString = tabIdCtll_filter.map(item => item.idCTLL).join(',');
    return idCTLLString
  } else {
    return null
  }
  // const idCTLLString = tabIdCtll.map(item => item.idCTLL).join(';');
}

/**
 * cette fonction permet de traiter un lot d'idCTLL
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} poolSusarEuV2 
 * @param {*} tabIdCtll 
 */
async function trtLotIdCtll(poolSusarDataOdbc, poolSusarArchiveOdbc, connectionSusarEuV2, tabIdCtll) {
  // logger.info(`Nombre de lignes retournées : ${tabIdCtll.length}`);

  // liste des idCTLL séparés par des virgules pour construire une clause SQL IN (...)
  const lstCtll_Data = await donneSQL_IN(tabIdCtll, 'DATA')

  if (lstCtll_Data) {
    // tableau d'objet des tables CTLL
    const lotTbCtLL_Data = await donneLotTbCTLL(poolSusarDataOdbc, lstCtll_Data, 'DATA', poolSusarDataOdbc);
    // tableau d'objet des Produits_EU
    const lotTbMedicaments_Data = await donneLotTbProduits_EU(poolSusarDataOdbc, lstCtll_Data, 'DATA');
    // tableau d'objet des PT_EU
    const lotTbEffetsIndesirables_Data = await donneLotTbPT_EU(poolSusarDataOdbc, lstCtll_Data, 'DATA');
    // tableau d'objet des Structured_Medical_History_EU
    const lotTbMedical_history_Data = await donneLotTbMedHist_EU(poolSusarDataOdbc, lstCtll_Data, 'DATA');
    // tableau d'objet des Indication_EU
    const lotTbIndication_EU_Data = await donneLotTbIndication_EU(poolSusarDataOdbc, lstCtll_Data, 'DATA');
    // tableau d'objet des Produit_PT_EU_Evaluation
    const lotTbProduit_PT_EU_Evaluation_Data = await donneLotTbProduit_PT_EU_Evaluation(poolSusarDataOdbc, lstCtll_Data, 'DATA');

    await createSusarV2_parLot(connectionSusarEuV2, poolSusarDataOdbc, lotTbCtLL_Data, lotTbMedicaments_Data, lotTbEffetsIndesirables_Data, lotTbMedical_history_Data, lotTbIndication_EU_Data, lotTbProduit_PT_EU_Evaluation_Data);
  }

  // liste des idCTLL séparés par des virgules pour construire une clause SQL IN (...)
  const lstCtll_Archive = await donneSQL_IN(tabIdCtll, 'ARCHIVE')

  if (lstCtll_Archive) {
    // tableau d'objet des tables CTLL
    const lotTbCtLL_Archive = await donneLotTbCTLL(poolSusarArchiveOdbc, lstCtll_Archive, 'ARCHIVE', poolSusarDataOdbc);
    // tableau d'objet des Produits_EU
    const lotTbMedicaments_Archive = await donneLotTbProduits_EU(poolSusarArchiveOdbc, lstCtll_Archive, 'ARCHIVE');
    // tableau d'objet des PT_EU
    const lotTbEffetsIndesirables_Archive = await donneLotTbPT_EU(poolSusarArchiveOdbc, lstCtll_Archive, 'ARCHIVE');
    // tableau d'objet des Structured_Medical_History_EU
    const lotTbMedical_history_Archive = await donneLotTbMedHist_EU(poolSusarDataOdbc, lstCtll_Archive, 'ARCHIVE');
    // tableau d'objet des Indication_EU
    const lotTbIndication_EU_Archive = await donneLotTbIndication_EU(poolSusarDataOdbc, lstCtll_Archive, 'ARCHIVE');
    // tableau d'objet des Produit_PT_EU_Evaluation
    const lotTbProduit_PT_EU_Evaluation_Archive = await donneLotTbProduit_PT_EU_Evaluation(poolSusarDataOdbc, lstCtll_Archive, 'ARCHIVE');

    await createSusarV2_parLot(connectionSusarEuV2, poolSusarDataOdbc, lotTbCtLL_Archive, lotTbMedicaments_Archive, lotTbEffetsIndesirables_Archive, lotTbMedical_history_Archive, lotTbIndication_EU_Archive, lotTbProduit_PT_EU_Evaluation_Archive);
  }

}


export {
  donneEvalSubstance,
  donneListIdCtll,
  trtLotIdCtll,
  donneAdresseMail,
  donneToutAdresseMail,
  donneTbProduit_PT_EU_byId,
}