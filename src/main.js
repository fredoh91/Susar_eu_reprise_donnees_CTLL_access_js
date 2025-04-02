import {
  createPoolSusarEuV2,
  closePoolSusarEuV2,
} from './db/dbMySQL.js';


import {
  createPoolSusarEuV1_Odbc,
  closePoolSusarEuV1_Odbc,
} from './db/dbODBC.js';

import {
  donneEvalSubstance,
  donneListIdCtll,
  trtLotIdCtll,
  donneToutAdresseMail,
} from './db/query_Susar_v1.js'

import {
  donnePtCodeLibPt,
} from './db/query_Susar_v2.js'

// import {
//   donneTabCodeVU,
//   trtLotCodeVU,
// } from './db/requetes.js'

import {
  logger,
} from './logs_config.js'

// import {
//   donneformattedDate,
// } from './util.js'

// import {
//   sauvegardeObjet,
//   chargementObjet,
// } from './JSON_Save.js'

import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import odbc from 'odbc';

const currentUrl = import.meta.url;
const currentDir = path.dirname(fileURLToPath(currentUrl));
const envPath = path.resolve(currentDir, '..', '.env');
dotenv.config({ path: envPath });

// Nombre total de lignes à traiter pour les tests
// const NB_CODEVU_A_TRAITER_PAR_LOT = parseInt(process.env.NB_CODEVU_A_TRAITER_PAR_LOT, 10) || 100;

/**
 * Fonction principale
 */
const main = async () => {

  // if (process.env.TYPE_EXECUTION == 'Prod') {
  //   process.on('uncaughtException', (err) => {
  //     const stackLines = err.stack.split('\n');
  //     const location = stackLines[1].trim();
  //     logger.error(`Uncaught Exception: ${err.message}`);
  //     logger.error(`Location: ${location}`);
  //     logger.error(err.stack);
  //   });

  //   process.on('unhandledRejection', (reason, promise) => {
  //     const stackLines = reason.stack.split('\n');
  //     const location = stackLines[1].trim(); // Typically, the second line contains the location
  //     logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  //     logger.error(`Location: ${location}`);
  //     logger.error(reason.stack);
  //   });
  // }

  logger.info('Début import : SUSAR_EU_V1 => SUSAR_EU_V2');

  const poolSusarDataOdbc = await createPoolSusarEuV1_Odbc('DATA');
  const poolSusarArchiveOdbc = await createPoolSusarEuV1_Odbc('ARCHIVE');
  const poolSusarEuV2 = await createPoolSusarEuV2();
  const connectionSusarEuV2 = await poolSusarEuV2.getConnection();

  // Permet de charger en global la variable userAdresseMail (lien entre UserName et adresse mail)
  const userAdresseMail = await donneToutAdresseMail(poolSusarDataOdbc)
  Object.defineProperty(global, 'userAdresseMail', {
    value: userAdresseMail,
    writable: false, // Empêche la modification de la valeur
    configurable: false, // Empêche la suppression ou la redéfinition de la propriété
    enumerable: true, // Permet d'énumérer la propriété (facultatif)
  });

  // Permet de charger en global la variable ptCodeLibPt (lien entre le code PT et le libellé PT)
  const ptCodeLibPt = await donnePtCodeLibPt(poolSusarEuV2)
  Object.defineProperty(global, 'ptCodeLibPt', {
    value: ptCodeLibPt,
    writable: false, // Empêche la modification de la valeur
    configurable: false, // Empêche la suppression ou la redéfinition de la propriété
    enumerable: true, // Permet d'énumérer la propriété (facultatif)
  });

  let idCtllDebut = parseInt(process.env.ID_CTLL_DEBUT, 10);
  // let idCtllFin = parseInt(process.env.ID_CTLL_FIN, 10);
  let idCtllFin = parseInt(process.env.ID_CTLL_DEBUT, 10) + parseInt(process.env.PAS_UPPER, 10) - 1;

  while (true) {
    const tabIdCtll = await donneListIdCtll(poolSusarDataOdbc, poolSusarArchiveOdbc, idCtllDebut, idCtllFin)

    logger.info(`Pour les idCTLL est compris entre ${idCtllDebut} et ${idCtllFin}, nombre de lignes retournées : ${tabIdCtll.length}`);
    if (tabIdCtll.length === 0) {
      break
    }
    await trtLotIdCtll(poolSusarDataOdbc, poolSusarArchiveOdbc, connectionSusarEuV2, tabIdCtll);

    // idCtllDebut += 100;
    // idCtllFin += 100;
    idCtllDebut += parseInt(process.env.PAS_UPPER, 10);
    idCtllFin += parseInt(process.env.PAS_UPPER, 10);
  }

  await closePoolSusarEuV1_Odbc(poolSusarDataOdbc);
  await closePoolSusarEuV1_Odbc(poolSusarArchiveOdbc);
  await closePoolSusarEuV2(poolSusarEuV2);

  logger.info('Fin import : SUSAR_EU_V1 => SUSAR_EU_V2');
}

main();