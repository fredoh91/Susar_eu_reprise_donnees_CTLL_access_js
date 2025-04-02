
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
  // donneTbCTLL,
  // donneTbProduits_EU,
  // donneTbPT_EU,
  donneToutAdresseMail,
} from './db/query_Susar_v1.js'

import {
  sauvegardeObjet,
  chargementObjet,
} from './JSON_Save.js'

import {
  parseReactionListPT,
  parseMedicalHistory,
} from './util.js'

import MedicParser from './MedicParser.js';

const main = async () => {
  // logger.info('Début import : CODEX => CODEX_extract');
  logger.info('Début test');

  const poolSusarDataOdbc = await createPoolSusarEuV1_Odbc('DATA');
  const poolSusarArchiveOdbc = await createPoolSusarEuV1_Odbc('ARCHIVE');
  const poolSusarEuV2 = await createPoolSusarEuV2();
  const Ctll = { idCTLL: 31, BaseArchive: -1, EV_SafetyReportIdentifier: 'EU-EC-10012907966' };

  // const tbCtLL = await donneTbCTLL(poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
  // await sauvegardeObjet(tbCtLL,"tbCtLL")

  // const tbMedicaments = await donneTbProduits_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
  // await sauvegardeObjet(tbMedicaments,"tbMedicaments")
  // // console.log(tbMedicaments)
  // const tbEffetsIndesirables = await donneTbPT_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll);
  // await sauvegardeObjet(tbEffetsIndesirables,"tbEffetsIndesirables")

  // const tbCtLL = await chargementObjet("tbCtLL")
  // const tbMedicaments = await chargementObjet("tbMedicaments")
  // const tbEffetsIndesirables = await chargementObjet("tbEffetsIndesirables")

  const userAdresseMail = await donneToutAdresseMail(poolSusarDataOdbc)

  Object.defineProperty(global, 'userAdresseMail', {
    value: userAdresseMail,
    writable: false, // Empêche la modification de la valeur
    configurable: false, // Empêche la suppression ou la redéfinition de la propriété
    enumerable: true, // Permet d'énumérer la propriété (facultatif)
  });
  // console.log (global.userAdresseMail.filter((mail) => mail.UserName === 'Frannou')[0])
  // console.log(await donneAdresseMail(poolSusarDataOdbc,'Frannou'))  
  // console.log(await donneAdresseMail(poolSusarDataOdbc,'Mnedelec')) 
  // console.log(await donneAdresseMail(poolSusarDataOdbc,'Mnedeloc')) 

  // const PT = 'Cardiac failure acute (Not Recovered/Not Resolved - 07/07/2022 - 14d)'
  // const PT = 'Cardiac failure acute (Not Recovered/Not Resolved - 07/07/2022 - 14d),'

  let PT = `Drug-induced liver injury (Recovering/Resolving - n/a - n/a),`
  console.log(PT, parseReactionListPT(PT))
  PT = `Pleural effusion (Unknown - 16/01/2`
  console.log(PT, parseReactionListPT(PT))
  PT = `Platelet count decreased (Recoveri`
  console.log(PT, parseReactionListPT(PT))
  PT = `Chronic obstructive pulmonary disease (Recovered/Resolved - 27/06/2022 - 16d),`
  console.log(PT, parseReactionListPT(PT))
  PT = `Pneumonia influenzal (Not Recovered/Not Resolved - 21/01/2025 - n/a)`
  console.log(PT, parseReactionListPT(PT))
  PT = `Platelet count decreased (Recovering/Resolving - 22/10/2024 - n/a)`
  console.log(PT, parseReactionListPT(PT))
  PT = `Dehydration (Recovered/Resolved - 04/11/2024 - 1d),`
  console.log(PT, parseReactionListPT(PT))
  PT = `Diarrhoea (Recovered/Resolved - 04/11/2024 - 1d),`
  console.log(PT, parseReactionListPT(PT))
  PT = `Hypokalaemia (Recovered/Resolved - 04/11/2024 - 1d),`
  console.log(PT, parseReactionListPT(PT))
  PT = `Hyponatraemia (Recovered/Resolved - 04/11/2024 - 1d),`
  console.log(PT, parseReactionListPT(PT))
  PT = `Blood bilirubin increased (Not Recovered/Not Resolved - 19/07/2024 - n/a),<BR>`
  console.log(PT, parseReactionListPT(PT))
  PT = `Respiratory distress (Fatal - 05/07/2023 - n/a),<`
  console.log(PT, parseReactionListPT(PT))
  PT = `Respiratory distress (Fatal - 05/07/2023 - n/a),<`
  console.log(PT, parseReactionListPT(PT))
  PT = `Rash (Not Recovered/Not Resolved - 10/01/2025 - n/a),<`
  console.log(PT, parseReactionListPT(PT))
  PT = `Jugular vein thrombosis (Recovered/Resolved - 27/07/2023 - 2d),<BR><`
  console.log(PT, parseReactionListPT(PT))
  PT = `Blood alkaline phosphatase increased (Recovered/Resolved - 31/10/2024 - 5841min),<BR><B`
  console.log(PT, parseReactionListPT(PT))
  // PT = ``
  // console.log (PT,parseReactionListPT(PT))
  // PT = ``
  // console.log (PT,parseReactionListPT(PT))
  // PT = ``
  // console.log (PT,parseReactionListPT(PT))





  // const parser = new MedicParser();
  // let Med = `VYXEOS LIPOSOMAL POWDER FOR CONCENTRATE FOR SOLUTION FOR INFUSION [CYTARABINE, DAUNORUBICIN] (S - Acute myeloid leukaemia - Not applicable - [07/06/2022 - n/a - 100ug/m2 - Intravenous use])`
  // console.log(parser.parseMedicCtll(Med))
  // Med = `ABATACEPT [ABATACEPT] (S - Rheumatoid arthritis - Drug withdrawn - [03/01/2017 - n/a - n/a - Subcutaneous use]),`
  // console.log(parser.parseMedicCtll(Med))
  // Med = `THYMOGLOBULIN [RABBIT ANTI-HUMAN THYMOCYTE IMMUNOGLOBULIN] (S - Prophylaxis against transplant rejection - Unknown - [26/08/2021 - n/a - 100mg - Intravenous use - More in ICSR])`
  // console.log(parser.parseMedicCtll(Med))
  // Med = `HZN-4920 [HZN-4920] (S - Prophylaxis against transplant rejection - n/a - [07/04/2022 - 1d - 1500mg - Intravenous use - More in ICSR]),`
  // // PMedT = `HZN-4920 [HZN-4920] (S - Prophylaxis against transplant rejection - n/a - [07/04/2022 - 1d - 1500mg - Intravenous use - More in ICSR])`
  // console.log(parser.parseMedicCtll(Med))






  // const Ctll = {  idCTLL: 1, BaseArchive: 0, EV_SafetyReportIdentifier: 'EU-EC-10012907966'};
  // const med = await donneTbProduits_EU (poolSusarDataOdbc, poolSusarArchiveOdbc, Ctll)
  // for (const medoc of med) {
  //   console.log(medoc.ProduitSuspect_EU)
  // }
  // console.log (med)
  // const user1 = await donneAdresseMail('Frannou')
  // const user2 = await donneAdresseMail('Mnedelec')
  // console.log (user1)
  // console.log (user2)

  await closePoolSusarEuV1_Odbc(poolSusarDataOdbc);
  await closePoolSusarEuV1_Odbc(poolSusarArchiveOdbc);
  await closePoolSusarEuV2(poolSusarEuV2);

  logger.info('Fin test');
}

main()