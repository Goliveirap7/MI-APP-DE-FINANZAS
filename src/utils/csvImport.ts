import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

const catEgresoMap: Record<string, string> = {
  'Servicios': 'ce-servicios',
  'Gastos necesarios': 'ce-necesarios',
  'Gastos sin culpa': 'ce-sinculpa',
  'Salud': 'ce-salud',
  'Emergencia': 'ce-emergencia',
  'Inversión': 'ce-inversion'
};

const catIngresoMap: Record<string, string> = {
  'Salario': 'ci-salario',
  'Negocio': 'ci-negocio',
  'Otros': 'ci-otros'
};

function parseDate(dateStr: string): string {
  // Intenta convertir DD/MM/YYYY a YYYY-MM-DD
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr;
}

export async function pickAndImportCSV(db: SQLiteDatabase): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: 'Importación cancelada' };
    }

    const file = result.assets[0];
    let fileContent: string;
    try {
      fileContent = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (e: any) {
      console.warn('FileSystem failed, falling back to fetch:', e.message);
      try {
        const response = await fetch(file.uri);
        fileContent = await response.text();
      } catch (fetchError: any) {
        return { success: false, message: `Error leyendo archivo: ${e.message} / Fetch error: ${fetchError.message}` };
      }
    }

    // Convertir de CSV a JSON
    let parsed;
    try {
      parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.replace(/^\uFEFF/, '').toLowerCase().trim()
      });
    } catch (e: any) {
      return { success: false, message: `Error PapaParse: ${e.message}` };
    }

    // Ignoramos errores menores de parseo, solo procesamos lo que podamos
    const rows = parsed.data as any[];
    if (rows.length === 0) {
      return { success: false, message: 'El archivo CSV está vacío.' };
    }

    const keys = Object.keys(rows[0] || {});
    if (!keys.includes('fecha') || !keys.includes('tipo') || !keys.includes('monto')) {
      return { success: false, message: 'Faltan columnas requeridas (Fecha, Tipo, Monto).' };
    }

    let insertedCount = 0;
    const ts = new Date().toISOString();

    try {
      await db.withTransactionAsync(async () => {
        for (const row of rows) {
          if (!row.fecha || !row.tipo || row.monto == null) continue;

          let conceptoStr = row.concepto?.trim() || '';
          const fechaISO = parseDate(row.fecha.trim());
          const tipoStr = row.tipo.trim().toLowerCase();
          const categoriaStr = row.categoria?.trim() || 'Otros';

          // Quitar S/, espacios y comas del monto
          let montoStr = row.monto.toString().replace(/[^\d.-]/g, '');
          const monto = parseFloat(montoStr);

          if (isNaN(monto)) continue;

          let cat_ingreso_id = null;
          let cat_egreso_id = null;

          if (tipoStr === 'ingreso') {
            cat_ingreso_id = catIngresoMap[categoriaStr] || 'ci-otros';
          } else if (tipoStr === 'egreso') {
            cat_egreso_id = catEgresoMap[categoriaStr] || 'ce-sinculpa';
          } else {
            continue; // Saltar si no es ingreso o egreso válido
          }

          await db.runAsync(
            `INSERT INTO transacciones (
              id_local, espacio_id, fecha, tipo, categoria_ingreso_id, categoria_egreso_id, 
              monto_real, monto_presupuestado, nota, billetera, estado_sync, fecha_modificacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Yape', 'pendiente', ?)`,
            [
              Crypto.randomUUID(), DEFAULT_ESPACIO_ID, fechaISO, tipoStr,
              cat_ingreso_id, cat_egreso_id, monto, monto,
              conceptoStr, ts
            ]
          );
          insertedCount++;
        }
      });
    } catch (dbError: any) {
      return { success: false, message: `Error DB: ${dbError.message}` };
    }

    return { success: true, message: `Se importaron ${insertedCount} transacciones correctamente.`, count: insertedCount };
  } catch (error: any) {
    console.error('Import CSV Error:', error);
    return { success: false, message: `Error interno: ${error.message}` };
  }
}
