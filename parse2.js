const fs = require('fs');

const raw = `1/01/2026;Enero;Otros;Sobrante del año 2025;S/ 1,220.77
30/01/2026;Enero;Salario;Walter devolvió algo del pago (f 120);S/ 50.00
30/01/2026;Enero;Salario;Pago Covisian capacitiación;S/ 100.00
1/02/2026;Febrero;Otros;Restante del mes pasado;S/ 927.45
18/02/2026;Febrero;Negocio;Catálogo diciembre y enero;S/ 500.00
28/02/2026;Febrero;Salario;Pago de capacitaciones;S/ 269.50
28/02/2026;Febrero;Salario;Pago de Covisian;S/ 1,163.24
21/02/2026;Febrero;Negocio;catálogo ultima semana febrero;S/ 50.00
21/02/2026;Febrero;Negocio;Instalación Microsoft Office novia de Frank;S/ 25.00
1/03/2026;Marzo;Otros;Restante del mes pasado;S/ 2,015.00
28/03/2026;Marzo;Salario;Liquidación Covisian;S/ 453.55
1/04/2026;Abril;Otros;Restante del mes pasado;S/ 531.75
21/04/2026;Abril;Negocio;Trabajo con Hugo DAE ADVISORY;S/ 450.00
18/04/2026;Abril;Negocio;Venta de PC;S/ 1,650.00
28/04/2026;Abril;Salario;Ingreso salario con Walter;S/ 2,271.08
1/05/2026;Mayo;Otros;Restante del mes pasado;S/ 3,147.65
24/05/2026;Mayo;Salario;Ingreso salario con Walter;S/ 905.59
4/05/2026;Mayo;Otros;Tia Adriana devolvió;S/ 200.00
31/05/2026;Mayo;Otros;Pagó mamá de Anthony PC GAMER;S/ 250.00
25/05/2026;Mayo;Negocio;2da parte de pago Hugo Soporte TI;S/ 212.50
1/06/2026;Junio;Otros;Restante del mes pasado;S/ 3,227.40
21/06/2026;Junio;Negocio;Trabajo con Hugo DAE ADVISORY;S/ 450.00
24/06/2026;Junio;Salario;Ingreso salario con Walter;S/ 500.00
===
30/01/2026;Enero;Servicios;Pago Internet Diciembre;S/ 100.00
7/01/2026;Enero;Servicios;Alquiler depa Enero + gas;S/ 250.00
4/01/2026;Enero;Servicios;Pago Entel Enero;S/ 20.00
30/01/2026;Enero;Gastos necesarios;Limpieza personal;S/ 25.50
1/01/2026;Enero;Salud;Sesión con Luis, inicia 05/01 - 8 sesiones;S/ 250.00
30/01/2026;Enero;Emergencia;Presté a tía Gissella;S/ 185.00
30/01/2026;Enero;Inversión;1ra matrícula y mensualidad Cibertec;S/ 79.80
8/01/2026;Enero;Inversión;Tía Violeta devolvió préstamo a contact.;-S/ 1,200.00
30/01/2026;Enero;Gastos necesarios;Desayuno;S/ 48.00
30/01/2026;Enero;Gastos necesarios;Almuerzo;S/ 66.33
30/01/2026;Enero;Gastos necesarios;Cena;S/ 131.00
30/01/2026;Enero;Gastos necesarios;Otros;S/ 107.50
3/01/2026;Enero;Gastos necesarios;Desodorantes Axe x2;S/ 19.00
3/01/2026;Enero;Gastos sin culpa;Delivery con Alejandro por 2do dia consecutivo;S/ 10.00
3/01/2026;Enero;Gastos sin culpa;Piscina con familia;S/ 36.00
3/01/2026;Enero;Gastos sin culpa;Tragos con Alejandro;S/ 13.80
6/01/2026;Enero;Gastos sin culpa;Tipakay con Estrella;S/ 17.00
8/01/2026;Enero;Gastos sin culpa;Broster con Estrella;S/ 12.00
13/01/2026;Enero;Gastos sin culpa;Jugo con Estrella;S/ 11.00
12/01/2026;Enero;Emergencia;Alejandro presté para internet 26.25;S/ 26.25
14/01/2026;Enero;Emergencia;Walter devolvió algo del pago (f 70);-S/ 50.00
13/01/2026;Enero;Emergencia;Pasajes;S/ 136.01
15/01/2026;Enero;Gastos necesarios;Recarga metropolitano;S/ 10.00
18/01/2026;Enero;Gastos necesarios;Temu compras bdsm;S/ 122.13
18/01/2026;Enero;Gastos necesarios;Combinado domingo 18 + helado;S/ 17.00
28/02/2026;Febrero;Servicios;Pago Internet Febrero;S/ 50.00
7/02/2026;Febrero;Servicios;Alquiler depa Febrero + gas;S/ 250.00
28/02/2026;Febrero;Gastos necesarios;Limpieza personal;S/ 19.50
1/02/2026;Febrero;Salud;Nuevo paquete para aprox 16 marzo (debo 100);S/ 100.00
28/02/2026;Febrero;Emergencia;Tía Gissella devolvió con interés;-S/ 205.00
28/02/2026;Febrero;Gastos necesarios;Desayuno;S/ 82.00
28/02/2026;Febrero;Gastos necesarios;Almuerzo;S/ 122.19
28/02/2026;Febrero;Gastos necesarios;Cena;S/ 48.00
28/02/2026;Febrero;Gastos necesarios;Otros;S/ 77.00
1/02/2026;Febrero;Gastos necesarios;Pasajes;S/ 60.00
2/02/2026;Febrero;Gastos sin culpa;Papel higienico;S/ 7.00
5/02/2026;Febrero;Gastos sin culpa;Bot doxeo + numero virtual;S/ 40.00
7/02/2026;Febrero;Gastos sin culpa;Galleta;S/ 2.80
19/02/2026;Febrero;Gastos sin culpa;Snack, dulces y gaseosa con niñas;S/ 13.20
20/02/2026;Febrero;Gastos sin culpa;Chip nuevo 933290959;S/ 5.00
20/02/2026;Febrero;Gastos sin culpa;Router TP-Link AX12 AC1200;S/ 123.00
21/02/2026;Febrero;Gastos sin culpa;Mejoras para bici;S/ 25.00
22/02/2026;Febrero;Gastos sin culpa;Salida con niñas y mamá;S/ 41.00
28/02/2026;Febrero;Gastos sin culpa;gastos domingo;S/ 59.50
11/03/2026;Marzo;Servicios;Alquiler depa Marzo + gas;S/ 250.00
28/03/2026;Marzo;Gastos necesarios;Limpieza personal;S/ 12.90
3/03/2026;Marzo;Gastos sin culpa;Cifrut para cumpleaños de Alejando;S/ 13.00
1/03/2026;Marzo;Salud;Nuevo paquete para aprox 16 marzo (debo 100);S/ 100.00
28/03/2026;Marzo;Gastos necesarios;Desayuno;S/ 21.00
28/03/2026;Marzo;Gastos necesarios;Almuerzo;S/ 6.00
28/03/2026;Marzo;Gastos necesarios;Cena;S/ 10.20
28/03/2026;Marzo;Gastos necesarios;Otros;S/ 21.10
6/03/2026;Marzo;Gastos sin culpa;Helado con Aleshka;S/ 2.00
6/03/2026;Marzo;Gastos sin culpa;Cojin almohada de silicona para asiento;S/ 27.30
6/03/2026;Marzo;Gastos necesarios;Yogurt + cereal;S/ 18.10
6/03/2026;Marzo;Gastos necesarios;Camote y espinaca;S/ 6.00
6/03/2026;Marzo;Gastos necesarios;2 cifruts para cumpeaños de Alejandro;S/ 13.00
7/03/2026;Marzo;Gastos sin culpa;Pollo con Angeles y Aleshka ;S/ 45.00
7/03/2026;Marzo;Gastos sin culpa;Helado con niñas;S/ 3.60
7/03/2026;Marzo;Gastos sin culpa;Pasaje bicentenario;S/ 10.00
7/03/2026;Marzo;Gastos sin culpa;dulces niñas;S/ 4.40
7/03/2026;Marzo;Gastos necesarios;Aceite 1L, pan, eterogermina, marcianos;S/ 18.80
18/03/2026;Marzo;Gastos necesarios;Zuko, pasajes, galletas, sandia, mandarina;S/ 48.50
19/03/2026;Marzo;Gastos necesarios;Dulces para familia;S/ 15.00
19/03/2026;Marzo;Gastos necesarios;Pastillas, mejora bicicleta 50, sandia;S/ 75.00
20/03/2026;Marzo;Emergencia;Laptop HP Ryzen 550U, 256 SSD, 16GB RAM;S/ 950.00
20/03/2026;Marzo;Emergencia;Taxi a Plaza Norte;S/ 43.50
20/03/2026;Marzo;Gastos necesarios;Helados para mamá y Aleshka;S/ 7.00
20/03/2026;Marzo;Emergencia;Pasaje a Arequipa;S/ 100.00
20/03/2026;Marzo;Emergencia;Gastos de viaje a Arequipa;S/ 79.40
25/03/2026;Marzo;Gastos necesarios;Hirudoid crema;S/ 11.00
31/03/2026;Marzo;Gastos necesarios;Cable USB Tipo C y Micro USB + mica;S/ 25.00
11/04/2026;Abril;Servicios;Alquiler depa Abril + gas;S/ 250.00
4/04/2026;Abril;Servicios;Pago Entel Abril;S/ 40.00
15/04/2026;Abril;Inversión;Cibertec;S/ 399.00
28/04/2026;Abril;Gastos necesarios;Desayuno;S/ 24.00
5/04/2026;Abril;Gastos sin culpa;Queso helado;S/ 24.00
9/04/2026;Abril;Gastos sin culpa;Dulces para Lima;S/ 12.00
15/04/2026;Abril;Gastos sin culpa;Downy;S/ 5.00
15/04/2026;Abril;Gastos sin culpa;Pasaje;S/ 13.30
15/04/2026;Abril;Gastos necesarios;Comida etc;S/ 97.50
19/04/2026;Abril;Gastos necesarios;Batería Redmi Note 10 Pro;S/ 90.00
19/04/2026;Abril;Gastos necesarios;Mas gastos comida;S/ 125.38
28/04/2026;Abril;Emergencia;Xiaomi Redmi Note 13 Pro 5G;S/ 675.00
4/05/2026;Mayo;Servicios;Pago Entel Abril;S/ 20.00
3/05/2026;Mayo;Gastos sin culpa;Gaseosa fanta kola inglesa;S/ 2.50
15/05/2026;Mayo;Inversión;Cibertec;S/ 399.00
6/05/2026;Mayo;Gastos sin culpa;gaseosa + empanada;S/ 5.00
7/05/2026;Mayo;Gastos sin culpa;Pizza con Walter;S/ 25.70
8/05/2026;Mayo;Gastos sin culpa;Snacks para viaje a Lima;S/ 39.50
8/05/2026;Mayo;Gastos sin culpa;Pasajes de Arequipa a Lima;S/ 100.00
9/05/2026;Mayo;Gastos sin culpa;Menu centro de Lima Combinado;S/ 18.00
9/05/2026;Mayo;Gastos sin culpa;Taxis de casa a cine y al reves;S/ 34.70
9/05/2026;Mayo;Gastos sin culpa;Gastos en cine con mamá y niñas (Michael);S/ 110.27
9/05/2026;Mayo;Gastos sin culpa;Pollo a la brasa con familia;S/ 51.00
10/05/2026;Mayo;Gastos sin culpa;Desayuno día de la madre;S/ 33.00
10/05/2026;Mayo;Gastos sin culpa;Makis y taxi con familia;S/ 90.40
10/05/2026;Mayo;Gastos sin culpa;Pasaje moto mudanza de depa a casa;S/ 24.00
10/05/2026;Mayo;Gastos sin culpa;Casaca negra invierno;S/ 31.00
11/05/2026;Mayo;Gastos sin culpa;Desayuno niñas;S/ 7.00
12/05/2026;Mayo;Gastos sin culpa;Gaseosa;S/ 4.50
12/05/2026;Mayo;Gastos sin culpa;Control TV Stick Xiaomi 50/50 con Alejandro;S/ 20.00
13/05/2026;Mayo;Gastos sin culpa;Coca Cola con Leche;S/ 16.50
14/05/2026;Mayo;Gastos sin culpa;cuates ;S/ 1.20
14/05/2026;Mayo;Gastos sin culpa;Downy;S/ 4.50
14/05/2026;Mayo;Gastos sin culpa;Chocolate para Angeles;S/ 2.00
15/05/2026;Mayo;Gastos sin culpa;Menu;S/ 11.00
15/05/2026;Mayo;Gastos sin culpa;Combinado + chicha con Angeles;S/ 15.00
15/05/2026;Mayo;Gastos sin culpa;Marcianos;S/ 2.00
15/05/2026;Mayo;Gastos sin culpa;Cena;S/ 5.20
15/05/2026;Mayo;Gastos sin culpa;1kg huevo;S/ 6.40
15/05/2026;Mayo;Gastos sin culpa;Aceite;S/ 6.50
15/05/2026;Mayo;Gastos sin culpa;Platano maduro, ocopa y zuko;S/ 8.90
15/05/2026;Mayo;Gastos sin culpa;Cena chocolatada;S/ 4.50
16/05/2026;Mayo;Gastos sin culpa;pastillas para mamá;S/ 3.40
16/05/2026;Mayo;Gastos sin culpa;Medio pollo con mamá;S/ 15.00
17/05/2026;Mayo;Gastos sin culpa;Gaseosa;S/ 4.00
17/05/2026;Mayo;Gastos sin culpa;Pasajes;S/ 6.00
17/05/2026;Mayo;Gastos sin culpa;Pop Corn;S/ 2.00
17/05/2026;Mayo;Gastos sin culpa;Doña Pepa;S/ 4.50
17/05/2026;Mayo;Gastos sin culpa;Pepsi Jumbo;S/ 3.20
17/05/2026;Mayo;Gastos sin culpa;Emoliente y agua;S/ 3.00
18/05/2026;Mayo;Gastos sin culpa;Marciano y pasajes con Aleshka;S/ 7.00
18/05/2026;Mayo;Gastos sin culpa;snacks para niñas Reniec;S/ 17.50
18/05/2026;Mayo;Gastos sin culpa;Jugo con niñas;S/ 29.00
18/05/2026;Mayo;Gastos sin culpa;2 zukos + 2 churros;S/ 6.40
19/05/2026;Mayo;Gastos sin culpa;par de pilas;S/ 2.00
19/05/2026;Mayo;Gastos necesarios;Internet 2 meses;S/ 102.50
20/05/2026;Mayo;Gastos sin culpa;Par de medias + lapiceros;S/ 6.60
20/05/2026;Mayo;Gastos sin culpa;Pastillas + agua;S/ 4.80
20/05/2026;Mayo;Gastos necesarios;Pasaje de Lima a Arequipa;S/ 80.00
20/05/2026;Mayo;Gastos sin culpa;Gaseosa y dulce;S/ 7.50
23/05/2026;Mayo;Gastos sin culpa;Candado;S/ 6.00
23/05/2026;Mayo;Gastos sin culpa;Libre Enjuague Downy;S/ 7.00
24/05/2026;Mayo;Gastos sin culpa;Google AI Pro giovanni.oliveirap7@gmail.com;S/ 35.00
26/05/2026;Mayo;Gastos sin culpa;Recarga Guillermo hacia mi;S/ 5.00
26/05/2026;Mayo;Gastos sin culpa;Agua;S/ 2.60
26/05/2026;Mayo;Gastos sin culpa;Pasajes;S/ 6.00
28/05/2026;Mayo;Gastos sin culpa;Powerade;S/ 3.70
29/05/2026;Mayo;Gastos sin culpa;Gaseosa fanta kola inglesa;S/ 3.00
30/05/2026;Mayo;Gastos sin culpa;Gaseosa y galleta;S/ 2.87
31/05/2026;Mayo;Gastos sin culpa;Axe Ice Chill;S/ 13.50
4/06/2026;Junio;Servicios;Pago Internet Junio;S/ 20.00
3/06/2026;Junio;Gastos sin culpa;Pasaje a Tacna;S/ 25.00
15/06/2026;Junio;Inversión;Cibertec;S/ 644.00
28/06/2026;Junio;Gastos necesarios;Desayuno;S/ 8.00
28/06/2026;Junio;Gastos necesarios;Almuerzo;S/ 50.00
28/06/2026;Junio;Gastos necesarios;Cena;S/ 34.00
28/06/2026;Junio;Emergencia;Presté a Jorge 500;S/ 500.00
6/06/2026;Junio;Gastos sin culpa;Cena con Walter y tío Candido;S/ 61.00
6/06/2026;Junio;Gastos sin culpa;Café Ganoderma;S/ 11.00
7/06/2026;Junio;Gastos sin culpa;Audífonos para Angeles;S/ 25.00
7/06/2026;Junio;Gastos sin culpa;Cable USB;S/ 5.00
7/06/2026;Junio;Gastos sin culpa;Reloj para niñas;S/ 15.00
7/06/2026;Junio;Gastos sin culpa;Zapatillas Nike GoFlyEase;S/ 80.00
7/06/2026;Junio;Gastos sin culpa;Pasajes taxi en Tacna;S/ 9.00
8/06/2026;Junio;Gastos sin culpa;Mochila negra preferida;S/ 48.00
12/06/2026;Junio;Gastos sin culpa;GASTOS FUTUROS: TACNA;S/ 25.00
12/06/2026;Junio;Gastos sin culpa; TACNA A ARICA IDA Y VUELTA C/FOOD;S/ 50.00
12/06/2026;Junio;Gastos sin culpa; TACNA A AREQUIPA IDA Y VUELTA;S/ 25.00
12/06/2026;Junio;Gastos sin culpa;TACNA A PUNO;S/ 30.00
12/06/2026;Junio;Gastos sin culpa;Salida en Puno;S/ 70.00
12/06/2026;Junio;Gastos sin culpa;Pasaje a Arequipa;S/ 50.00
`

let js = [];
const lines = raw.split('\n');
let isEgreso = false;
for (const line of lines) {
  if (line.trim() === '===') {
    isEgreso = true;
    continue;
  }
  const parts = line.split(';');
  if (parts.length < 5) continue;
  let datePart = parts[0].trim();
  let [d,m,y] = datePart.split('/');
  if (d.length === 1) d = '0' + d;
  const fecha = `${y}-${m}-${d}`;
  
  const cat = parts[2].trim();
  const conc = parts[3].trim();
  let montoStr = parts[4].trim();
  
  let monto = parseFloat(montoStr.replace(/[^\d.-]/g, ''));
  // REMOVED: if (montoStr.includes('-S/')) monto = -monto; 
  // Because replace(/[^\d.-]/g, '') ALREADY preserves the minus sign!

  js.push({
    fecha,
    tipo: isEgreso ? 'Egreso' : 'Ingreso',
    categoria: cat,
    concepto: conc,
    monto: monto,
    presupuesto: monto
  });
}

const content = `
import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

const jsonData = ${JSON.stringify(js, null, 2)};

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

export async function importShioData(db: SQLiteDatabase) {
  const ts = new Date().toISOString();
  console.log('Importando datos...');
  
  // Limpiar transacciones
  await db.runAsync('DELETE FROM transacciones WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);
  await db.runAsync('DELETE FROM presupuesto_categoria WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);

  // Map to store sum of budgets per month-category
  const presupuestos: Record<string, number> = {};

  await db.withTransactionAsync(async () => {
    for (const item of jsonData) {
      if (!item.fecha) continue;
      if (item.concepto === 'Restante del mes pasado' || item.concepto === 'Restante del mes anterior') continue;

      // Monto real
      let monto_real = item.monto !== null ? item.monto : (item.presupuesto !== null ? item.presupuesto : 0);
      let monto_presupuestado = item.presupuesto !== null ? item.presupuesto : monto_real;
      
      const tipo = item.tipo.toLowerCase();
      let cat_ingreso_id = null;
      let cat_egreso_id = null;

      if (tipo === 'ingreso') {
        cat_ingreso_id = catIngresoMap[item.categoria] || 'ci-otros';
      } else {
        cat_egreso_id = catEgresoMap[item.categoria] || 'ce-sinculpa';
        
        // Sumar presupuesto para este mes
        const mes = item.fecha.substring(0, 7) + '-01';
        const key = \`\${mes}_\${cat_egreso_id}\`;
        if (!presupuestos[key]) presupuestos[key] = 0;
        presupuestos[key] += monto_presupuestado;
      }

      await db.runAsync(
        \`INSERT INTO transacciones (
          id_local, espacio_id, fecha, tipo, categoria_ingreso_id, categoria_egreso_id, 
          monto_real, monto_presupuestado, nota, estado_sync, fecha_modificacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)\`,
        [
          Crypto.randomUUID(), DEFAULT_ESPACIO_ID, item.fecha, tipo,
          cat_ingreso_id, cat_egreso_id, monto_real, monto_presupuestado,
          item.concepto || '', ts
        ]
      );
    }

    // Insertar los presupuestos sumados
    for (const [key, monto] of Object.entries(presupuestos)) {
      const [mes, catId] = key.split('_');
      await db.runAsync(
        \`INSERT INTO presupuesto_categoria (
          id_local, espacio_id, mes, categoria_egreso_id, 
          porcentaje_asignado, monto_asignado, estado_sync, fecha_modificacion
        ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)\`,
        [
          Crypto.randomUUID(), DEFAULT_ESPACIO_ID, mes, catId,
          0, Math.max(0, monto), ts
        ]
      );
    }
  });

  console.log('Importación terminada con éxito!');
}
`;

fs.writeFileSync('src/utils/importShio.ts', content);
console.log('Written to src/utils/importShio.ts');
