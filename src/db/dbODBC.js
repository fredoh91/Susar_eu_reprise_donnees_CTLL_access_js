// import mysql from 'mysql2/promise';
import odbc from 'odbc';
import path from 'path';
import { fileURLToPath } from 'url';


// import 'dotenv/config'
import dotenv from 'dotenv';

// const envPath = path.resolve(__dirname, '..', '.env');
const currentUrl = import.meta.url;
const currentDir = path.dirname(fileURLToPath(currentUrl));
const envPath = path.resolve(currentDir, '..', '.env');
dotenv.config({ path: envPath });


// -------------------------------------------------------------------------------
// --        Création d'un pool de connexion pour aux base SUSAR_EU via ODBC    --
// -------------------------------------------------------------------------------
/**
 * Crée un pool de connexion pour la base SUSAR_EU DATA via ODBC
 * @returns Promise<odbc.Pool> Le pool de connexion
 */
async function createPoolSusarEuV1_Odbc(typeBase) {
  try {
    if(typeBase=='DATA'){
      const connectionConfig = {
        connectionString: `Driver={Microsoft Access Driver (*.mdb, *.accdb)};
                          DBQ=${process.env.PATH_SUSAR_EU_V1_DATA};
                          CHARSET=UTF8`,
        connectionTimeout: 10,
        loginTimeout: 10,
      }
    }
    else if(typeBase=='ARCHIVE'){
        const connectionConfig = {
          connectionString: `Driver={Microsoft Access Driver (*.mdb, *.accdb)};
                          DBQ=${process.env.PATH_SUSAR_EU_V1_ARCHIVE};
                          CHARSET=UTF8`,
          connectionTimeout: 10,
          loginTimeout: 10,
        }
    } else {
      throw new Error('Type de base non reconnu');
    }

    const connectionConfig = {
      connectionString: `Driver={Microsoft Access Driver (*.mdb, *.accdb)};
                          DBQ=${process.env.PATH_SUSAR_EU_V1_DATA};
                          CHARSET=UTF8`,
      connectionTimeout: 10,
      loginTimeout: 10,
    };

    const pool = await odbc.pool(connectionConfig);
    
    console.log('Pool BDD SUSAR_' + typeBase + '/ODBC ouvert');

    return pool;
  } catch (err) {
    console.error('Erreur à la connexion BDD SUSAR_' + typeBase + '/ODBC :', err);
    throw err;
  }
}



// -------------------------------------------------------------------------------
// --                          Ferme le pool CODEX via ODBC                     --
// -------------------------------------------------------------------------------
/**
 * Ferme le pool pour les bases SUSAR_EU DATA et ARCHIVE via ODBC
 * @param pool Le pool de connexion à fermer
 */
async function closePoolSusarEuV1_Odbc(pool) {
  try {
    console.log('Fermeture du pool vers la BDD SUSAR/ODBC');
    pool.close();
  } catch (err) {
    console.error('Erreur à la fermeture de la connexion de CODEX/ODBC :', err);
    throw err;
  }
}

export {
  createPoolSusarEuV1_Odbc,
  closePoolSusarEuV1_Odbc,
};

