# PrevenCraft · PRL

Juego educativo 3D de bloques sobre la **UT3 «Factors de risc i la seva prevenció»** (Prevención de Riesgos Laborales, FP).
El alumnado recorre un astillero escuela, detecta los peligros de cada factor de riesgo, elige la medida preventiva,
señaliza la zona, abre el cofre de conocimiento y, al final, evalúa riesgos con la matriz del INSST.
Cada zona da una insignia y las insignias forman la nota (1-10). El juego está en catalán.

- **Jugar:** abre la URL de GitHub Pages del repositorio (no hace falta instalar nada; funciona en ordenador, tableta y móvil).
- **Informe:** al terminar, el alumno descarga un PDF con su nota y un **código de verificación**.
- **Verificar:** en la pantalla de inicio, «Professorat: verificar un informe» comprueba que el código coincide con el nombre y la nota.

---

## Estructura

```
index.html            Solo el HTML (pantallas, HUD, ventanas)
css/styles.css        Todo el aspecto visual
js/config.js          Parámetros que puedes cambiar (envío, insignias, nota…)
js/content.js         TODO el contenido didáctico: zonas, peligros, señales, cofres, evaluación final
js/game.js            Motor del juego (mundo 3D, personaje, cámara, HUD, informe, PDF). No hace falta tocarlo
lib/three.min.js      Three.js r128 (copia local)
lib/jspdf.umd.min.js  jsPDF 2.5.1 (copia local)
.nojekyll             Indica a GitHub Pages que sirva los archivos tal cual
```

Las librerías están copiadas en `lib/` para que el juego funcione aunque la red del instituto bloquee los CDN.
Lo único externo son las fuentes de Google Fonts: si están bloqueadas, el juego usa las fuentes del sistema y funciona igual.

---

## Editar el contenido (sin saber programar)

Todo el texto está en **`js/content.js`**, con comentarios que explican cada campo. Lo más habitual:

| Quiero… | Dónde |
|---|---|
| Cambiar el texto de un peligro, sus opciones o el feedback | `HZ` → `sit`, `danys`, `opts` (`t` = opción, `q` = `'best'`/`'ok'`/`'bad'`, `fb` = feedback) |
| Cambiar la señal correcta de un peligro | `HZ` → `sign.ok` y `sign.opts` (identificadores del catálogo `SIGNS`) |
| Añadir o cambiar preguntas de los cofres | `QUIZ` → zona 1-4. **La primera respuesta es siempre la correcta** (el juego las baraja) |
| Añadir situaciones a la evaluación final | `EVAL` (`ok` debe ser uno de `LEVELS`) |
| Añadir un peligro nuevo | Copia un bloque `{id:…}` de `HZ`, cambia el `id`, los textos y la posición `at` (ver comentario en el archivo). Aparecerá un bidón señalizado |

Reglas de oro: cambia solo lo que está entre comillas; si un texto lleva apóstrofo (`l'empresa`) usa comillas dobles `"…"`;
respeta comas, corchetes y llaves. Si después de un cambio el juego se queda en blanco, abre la consola del navegador (F12):
indica la línea con el error.

### Parámetros (`js/config.js`)

| Parámetro | Por defecto | Qué hace |
|---|---|---|
| `RESULTS_ENDPOINT` | `''` | URL donde se envía cada informe (Power Automate o Google Apps Script). Vacío = no se envía |
| `SALT` | `'PRL-UT3-Calbo-26'` | Base del código de verificación. Si la cambias, los informes anteriores dejan de verificarse |
| `BADGES` | Oro 90 % = 2 · Plata 75 % = 1,5 · Bronce 50 % = 1 | Umbrales y valor de cada insignia |
| `PENALTY_PER_BAIXA` | `0.5` | Lo que resta cada baja laboral |
| `EVAL_N` | `4` | Situaciones de la evaluación final (se eligen al azar de `EVAL`) |

Los textos de ayuda del juego y del PDF se actualizan solos con estos valores.

---

## Actualizar el juego publicado

1. Edita `js/content.js` (o `js/config.js`) y guarda.
2. Pruébalo en local (opcional pero recomendable): `python3 -m http.server 8000` y abre <http://localhost:8000>.
3. Sube los cambios desde la carpeta del proyecto:
   ```bash
   git add -A
   git commit -m "Actualiza preguntas de la zona 2"
   git push
   ```
4. En 1-2 minutos GitHub Pages publica la nueva versión en la misma URL. Si el alumnado ve la versión antigua,
   que recargue la página (Ctrl+F5 / Cmd+Shift+R).

---

## Recibir los informes por correo con Power Automate

Al terminar la partida, si `RESULTS_ENDPOINT` no está vacío, el juego envía por **POST** un JSON con el informe
(`G.report`) y el **PDF en base64** (`pdfBase64`). Si el envío falla, el alumno ve un aviso y conserva el botón de descarga del PDF.

> ⚠️ **Licencia:** el desencadenador «Cuando se recibe una solicitud HTTP» es un conector **Premium** de Power Automate.
> Comprueba si tu cuenta educativa lo incluye; si no, usa la alternativa gratuita de Google Apps Script (más abajo).
>
> ⚠️ **URL pública:** el repositorio es público, así que la URL del flujo será visible en `js/config.js`.
> Cualquiera que la copie podría enviarte informes falsos. Por eso cada informe lleva el **código de verificación**:
> compruébalo con el verificador antes de poner la nota. Si la URL se usa de forma abusiva, regenérala en el flujo
> (o crea uno nuevo) y actualiza `config.js`.

### Paso 1 · Crear el flujo

1. Entra en <https://make.powerautomate.com> con tu cuenta del centro → **Crear** → **Flujo de nube instantáneo** → **Omitir**.
2. Añade el desencadenador **«Cuando se recibe una solicitud HTTP»** (*When an HTTP request is received*).
   - **Quién puede desencadenar el flujo:** *Cualquiera* (el alumnado no inicia sesión).
   - **Método:** `POST` (en «Mostrar opciones avanzadas»).
   - **Esquema JSON del cuerpo de la solicitud:** pega este esquema:

<details>
<summary>Esquema JSON (generado a partir de <code>G.report</code>)</summary>

```json
{
  "type": "object",
  "properties": {
    "name":     { "type": "string",  "description": "Nombre del alumno" },
    "date":     { "type": "string",  "description": "AAAAMMDD" },
    "dateTxt":  { "type": "string",  "description": "dd/mm/aaaa" },
    "timeTxt":  { "type": "string",  "description": "hh:mm" },
    "secs":     { "type": "integer", "description": "Duración en segundos" },
    "attempt":  { "type": "integer", "description": "Intento nº en ese navegador" },
    "score":    { "type": "integer" },
    "max":      { "type": "integer" },
    "nota":     { "type": "number",  "description": "Nota 1-10" },
    "sum":      { "type": "number",  "description": "Suma de insignias" },
    "pen":      { "type": "number",  "description": "Penalización por bajas" },
    "baixes":   { "type": "integer" },
    "optimal":  { "type": "integer", "description": "Medidas óptimas al primer intento" },
    "zones": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name":  { "type": "string" },
          "pts":   { "type": "integer" },
          "max":   { "type": "integer" },
          "pct":   { "type": "integer" },
          "badge": { "type": "string" },
          "value": { "type": "number" }
        }
      }
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "item":   { "type": "string" },
          "type":   { "type": "string", "description": "ok = mejorable, bad = error" },
          "choice": { "type": "string" },
          "fb":     { "type": "string" }
        }
      }
    },
    "code":      { "type": "string", "description": "Código de verificación" },
    "pdfName":   { "type": "string" },
    "pdfBase64": { "type": "string", "description": "PDF del informe en base64" }
  }
}
```

</details>

3. **Nuevo paso → «Crear tabla HTML»** (Operaciones de datos), para la tabla de zonas:
   - **Desde:** expresión `triggerBody()?['zones']`
   - **Columnas:** *Personalizado*, con estas filas (encabezado → valor, cada valor como expresión):
     - `Zona` → `item()?['name']`
     - `Punts` → `concat(item()?['pts'], '/', item()?['max'])`
     - `%` → `concat(item()?['pct'], ' %')`
     - `Insígnia` → `item()?['badge']`
4. **Nuevo paso → «Enviar un correo electrónico (V2)»** (Office 365 Outlook):
   - **Para:** tu dirección de correo.
   - **Asunto:** expresión
     `concat('PrevenCraft · ', triggerBody()?['name'], ' · nota ', formatNumber(triggerBody()?['nota'], '0.0', 'ca-ES'))`
     → por ejemplo «PrevenCraft · Marta Puig · nota 7,5».
   - **Cuerpo:** por ejemplo
     «Alumno: *name* · Fecha: *dateTxt* *timeTxt* · Intento: *attempt* · Puntos: *score*/*max* · Bajas: *baixes* · Código: *code*»
     (inserta cada campo desde el contenido dinámico) y, debajo, la **Salida** del paso «Crear tabla HTML».
   - **Datos adjuntos** (Mostrar opciones avanzadas → Agregar elemento):
     - **Nombre:** expresión `triggerBody()?['pdfName']`
     - **Contenido:** expresión `base64ToBinary(triggerBody()?['pdfBase64'])`
5. **Guarda** el flujo. Vuelve a abrir el desencadenador: ahora muestra la **URL HTTP POST**. Cópiala.

### Paso 2 · Conectar el juego

En `js/config.js`:

```js
RESULTS_ENDPOINT: 'https://…la-url-copiada…',
```

Sube el cambio (`git add -A`, `git commit -m "Activa envío de informes"`, `git push`). Haz una partida de prueba
y comprueba en el **historial de ejecuciones** del flujo que llega bien.

---

## Alternativa gratuita · Google Apps Script

Si no tienes Power Automate Premium, una cuenta de Google puede hacer lo mismo: enviarte el correo con el PDF y
guardar una fila por partida en una Hoja de cálculo. (Documentado como alternativa; no está activado.)

1. Crea una **Hoja de cálculo** de Google y copia su ID (la parte de la URL entre `/d/` y `/edit`).
2. En la hoja: **Extensiones → Apps Script**, borra lo que haya y pega:

```js
const SHEET_ID = 'PEGA_AQUI_EL_ID_DE_LA_HOJA';
const TO = 'tu-correo@ejemplo.com';

function doPost(e) {
  const r = JSON.parse(e.postData.contents);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const nota = String(r.nota).replace('.', ',');

  // 1) Una fila por partida en la hoja
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Recibido', 'Nombre', 'Fecha', 'Intento', 'Puntos', 'Máx.', 'Nota', 'Bajas',
                  ...r.zones.map(z => z.name), 'Código']);
  }
  sh.appendRow([new Date(), r.name, r.dateTxt + ' ' + r.timeTxt, r.attempt, r.score, r.max, r.nota, r.baixes,
                ...r.zones.map(z => z.pct + '% ' + z.badge), r.code]);

  // 2) Correo con la tabla de zonas y el PDF adjunto
  const rows = r.zones.map(z => `<tr><td>${esc(z.name)}</td><td>${z.pts}/${z.max}</td><td>${z.pct} %</td><td>${esc(z.badge)}</td></tr>`).join('');
  const attachments = r.pdfBase64
    ? [Utilities.newBlob(Utilities.base64Decode(r.pdfBase64), 'application/pdf', r.pdfName)]
    : [];
  MailApp.sendEmail({
    to: TO,
    subject: `PrevenCraft · ${r.name} · nota ${nota}`,
    htmlBody: `<p><b>${esc(r.name)}</b> · ${r.dateTxt} ${r.timeTxt} · intento ${r.attempt}<br>
               Puntos: ${r.score}/${r.max} · Bajas: ${r.baixes} · <b>Nota: ${nota}</b><br>Código: ${esc(r.code)}</p>
               <table border="1" cellpadding="4" style="border-collapse:collapse">
               <tr><th>Zona</th><th>Punts</th><th>%</th><th>Insígnia</th></tr>${rows}</table>`,
    attachments
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
```

3. **Implementar → Nueva implementación → Aplicación web**: *Ejecutar como:* **Yo**; *Quién tiene acceso:* **Cualquier usuario**.
   Autoriza los permisos (hoja y correo) y copia la URL que acaba en `/exec`.
4. Pégala en `RESULTS_ENDPOINT` de `js/config.js`. El juego detecta que es Apps Script y envía el JSON como `text/plain`
   (Apps Script no admite la comprobación CORS previa que provoca `application/json`).

Límites: una cuenta gratuita de Gmail puede enviar unos 100 correos al día con `MailApp` (las cuentas de Google Workspace, más).
Las mismas advertencias de URL pública y código de verificación se aplican aquí.

---

## Notas técnicas

- Three.js r128 y jsPDF 2.5.1, sin herramientas de compilación: son archivos estáticos.
- El progreso no se guarda: recargar la página reinicia la partida. El número de intento se cuenta por navegador (`localStorage`).
- El código de verificación es un elemento disuasorio, no criptografía: la «sal» está en el código público.
- Respecto a la versión original de un solo archivo, se ha corregido que en móvil el informe final no cabía en la pantalla
  (ahora se desplaza dentro de la tarjeta y el botón del PDF siempre es accesible).
