
import { 
  logger,
} from './logs_config.js'

import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import odbc from 'odbc';

const currentUrl = import.meta.url;
const currentDir = path.dirname(fileURLToPath(currentUrl));
const envPath = path.resolve(currentDir, '..', '.env');
dotenv.config({ path: envPath });

import { 
  createPoolSusarEuV2,
  closePoolSusarEuV2,
} from './db/dbMySQL.js';


import { 
  createPoolSusarEuV1_Odbc,
  closePoolSusarEuV1_Odbc,
} from './db/dbODBC.js';

import {
  existeDejaEV_SafetyReportId,
} from './db/query_Susar_v2.js'

import {
  donneAdresseMail,
  donneTbCTLL,
  donneTbProduits_EU,
  donneTbPT_EU,
  donneToutAdresseMail,
} from './db/query_Susar_v1.js'

import {
  sauvegardeObjet,
  chargementObjet,
} from './JSON_Save.js'

const main = async () => {
  // logger.info('Début import : CODEX => CODEX_extract');
  logger.info('Début test');

  const poolSusarDataOdbc = await createPoolSusarEuV1_Odbc('DATA');
  const poolSusarArchiveOdbc = await createPoolSusarEuV1_Odbc('ARCHIVE');
  const poolSusarEuV2 = await createPoolSusarEuV2();
  const Ctll = {  idCTLL: 31, BaseArchive: -1, EV_SafetyReportIdentifier: 'EU-EC-10012907966'};

  // const tbCtLL = await donneTbCTLL(poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
  // await sauvegardeObjet(tbCtLL,"tbCtLL")

  // const tbMedicaments = await donneTbProduits_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
  // await sauvegardeObjet(tbMedicaments,"tbMedicaments")
  // // console.log(tbMedicaments)
  // const tbEffetsIndesirables = await donneTbPT_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
  // await sauvegardeObjet(tbEffetsIndesirables,"tbEffetsIndesirables")

  const tbCtLL = await chargementObjet("tbCtLL")
  const tbMedicaments = await chargementObjet("tbMedicaments")
  const tbEffetsIndesirables = await chargementObjet("tbEffetsIndesirables")

  const userAdresseMail = await donneToutAdresseMail(poolSusarDataOdbc)

  Object.defineProperty(global, 'userAdresseMail', {
    value: userAdresseMail,
    writable: false, // Empêche la modification de la valeur
    configurable: false, // Empêche la suppression ou la redéfinition de la propriété
    enumerable: true, // Permet d'énumérer la propriété (facultatif)
  });

  console.log(await donneAdresseMail(poolSusarDataOdbc,'Frannou'))  
  console.log(await donneAdresseMail(poolSusarDataOdbc,'Mnedelec')) 
  console.log(await donneAdresseMail(poolSusarDataOdbc,'Mnedeloc')) 

  // const Ctll = {  idCTLL: 1, BaseArchive: 0, EV_SafetyReportIdentifier: 'EU-EC-10012907966'};
  // const med = await donneTbProduits_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll)
  // for (const medoc of med) {
  //   console.log(medoc.ProduitSuspect_EU)
  // }
  // console.log (med)
// const user1 = await donneAdresseMail(poolSusarDataOdbc, 'Frannou')
// const user2 = await donneAdresseMail(poolSusarDataOdbc, 'Mnedelec')
// console.log (user1.mail)
// console.log (user2.mail)

  await closePoolSusarEuV1_Odbc(poolSusarDataOdbc);
  await closePoolSusarEuV1_Odbc(poolSusarArchiveOdbc);
  await closePoolSusarEuV2(poolSusarEuV2);

  logger.info('Fin test');
}

main()