import {
  logStream , 
  logger,
} from '../logs_config.js'

import {
  existeDejaEV_SafetyReportId,
  createSusarV2,
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

async function donneListIdCtll (poolSusarDataOdbc, poolSusarArchiveOdbc, idCtllDebut, idCtllFin) {
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
async function donneTbCTLL(poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll) {
  let resu = null;
  // console.log('Ctll.BaseArchive : ', Ctll.BaseArchive)
  if (Ctll.BaseArchive === -1) {
    const SQL = `SELECT * FROM CTLL_archive WHERE CTLL_archive.idCTLL = ${Ctll.idCTLL};`
    // console.log(SQL)
    resu = await poolSusarArchiveOdbc.query(SQL);
  } else if (Ctll.BaseArchive === 0) {
    const SQL = `SELECT * FROM CTLL WHERE CTLL.idCTLL = ${Ctll.idCTLL};`
    // console.log(SQL)
    resu = await poolSusarDataOdbc.query(SQL)
  } else {
    return false
  }
  
  if (resu) {
    const tbCTLL = resu[0]
    // On récupére le mail de l'utilisateur_import : donneAdresseMail(poolSusarDataOdbc, userName)
    const mailUserName = await donneAdresseMail(poolSusarDataOdbc, tbCTLL.UtilisateurImport)
    tbCTLL.utilisateur_import = mailUserName.mail;

    return (tbCTLL)
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
async function donneTbProduits_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll){
  let resu = null
  if (Ctll.BaseArchive === -1) {
    const SQL = `SELECT * FROM Produits_EU_archive WHERE Produits_EU_archive.idCTLL = ${Ctll.idCTLL};`
    resu = await poolSusarArchiveOdbc.query(SQL);
  } else if (Ctll.BaseArchive === 0) {
    const SQL = `SELECT * FROM Produits_EU WHERE Produits_EU.idCTLL = ${Ctll.idCTLL};`
    resu = await poolSusarDataOdbc.query(SQL)
    // console.log(resu.length)
  } else {
    return false
  }
  
  if (resu) {
    return (resu)
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
async function donneTbPT_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll) {
  let resu = null
  if (Ctll.BaseArchive === -1) {
    const SQL = `SELECT * FROM PT_EU_archive WHERE PT_EU_archive.idCTLL = ${Ctll.idCTLL};`
    resu = await poolSusarArchiveOdbc.query(SQL);
  } else if (Ctll.BaseArchive === 0) {
    const SQL = `SELECT * FROM PT_EU WHERE PT_EU.idCTLL = ${Ctll.idCTLL};`
    resu = await poolSusarDataOdbc.query(SQL)
  } else {
    return false
  }
  
  if (resu) {
    return (resu)
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
async function donneAdresseMail_requeteBaseAccess (poolSusarDataOdbc, userName) {

  const SQL = `SELECT TbUsers.mail, TbUsers.UserName FROM TbUsers GROUP BY TbUsers.mail, TbUsers.UserName HAVING TbUsers.UserName='${userName}';`
  const resu = await poolSusarDataOdbc.query(SQL);

  if (resu) {
    return (resu[0])
  } else {
    return userName
  }
}

/**
 * 
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} tabIdCtll 
 */
async function donneAdresseMail(poolSusarDataOdbc, userName) {
  const adrMailObj = global.userAdresseMail.filter((mail) => mail.UserName === userName)[0];
  const adrMail = adrMailObj ? adrMailObj.mail : null;

  if (adrMail) {
    return adrMail;
  } else {
    return userName; // Retourne le userName si aucun mail n'est trouvé
  }
}

async function donneToutAdresseMail (poolSusarDataOdbc) {

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

/**
 * cette fonction permet de traiter un lot d'idCTLL
 * @param {*} poolSusarDataOdbc 
 * @param {*} poolSusarArchiveOdbc 
 * @param {*} poolSusarEuV2 
 * @param {*} tabIdCtll 
 */
async function trtLotIdCtll (poolSusarDataOdbc, poolSusarArchiveOdbc, connectionSusarEuV2, tabIdCtll) {
  // logger.info(`Nombre de lignes retournées : ${tabIdCtll.length}`);

  for (const Ctll of tabIdCtll) {
    // logger.info(`Nombre de lignes retournées pour idCtllDebut=${idCTLL}`);
    const existeEV_SafetyReportId = await existeDejaEV_SafetyReportId(connectionSusarEuV2,Ctll.EV_SafetyReportIdentifier)

    if (existeEV_SafetyReportId === false) {

      // CTLL.EV_SafetyReportIdentifier n'existe pas dans la table susar_eu, on va pouvoir le créer
      // On récupère les données dans susar_v1 pour les insérer dans susar_v2
      const tbCtLL = await donneTbCTLL(poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);

      const tbMedicaments = await donneTbProduits_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
      // const tbMedicaments = await chargementObjet("tbMedicaments")
      // console.log(tbMedicaments)

      const tbEffetsIndesirables = await donneTbPT_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
      // const tbEffetsIndesirables = await chargementObjet("tbEffetsIndesirables")
      // console.log(tbEffetsIndesirables)

      // Insertion dans la base susar_eu_v2
      await createSusarV2 (connectionSusarEuV2, tbCtLL, tbMedicaments, tbEffetsIndesirables);
    }
  }
}


  export {
    donneEvalSubstance,
    donneListIdCtll,
    trtLotIdCtll,
    donneAdresseMail,
    donneTbCTLL,
    donneTbProduits_EU,
    donneTbPT_EU,
    donneToutAdresseMail,
  }