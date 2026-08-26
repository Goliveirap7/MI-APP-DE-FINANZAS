
import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

const jsonData = [
  {
    "fecha": "2026-01-01",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Sobrante del año 2025",
    "monto": 1220.77,
    "presupuesto": 1220.77
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Walter devolvió algo del pago (f 120)",
    "monto": 50,
    "presupuesto": 50
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Pago Covisian capacitiación",
    "monto": 100,
    "presupuesto": 100
  },
  {
    "fecha": "2026-02-01",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Restante del mes pasado",
    "monto": 927.45,
    "presupuesto": 927.45
  },
  {
    "fecha": "2026-02-18",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "Catálogo diciembre y enero",
    "monto": 500,
    "presupuesto": 500
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Pago de capacitaciones",
    "monto": 269.5,
    "presupuesto": 269.5
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Pago de Covisian",
    "monto": 1163.24,
    "presupuesto": 1163.24
  },
  {
    "fecha": "2026-02-21",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "catálogo ultima semana febrero",
    "monto": 50,
    "presupuesto": 50
  },
  {
    "fecha": "2026-02-21",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "Instalación Microsoft Office novia de Frank",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-03-01",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Restante del mes pasado",
    "monto": 2015,
    "presupuesto": 2015
  },
  {
    "fecha": "2026-03-28",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Liquidación Covisian",
    "monto": 453.55,
    "presupuesto": 453.55
  },
  {
    "fecha": "2026-04-01",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Restante del mes pasado",
    "monto": 531.75,
    "presupuesto": 531.75
  },
  {
    "fecha": "2026-04-21",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "Trabajo con Hugo DAE ADVISORY",
    "monto": 450,
    "presupuesto": 450
  },
  {
    "fecha": "2026-04-18",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "Venta de PC",
    "monto": 1650,
    "presupuesto": 1650
  },
  {
    "fecha": "2026-04-28",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Ingreso salario con Walter",
    "monto": 2271.08,
    "presupuesto": 2271.08
  },
  {
    "fecha": "2026-05-01",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Restante del mes pasado",
    "monto": 3147.65,
    "presupuesto": 3147.65
  },
  {
    "fecha": "2026-05-24",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Ingreso salario con Walter",
    "monto": 905.59,
    "presupuesto": 905.59
  },
  {
    "fecha": "2026-05-04",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Tia Adriana devolvió",
    "monto": 200,
    "presupuesto": 200
  },
  {
    "fecha": "2026-05-31",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Pagó mamá de Anthony PC GAMER",
    "monto": 250,
    "presupuesto": 250
  },
  {
    "fecha": "2026-05-25",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "2da parte de pago Hugo Soporte TI",
    "monto": 212.5,
    "presupuesto": 212.5
  },
  {
    "fecha": "2026-06-01",
    "tipo": "Ingreso",
    "categoria": "Otros",
    "concepto": "Restante del mes pasado",
    "monto": 3227.4,
    "presupuesto": 3227.4
  },
  {
    "fecha": "2026-06-21",
    "tipo": "Ingreso",
    "categoria": "Negocio",
    "concepto": "Trabajo con Hugo DAE ADVISORY",
    "monto": 450,
    "presupuesto": 450
  },
  {
    "fecha": "2026-06-24",
    "tipo": "Ingreso",
    "categoria": "Salario",
    "concepto": "Ingreso salario con Walter",
    "monto": 500,
    "presupuesto": 500
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Pago Internet Diciembre",
    "monto": 100,
    "presupuesto": 100
  },
  {
    "fecha": "2026-01-07",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Alquiler depa Enero + gas",
    "monto": 250,
    "presupuesto": 250
  },
  {
    "fecha": "2026-01-04",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Pago Entel Enero",
    "monto": 20,
    "presupuesto": 20
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Limpieza personal",
    "monto": 25.5,
    "presupuesto": 25.5
  },
  {
    "fecha": "2026-01-01",
    "tipo": "Egreso",
    "categoria": "Salud",
    "concepto": "Sesión con Luis, inicia 05/01 - 8 sesiones",
    "monto": 250,
    "presupuesto": 250
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Presté a tía Gissella",
    "monto": 185,
    "presupuesto": 185
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Inversión",
    "concepto": "1ra matrícula y mensualidad Cibertec",
    "monto": 79.8,
    "presupuesto": 79.8
  },
  {
    "fecha": "2026-01-08",
    "tipo": "Egreso",
    "categoria": "Inversión",
    "concepto": "Tía Violeta devolvió préstamo a contact.",
    "monto": -1200,
    "presupuesto": -1200
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Desayuno",
    "monto": 48,
    "presupuesto": 48
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Almuerzo",
    "monto": 66.33,
    "presupuesto": 66.33
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Cena",
    "monto": 131,
    "presupuesto": 131
  },
  {
    "fecha": "2026-01-30",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Otros",
    "monto": 107.5,
    "presupuesto": 107.5
  },
  {
    "fecha": "2026-01-03",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Desodorantes Axe x2",
    "monto": 19,
    "presupuesto": 19
  },
  {
    "fecha": "2026-01-03",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Delivery con Alejandro por 2do dia consecutivo",
    "monto": 10,
    "presupuesto": 10
  },
  {
    "fecha": "2026-01-03",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Piscina con familia",
    "monto": 36,
    "presupuesto": 36
  },
  {
    "fecha": "2026-01-03",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Tragos con Alejandro",
    "monto": 13.8,
    "presupuesto": 13.8
  },
  {
    "fecha": "2026-01-06",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Tipakay con Estrella",
    "monto": 17,
    "presupuesto": 17
  },
  {
    "fecha": "2026-01-08",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Broster con Estrella",
    "monto": 12,
    "presupuesto": 12
  },
  {
    "fecha": "2026-01-13",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Jugo con Estrella",
    "monto": 11,
    "presupuesto": 11
  },
  {
    "fecha": "2026-01-12",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Alejandro presté para internet 26.25",
    "monto": 26.25,
    "presupuesto": 26.25
  },
  {
    "fecha": "2026-01-14",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Walter devolvió algo del pago (f 70)",
    "monto": -50,
    "presupuesto": -50
  },
  {
    "fecha": "2026-01-13",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Pasajes",
    "monto": 136.01,
    "presupuesto": 136.01
  },
  {
    "fecha": "2026-01-15",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Recarga metropolitano",
    "monto": 10,
    "presupuesto": 10
  },
  {
    "fecha": "2026-01-18",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Temu compras bdsm",
    "monto": 122.13,
    "presupuesto": 122.13
  },
  {
    "fecha": "2026-01-18",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Combinado domingo 18 + helado",
    "monto": 17,
    "presupuesto": 17
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Pago Internet Febrero",
    "monto": 50,
    "presupuesto": 50
  },
  {
    "fecha": "2026-02-07",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Alquiler depa Febrero + gas",
    "monto": 250,
    "presupuesto": 250
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Limpieza personal",
    "monto": 19.5,
    "presupuesto": 19.5
  },
  {
    "fecha": "2026-02-01",
    "tipo": "Egreso",
    "categoria": "Salud",
    "concepto": "Nuevo paquete para aprox 16 marzo (debo 100)",
    "monto": 100,
    "presupuesto": 100
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Tía Gissella devolvió con interés",
    "monto": -205,
    "presupuesto": -205
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Desayuno",
    "monto": 82,
    "presupuesto": 82
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Almuerzo",
    "monto": 122.19,
    "presupuesto": 122.19
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Cena",
    "monto": 48,
    "presupuesto": 48
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Otros",
    "monto": 77,
    "presupuesto": 77
  },
  {
    "fecha": "2026-02-01",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Pasajes",
    "monto": 60,
    "presupuesto": 60
  },
  {
    "fecha": "2026-02-02",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Papel higienico",
    "monto": 7,
    "presupuesto": 7
  },
  {
    "fecha": "2026-02-05",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Bot doxeo + numero virtual",
    "monto": 40,
    "presupuesto": 40
  },
  {
    "fecha": "2026-02-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Galleta",
    "monto": 2.8,
    "presupuesto": 2.8
  },
  {
    "fecha": "2026-02-19",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Snack, dulces y gaseosa con niñas",
    "monto": 13.2,
    "presupuesto": 13.2
  },
  {
    "fecha": "2026-02-20",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Chip nuevo 933290959",
    "monto": 5,
    "presupuesto": 5
  },
  {
    "fecha": "2026-02-20",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Router TP-Link AX12 AC1200",
    "monto": 123,
    "presupuesto": 123
  },
  {
    "fecha": "2026-02-21",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Mejoras para bici",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-02-22",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Salida con niñas y mamá",
    "monto": 41,
    "presupuesto": 41
  },
  {
    "fecha": "2026-02-28",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "gastos domingo",
    "monto": 59.5,
    "presupuesto": 59.5
  },
  {
    "fecha": "2026-03-11",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Alquiler depa Marzo + gas",
    "monto": 250,
    "presupuesto": 250
  },
  {
    "fecha": "2026-03-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Limpieza personal",
    "monto": 12.9,
    "presupuesto": 12.9
  },
  {
    "fecha": "2026-03-03",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Cifrut para cumpleaños de Alejando",
    "monto": 13,
    "presupuesto": 13
  },
  {
    "fecha": "2026-03-01",
    "tipo": "Egreso",
    "categoria": "Salud",
    "concepto": "Nuevo paquete para aprox 16 marzo (debo 100)",
    "monto": 100,
    "presupuesto": 100
  },
  {
    "fecha": "2026-03-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Desayuno",
    "monto": 21,
    "presupuesto": 21
  },
  {
    "fecha": "2026-03-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Almuerzo",
    "monto": 6,
    "presupuesto": 6
  },
  {
    "fecha": "2026-03-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Cena",
    "monto": 10.2,
    "presupuesto": 10.2
  },
  {
    "fecha": "2026-03-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Otros",
    "monto": 21.1,
    "presupuesto": 21.1
  },
  {
    "fecha": "2026-03-06",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Helado con Aleshka",
    "monto": 2,
    "presupuesto": 2
  },
  {
    "fecha": "2026-03-06",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Cojin almohada de silicona para asiento",
    "monto": 27.3,
    "presupuesto": 27.3
  },
  {
    "fecha": "2026-03-06",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Yogurt + cereal",
    "monto": 18.1,
    "presupuesto": 18.1
  },
  {
    "fecha": "2026-03-06",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Camote y espinaca",
    "monto": 6,
    "presupuesto": 6
  },
  {
    "fecha": "2026-03-06",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "2 cifruts para cumpeaños de Alejandro",
    "monto": 13,
    "presupuesto": 13
  },
  {
    "fecha": "2026-03-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pollo con Angeles y Aleshka",
    "monto": 45,
    "presupuesto": 45
  },
  {
    "fecha": "2026-03-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Helado con niñas",
    "monto": 3.6,
    "presupuesto": 3.6
  },
  {
    "fecha": "2026-03-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasaje bicentenario",
    "monto": 10,
    "presupuesto": 10
  },
  {
    "fecha": "2026-03-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "dulces niñas",
    "monto": 4.4,
    "presupuesto": 4.4
  },
  {
    "fecha": "2026-03-07",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Aceite 1L, pan, eterogermina, marcianos",
    "monto": 18.8,
    "presupuesto": 18.8
  },
  {
    "fecha": "2026-03-18",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Zuko, pasajes, galletas, sandia, mandarina",
    "monto": 48.5,
    "presupuesto": 48.5
  },
  {
    "fecha": "2026-03-19",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Dulces para familia",
    "monto": 15,
    "presupuesto": 15
  },
  {
    "fecha": "2026-03-19",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Pastillas, mejora bicicleta 50, sandia",
    "monto": 75,
    "presupuesto": 75
  },
  {
    "fecha": "2026-03-20",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Laptop HP Ryzen 550U, 256 SSD, 16GB RAM",
    "monto": 950,
    "presupuesto": 950
  },
  {
    "fecha": "2026-03-20",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Taxi a Plaza Norte",
    "monto": 43.5,
    "presupuesto": 43.5
  },
  {
    "fecha": "2026-03-20",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Helados para mamá y Aleshka",
    "monto": 7,
    "presupuesto": 7
  },
  {
    "fecha": "2026-03-20",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Pasaje a Arequipa",
    "monto": 100,
    "presupuesto": 100
  },
  {
    "fecha": "2026-03-20",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Gastos de viaje a Arequipa",
    "monto": 79.4,
    "presupuesto": 79.4
  },
  {
    "fecha": "2026-03-25",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Hirudoid crema",
    "monto": 11,
    "presupuesto": 11
  },
  {
    "fecha": "2026-03-31",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Cable USB Tipo C y Micro USB + mica",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-04-11",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Alquiler depa Abril + gas",
    "monto": 250,
    "presupuesto": 250
  },
  {
    "fecha": "2026-04-04",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Pago Entel Abril",
    "monto": 40,
    "presupuesto": 40
  },
  {
    "fecha": "2026-04-15",
    "tipo": "Egreso",
    "categoria": "Inversión",
    "concepto": "Cibertec",
    "monto": 399,
    "presupuesto": 399
  },
  {
    "fecha": "2026-04-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Desayuno",
    "monto": 24,
    "presupuesto": 24
  },
  {
    "fecha": "2026-04-05",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Queso helado",
    "monto": 24,
    "presupuesto": 24
  },
  {
    "fecha": "2026-04-09",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Dulces para Lima",
    "monto": 12,
    "presupuesto": 12
  },
  {
    "fecha": "2026-04-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Downy",
    "monto": 5,
    "presupuesto": 5
  },
  {
    "fecha": "2026-04-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasaje",
    "monto": 13.3,
    "presupuesto": 13.3
  },
  {
    "fecha": "2026-04-15",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Comida etc",
    "monto": 97.5,
    "presupuesto": 97.5
  },
  {
    "fecha": "2026-04-19",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Batería Redmi Note 10 Pro",
    "monto": 90,
    "presupuesto": 90
  },
  {
    "fecha": "2026-04-19",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Mas gastos comida",
    "monto": 125.38,
    "presupuesto": 125.38
  },
  {
    "fecha": "2026-04-28",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Xiaomi Redmi Note 13 Pro 5G",
    "monto": 675,
    "presupuesto": 675
  },
  {
    "fecha": "2026-05-04",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Pago Entel Abril",
    "monto": 20,
    "presupuesto": 20
  },
  {
    "fecha": "2026-05-03",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gaseosa fanta kola inglesa",
    "monto": 2.5,
    "presupuesto": 2.5
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Inversión",
    "concepto": "Cibertec",
    "monto": 399,
    "presupuesto": 399
  },
  {
    "fecha": "2026-05-06",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "gaseosa + empanada",
    "monto": 5,
    "presupuesto": 5
  },
  {
    "fecha": "2026-05-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pizza con Walter",
    "monto": 25.7,
    "presupuesto": 25.7
  },
  {
    "fecha": "2026-05-08",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Snacks para viaje a Lima",
    "monto": 39.5,
    "presupuesto": 39.5
  },
  {
    "fecha": "2026-05-08",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasajes de Arequipa a Lima",
    "monto": 100,
    "presupuesto": 100
  },
  {
    "fecha": "2026-05-09",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Menu centro de Lima Combinado",
    "monto": 18,
    "presupuesto": 18
  },
  {
    "fecha": "2026-05-09",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Taxis de casa a cine y al reves",
    "monto": 34.7,
    "presupuesto": 34.7
  },
  {
    "fecha": "2026-05-09",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gastos en cine con mamá y niñas (Michael)",
    "monto": 110.27,
    "presupuesto": 110.27
  },
  {
    "fecha": "2026-05-09",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pollo a la brasa con familia",
    "monto": 51,
    "presupuesto": 51
  },
  {
    "fecha": "2026-05-10",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Desayuno día de la madre",
    "monto": 33,
    "presupuesto": 33
  },
  {
    "fecha": "2026-05-10",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Makis y taxi con familia",
    "monto": 90.4,
    "presupuesto": 90.4
  },
  {
    "fecha": "2026-05-10",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasaje moto mudanza de depa a casa",
    "monto": 24,
    "presupuesto": 24
  },
  {
    "fecha": "2026-05-10",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Casaca negra invierno",
    "monto": 31,
    "presupuesto": 31
  },
  {
    "fecha": "2026-05-11",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Desayuno niñas",
    "monto": 7,
    "presupuesto": 7
  },
  {
    "fecha": "2026-05-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gaseosa",
    "monto": 4.5,
    "presupuesto": 4.5
  },
  {
    "fecha": "2026-05-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Control TV Stick Xiaomi 50/50 con Alejandro",
    "monto": 20,
    "presupuesto": 20
  },
  {
    "fecha": "2026-05-13",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Coca Cola con Leche",
    "monto": 16.5,
    "presupuesto": 16.5
  },
  {
    "fecha": "2026-05-14",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "cuates",
    "monto": 1.2,
    "presupuesto": 1.2
  },
  {
    "fecha": "2026-05-14",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Downy",
    "monto": 4.5,
    "presupuesto": 4.5
  },
  {
    "fecha": "2026-05-14",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Chocolate para Angeles",
    "monto": 2,
    "presupuesto": 2
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Menu",
    "monto": 11,
    "presupuesto": 11
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Combinado + chicha con Angeles",
    "monto": 15,
    "presupuesto": 15
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Marcianos",
    "monto": 2,
    "presupuesto": 2
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Cena",
    "monto": 5.2,
    "presupuesto": 5.2
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "1kg huevo",
    "monto": 6.4,
    "presupuesto": 6.4
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Aceite",
    "monto": 6.5,
    "presupuesto": 6.5
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Platano maduro, ocopa y zuko",
    "monto": 8.9,
    "presupuesto": 8.9
  },
  {
    "fecha": "2026-05-15",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Cena chocolatada",
    "monto": 4.5,
    "presupuesto": 4.5
  },
  {
    "fecha": "2026-05-16",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "pastillas para mamá",
    "monto": 3.4,
    "presupuesto": 3.4
  },
  {
    "fecha": "2026-05-16",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Medio pollo con mamá",
    "monto": 15,
    "presupuesto": 15
  },
  {
    "fecha": "2026-05-17",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gaseosa",
    "monto": 4,
    "presupuesto": 4
  },
  {
    "fecha": "2026-05-17",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasajes",
    "monto": 6,
    "presupuesto": 6
  },
  {
    "fecha": "2026-05-17",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pop Corn",
    "monto": 2,
    "presupuesto": 2
  },
  {
    "fecha": "2026-05-17",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Doña Pepa",
    "monto": 4.5,
    "presupuesto": 4.5
  },
  {
    "fecha": "2026-05-17",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pepsi Jumbo",
    "monto": 3.2,
    "presupuesto": 3.2
  },
  {
    "fecha": "2026-05-17",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Emoliente y agua",
    "monto": 3,
    "presupuesto": 3
  },
  {
    "fecha": "2026-05-18",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Marciano y pasajes con Aleshka",
    "monto": 7,
    "presupuesto": 7
  },
  {
    "fecha": "2026-05-18",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "snacks para niñas Reniec",
    "monto": 17.5,
    "presupuesto": 17.5
  },
  {
    "fecha": "2026-05-18",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Jugo con niñas",
    "monto": 29,
    "presupuesto": 29
  },
  {
    "fecha": "2026-05-18",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "2 zukos + 2 churros",
    "monto": 6.4,
    "presupuesto": 6.4
  },
  {
    "fecha": "2026-05-19",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "par de pilas",
    "monto": 2,
    "presupuesto": 2
  },
  {
    "fecha": "2026-05-19",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Internet 2 meses",
    "monto": 102.5,
    "presupuesto": 102.5
  },
  {
    "fecha": "2026-05-20",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Par de medias + lapiceros",
    "monto": 6.6,
    "presupuesto": 6.6
  },
  {
    "fecha": "2026-05-20",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pastillas + agua",
    "monto": 4.8,
    "presupuesto": 4.8
  },
  {
    "fecha": "2026-05-20",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Pasaje de Lima a Arequipa",
    "monto": 80,
    "presupuesto": 80
  },
  {
    "fecha": "2026-05-20",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gaseosa y dulce",
    "monto": 7.5,
    "presupuesto": 7.5
  },
  {
    "fecha": "2026-05-23",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Candado",
    "monto": 6,
    "presupuesto": 6
  },
  {
    "fecha": "2026-05-23",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Libre Enjuague Downy",
    "monto": 7,
    "presupuesto": 7
  },
  {
    "fecha": "2026-05-24",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Google AI Pro giovanni.oliveirap7@gmail.com",
    "monto": 35,
    "presupuesto": 35
  },
  {
    "fecha": "2026-05-26",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Recarga Guillermo hacia mi",
    "monto": 5,
    "presupuesto": 5
  },
  {
    "fecha": "2026-05-26",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Agua",
    "monto": 2.6,
    "presupuesto": 2.6
  },
  {
    "fecha": "2026-05-26",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasajes",
    "monto": 6,
    "presupuesto": 6
  },
  {
    "fecha": "2026-05-28",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Powerade",
    "monto": 3.7,
    "presupuesto": 3.7
  },
  {
    "fecha": "2026-05-29",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gaseosa fanta kola inglesa",
    "monto": 3,
    "presupuesto": 3
  },
  {
    "fecha": "2026-05-30",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Gaseosa y galleta",
    "monto": 2.87,
    "presupuesto": 2.87
  },
  {
    "fecha": "2026-05-31",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Axe Ice Chill",
    "monto": 13.5,
    "presupuesto": 13.5
  },
  {
    "fecha": "2026-06-04",
    "tipo": "Egreso",
    "categoria": "Servicios",
    "concepto": "Pago Internet Junio",
    "monto": 20,
    "presupuesto": 20
  },
  {
    "fecha": "2026-06-03",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasaje a Tacna",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-06-15",
    "tipo": "Egreso",
    "categoria": "Inversión",
    "concepto": "Cibertec",
    "monto": 644,
    "presupuesto": 644
  },
  {
    "fecha": "2026-06-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Desayuno",
    "monto": 8,
    "presupuesto": 8
  },
  {
    "fecha": "2026-06-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Almuerzo",
    "monto": 50,
    "presupuesto": 50
  },
  {
    "fecha": "2026-06-28",
    "tipo": "Egreso",
    "categoria": "Gastos necesarios",
    "concepto": "Cena",
    "monto": 34,
    "presupuesto": 34
  },
  {
    "fecha": "2026-06-28",
    "tipo": "Egreso",
    "categoria": "Emergencia",
    "concepto": "Presté a Jorge 500",
    "monto": 500,
    "presupuesto": 500
  },
  {
    "fecha": "2026-06-06",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Cena con Walter y tío Candido",
    "monto": 61,
    "presupuesto": 61
  },
  {
    "fecha": "2026-06-06",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Café Ganoderma",
    "monto": 11,
    "presupuesto": 11
  },
  {
    "fecha": "2026-06-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Audífonos para Angeles",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-06-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Cable USB",
    "monto": 5,
    "presupuesto": 5
  },
  {
    "fecha": "2026-06-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Reloj para niñas",
    "monto": 15,
    "presupuesto": 15
  },
  {
    "fecha": "2026-06-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Zapatillas Nike GoFlyEase",
    "monto": 80,
    "presupuesto": 80
  },
  {
    "fecha": "2026-06-07",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasajes taxi en Tacna",
    "monto": 9,
    "presupuesto": 9
  },
  {
    "fecha": "2026-06-08",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Mochila negra preferida",
    "monto": 48,
    "presupuesto": 48
  },
  {
    "fecha": "2026-06-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "GASTOS FUTUROS: TACNA",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-06-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "TACNA A ARICA IDA Y VUELTA C/FOOD",
    "monto": 50,
    "presupuesto": 50
  },
  {
    "fecha": "2026-06-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "TACNA A AREQUIPA IDA Y VUELTA",
    "monto": 25,
    "presupuesto": 25
  },
  {
    "fecha": "2026-06-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "TACNA A PUNO",
    "monto": 30,
    "presupuesto": 30
  },
  {
    "fecha": "2026-06-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Salida en Puno",
    "monto": 70,
    "presupuesto": 70
  },
  {
    "fecha": "2026-06-12",
    "tipo": "Egreso",
    "categoria": "Gastos sin culpa",
    "concepto": "Pasaje a Arequipa",
    "monto": 50,
    "presupuesto": 50
  }
];

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
  await db.runAsync('DELETE FROM activos_inversion WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);

  // Map to store sum of budgets per month-category
  const presupuestos: Record<string, number> = {};
  const inversiones: Record<string, number> = {};

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
        const key = `${mes}_${cat_egreso_id}`;
        if (!presupuestos[key]) presupuestos[key] = 0;
        presupuestos[key] += monto_presupuestado;
        
        if (item.categoria === 'Inversión') {
          if (!inversiones[item.concepto]) inversiones[item.concepto] = 0;
          inversiones[item.concepto] += monto_real;
        }
      }

      await db.runAsync(
        `INSERT INTO transacciones (
          id_local, espacio_id, fecha, tipo, categoria_ingreso_id, categoria_egreso_id, 
          monto_real, monto_presupuestado, nota, estado_sync, fecha_modificacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
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
        `INSERT INTO presupuesto_categoria (
          id_local, espacio_id, mes, categoria_egreso_id, 
          porcentaje_asignado, monto_asignado, estado_sync, fecha_modificacion
        ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
        [
          Crypto.randomUUID(), DEFAULT_ESPACIO_ID, mes, catId,
          0, Math.max(0, monto), ts
        ]
      );
    }

    // Insertar las inversiones sumadas
    for (const [concepto, monto] of Object.entries(inversiones)) {
      if (monto <= 0) continue; // No insertar inversiones con saldo negativo
      await db.runAsync(
        `INSERT INTO activos_inversion (
          id_local, espacio_id, nombre, monto_invertido, nota,
          estado_sync, fecha_modificacion, eliminado
        ) VALUES (?, ?, ?, ?, NULL, 'pendiente', ?, 0)`,
        [Crypto.randomUUID(), DEFAULT_ESPACIO_ID, concepto, monto, ts]
      );
    }
  });

  console.log('Importación terminada con éxito!');
}
