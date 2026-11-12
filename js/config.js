/* =====================================================================
   PrevenCraft · CONFIGURACIÓN
   ---------------------------------------------------------------------
   Parámetros que el profesorado puede cambiar sin tocar el motor.
   Cambia solo los valores (lo que hay detrás de los dos puntos).
   ===================================================================== */
const CONFIG = {

  /* ENVÍO AUTOMÁTICO DEL INFORME
     URL del flujo de Power Automate («Cuando se recibe una solicitud HTTP»)
     o de un Google Apps Script publicado como aplicación web.
     Déjalo vacío ('') para no enviar nada: el alumnado solo descarga el PDF.
     ATENCIÓN: el repositorio es público, así que esta URL será visible.
     Instrucciones paso a paso en README.md. */
  RESULTS_ENDPOINT: '',

  /* CÓDIGO DE VERIFICACIÓN
     «Sal» secreta con la que se calcula el código del informe.
     Si la cambias, los informes generados antes dejarán de verificarse.
     Como el código es público, es un elemento disuasorio, no criptografía. */
  SALT: 'PRL-UT3-Calbo-26',

  /* INSIGNIAS POR ZONA
     min   = porcentaje mínimo de puntos de la zona para conseguirla
     value = puntos que suma a la nota final (1-10)
     Con 5 zonas, 5 insignias de Oro dan la nota máxima (5 × 2 = 10). */
  BADGES: {
    gold:   { min: 90, value: 2   },   // Or
    silver: { min: 75, value: 1.5 },   // Plata
    bronze: { min: 50, value: 1   },   // Bronze
  },

  /* PENALIZACIÓN que se resta a la nota por cada baja laboral. */
  PENALTY_PER_BAIXA: 0.5,

  /* NÚMERO DE SITUACIONES de la evaluación final (zona 5).
     Se eligen al azar de la lista EVAL de js/content.js. */
  EVAL_N: 4,
};
