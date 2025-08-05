// Variables globales para almacenar los datos JSON cargados desde modales o archivos
// Estas son las fuentes de verdad para los datos al generar el documento
window.sessionData = null;
window.classData = null;

// --- Estado unificado de datos cargados ---
window.estadoDatos = {
    sesion: { cargado: false, nombreArchivo: null, origen: null },
    clase: { cargado: false, nombreArchivo: null, origen: null },
    plantilla: { cargado: false, nombreArchivo: null, origen: null }
};

// --- DOM Elements ---
const sessionJsonModal = document.getElementById('session-json-modal');
const classJsonModal = document.getElementById('class-json-modal');
const sessionJsonFilename = document.getElementById('session-json-filename');
const sessionJsonTextarea = document.getElementById('session-json-textarea');
const classJsonTextarea = document.getElementById('class-json-textarea');
const sessionJsonValidationMessage = document.getElementById('session-json-validation-message');
const classJsonValidationMessage = document.getElementById('class-json-validation-message');
const templateFileInfo = document.getElementById('template-file-info');
const sessionJsonFileInfo = document.getElementById('session-json-file-info');
const classJsonFileInfo = document.getElementById('class-json-file-info');
const pasteSessionBtn = document.getElementById('paste-session-btn');
const pasteClassBtn = document.getElementById('paste-class-btn');
const templateFile = document.getElementById('template-file');
const sessionJsonFile = document.getElementById('session-json-file');
const classJsonFile = document.getElementById('class-json-file');
const statusMessage = document.getElementById('status-message');
const generationForm = document.getElementById('generation-form');
const actionLog = document.getElementById('action-log');

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function () {
    console.log("[INIT] Script de frontend cargado y DOM listo.");

    // Cargar archivo de plantilla
    templateFile.addEventListener('change', function () {
        const file = this.files[0];
        updateFileInfo(templateFileInfo, file);
        updateActionLog(`Plantilla cargada: ${file ? file.name : 'Ninguna'}`);
        
        // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
        if (file) {
            window.estadoDatos.plantilla.cargado = true;
            window.estadoDatos.plantilla.nombreArchivo = file.name;
            window.estadoDatos.plantilla.origen = 'archivo';
        } else {
            window.estadoDatos.plantilla.cargado = false;
            window.estadoDatos.plantilla.nombreArchivo = null;
            window.estadoDatos.plantilla.origen = null;
        }
        actualizarEstadoGeneral();
    });

    // Cargar JSON de sesión desde archivo
    sessionJsonFile.addEventListener('change', function () {
        const file = this.files[0];
        updateFileInfo(sessionJsonFileInfo, file); // Actualiza visualmente el campo
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    window.sessionData = data; // Guardar en variable global
                    setSessionJsonText(data); // Actualizar campo oculto del formulario
                    updateActionLog(`JSON de Sesión cargado desde archivo: ${file.name}`);
                    updateProposedFilename();
                    
                    // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
                    window.estadoDatos.sesion.cargado = true;
                    window.estadoDatos.sesion.nombreArchivo = file.name;
                    window.estadoDatos.sesion.origen = 'archivo';
                    actualizarEstadoGeneral();
                } catch (error) {
                    console.error('[ERROR] Leer JSON sesión:', error);
                    alert('Error al leer el archivo JSON de sesión.');
                    sessionJsonFile.value = '';
                    updateFileInfo(sessionJsonFileInfo, null); // Limpiar visualmente
                    
                    // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
                    window.estadoDatos.sesion.cargado = false;
                    window.estadoDatos.sesion.nombreArchivo = null;
                    window.estadoDatos.sesion.origen = null;
                    actualizarEstadoGeneral();
                }
            };
            reader.readAsText(file);
        } else {
             // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
            window.estadoDatos.sesion.cargado = false;
            window.estadoDatos.sesion.nombreArchivo = null;
            window.estadoDatos.sesion.origen = null;
            actualizarEstadoGeneral();
        }
    });

    // Cargar JSON de clase desde archivo
    classJsonFile.addEventListener('change', function () {
        const file = this.files[0];
        updateFileInfo(classJsonFileInfo, file); // Actualiza visualmente el campo
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    window.classData = data; // Guardar en variable global
                    setClassJsonText(data); // Actualizar campo oculto del formulario
                    updateActionLog(`JSON de Clase cargado desde archivo: ${file.name}`);
                    
                    // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
                    window.estadoDatos.clase.cargado = true;
                    window.estadoDatos.clase.nombreArchivo = file.name;
                    window.estadoDatos.clase.origen = 'archivo';
                    actualizarEstadoGeneral();
                } catch (error) {
                    console.error('[ERROR] Leer JSON clase:', error);
                    alert('Error al leer el archivo JSON de clase.');
                    classJsonFile.value = '';
                    updateFileInfo(classJsonFileInfo, null); // Limpiar visualmente
                    
                    // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
                    window.estadoDatos.clase.cargado = false;
                    window.estadoDatos.clase.nombreArchivo = null;
                    window.estadoDatos.clase.origen = null;
                    actualizarEstadoGeneral();
                }
            };
            reader.readAsText(file);
        } else {
            // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
            window.estadoDatos.clase.cargado = false;
            window.estadoDatos.clase.nombreArchivo = null;
            window.estadoDatos.clase.origen = null;
            actualizarEstadoGeneral();
        }
    });

    // Abrir modales
    pasteSessionBtn.addEventListener('click', () => {
        sessionJsonTextarea.value = window.sessionData ? JSON.stringify(window.sessionData, null, 2) : '';
        openSessionJsonModal();
        updateActionLog('Modal de sesión abierto');
    });

    pasteClassBtn.addEventListener('click', () => {
        classJsonTextarea.value = window.classData ? JSON.stringify(window.classData, null, 2) : '';
        openClassJsonModal();
        updateActionLog('Modal de clase abierto');
    });

    // Cerrar modales al hacer clic en la 'x' o fuera del modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeSessionJsonModal();
            closeClassJsonModal();
        });
    });
    window.addEventListener('click', (event) => {
        if (event.target === sessionJsonModal) closeSessionJsonModal();
        if (event.target === classJsonModal) closeClassJsonModal();
    });

    // Verificar JSON de sesión
    document.getElementById('verify-session-json-btn')?.addEventListener('click', () => {
        try {
            const jsonText = sessionJsonTextarea.value.trim();
            if (!jsonText) throw new Error('No hay contenido JSON');
            const json = JSON.parse(jsonText);
            if (!json.nombreproyecto) throw new Error('Falta nombreproyecto');
            window.sessionData = json; // Guardar en variable global
            const cleanName = json.nombreproyecto.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
            sessionJsonFilename.value = `sesion_${cleanName}`;
            updateActionLog('JSON de sesión verificado y nombre generado');
            updateProposedFilename();
        } catch (e) {
            alert('JSON de sesión inválido: ' + e.message);
        }
    });

    // Guardar JSON de sesión (actualizado para usar File System Access API)
    document.getElementById('save-session-json-btn')?.addEventListener('click', async () => {
        const jsonText = sessionJsonTextarea.value.trim();
        let filename = 'sesion_proyecto.json';
        const filenameInput = sessionJsonFilename.value.trim();
        if (filenameInput) {
            filename = `${filenameInput}.json`;
        } else {
            try {
                const parsed = JSON.parse(jsonText);
                if (parsed.nombreproyecto) {
                    const cleanName = parsed.nombreproyecto.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                    filename = `sesion_${cleanName}.json`;
                }
            } catch (e) { /* Ignorar error de parseo para nombre por defecto */ }
        }
        if (jsonText) {
            // --- Intentar usar File System Access API (Chrome/Edge moderno) ---
            if ('showSaveFilePicker' in window) {
                try {
                    updateActionLog('Intentando usar selector de archivos del sistema...');
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'Archivos JSON',
                            accept: {'application/json': ['.json']}
                        }]
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(jsonText);
                    await writable.close();
                    
                    updateActionLog(`JSON guardado como ${handle.name} usando selector del sistema.`);
                    return; // Salir si se usó la API moderna
                } catch (err) {
                    if (err.name === 'AbortError') {
                        updateActionLog('Guardado cancelado por el usuario en el selector del sistema.');
                        return;
                    } else {
                        console.warn('API File System Access no disponible o falló, usando método alternativo:', err);
                        updateActionLog('Selector del sistema no disponible, usando método de descarga estándar...');
                        // Continuar con el método alternativo si la API falla por otros motivos
                    }
                }
            }

            // --- Método alternativo para navegadores que no soportan File System API ---
            updateActionLog('Preparando descarga estándar...');
            const blob = new Blob([jsonText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateActionLog(`JSON guardado como ${filename} (método estándar).`);
        } else {
            alert('No hay contenido JSON para guardar.');
        }
    });

    // Actualizar nombre del archivo al cambiar fecha
    document.getElementById('start-date')?.addEventListener('change', function() {
        updateProposedFilename();
        actualizarEstadoGeneral(); // <-- También actualizar el estado general al cambiar la fecha
    });

    // Inicializar
    updateProposedFilename();
    actualizarEstadoGeneral(); // Inicializar estado al cargar

    // Enviar formulario
    generationForm.addEventListener('submit', generateDocument);
});

// --- Funciones auxiliares ---

// SECCION_INICIO: funcion_update_file_info_mejorada
function updateFileInfo(infoElement, file, customMessage = null) {
    // Esta función actualiza el texto que indica el estado del input de archivo
    if (infoElement) {
        if (file) {
            // Si hay un archivo real (de input file)
            infoElement.textContent = `Archivo seleccionado: ${file.name}`;
            infoElement.style.display = 'block';
        } else if (customMessage) {
            // Si no hay archivo pero se proporciona un mensaje personalizado (desde modal, estado)
            infoElement.textContent = customMessage;
            infoElement.style.display = 'block'; // Mostrar el mensaje
        } else {
            // Caso por defecto: no hay archivo ni mensaje personalizado
            infoElement.textContent = 'Ningún archivo seleccionado';
            infoElement.style.display = 'block'; // Cambio clave: siempre mostrar el estado
        }
    }
}
// SECCION_FIN: funcion_update_file_info_mejorada

function updateProposedFilename() {
    const startDate = document.getElementById('start-date')?.value;
    const proposedFilename = document.getElementById('proposed-filename');
    if (window.sessionData && window.sessionData.nombreproyecto && startDate) {
        const cleanName = window.sessionData.nombreproyecto.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
        const period = formatPeriod(startDate);
        const filename = `sesion ${cleanName} ${period}.docx`;
        proposedFilename.textContent = filename;
        updateActionLog(`Nombre propuesto: ${filename}`);
    } else if (!startDate) {
        updateActionLog('Esperando fecha para calcular el periodo');
    } else {
        proposedFilename.textContent = 'Nombre no disponible';
        updateActionLog('Nombre propuesto: no disponible (falta JSON o fecha)');
    }
}

function formatPeriod(startDateStr) {
    try {
        const startDate = new Date(startDateStr + 'T00:00:00');
        if (isNaN(startDate.getTime())) throw new Error('Fecha inválida');
        const daysUntilFriday = (4 - startDate.getDay() + 7) % 7 || 7;
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + daysUntilFriday);
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril',
            'Mayo', 'Junio', 'Julio', 'Agosto',
            'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `Del ${startDate.getDate()} al ${endDate.getDate()} de ${months[endDate.getMonth()]}`;
    } catch (e) {
        console.error('[ERROR] formatPeriod:', e);
        return 'Periodo no disponible';
    }
}

// SECCION_INICIO: manejo_estado_datos_unificado
function actualizarEstadoGeneral() {
    console.log("[ESTADO] Actualizando estado general de datos cargados.");
    const startDate = document.getElementById('start-date')?.value;

    // --- Evaluación del estado de Sesión ---
    const sesionInfoElement = document.getElementById('session-json-file-info');
    if (window.estadoDatos.sesion.cargado) {
        const nombreMostrado = window.estadoDatos.sesion.nombreArchivo || 'Datos de sesión cargados';
        const origen = window.estadoDatos.sesion.origen;
        let mensaje = `Archivo cargado: ${nombreMostrado}`;
        if (origen === 'modal') {
            mensaje += " (desde modal)";
        }
        updateFileInfo(sesionInfoElement, null, mensaje);
    } else {
        updateFileInfo(sesionInfoElement, null, 'Ningún archivo de sesión seleccionado');
    }

    // --- Evaluación del estado de Clase ---
    const claseInfoElement = document.getElementById('class-json-file-info');
    if (window.estadoDatos.clase.cargado) {
        const nombreMostrado = window.estadoDatos.clase.nombreArchivo || 'Datos de clase cargados';
        const origen = window.estadoDatos.clase.origen;
        let mensaje = `Archivo cargado: ${nombreMostrado}`;
        if (origen === 'modal') {
            mensaje += " (desde modal)";
        }
        updateFileInfo(claseInfoElement, null, mensaje);
    } else {
        updateFileInfo(claseInfoElement, null, 'Ningún archivo de clase seleccionado');
    }

    // --- Evaluación del estado de Plantilla ---
    const plantillaInfoElement = document.getElementById('template-file-info');
    if (window.estadoDatos.plantilla.cargado) {
        const nombreMostrado = window.estadoDatos.plantilla.nombreArchivo || 'Plantilla cargada';
        // Origen para plantilla solo puede ser 'archivo'
        updateFileInfo(plantillaInfoElement, null, `Archivo cargado: ${nombreMostrado}`);
    } else {
        updateFileInfo(plantillaInfoElement, null, 'Ningún archivo de plantilla seleccionado');
    }

    // --- Evaluación y actualización del nombre propuesto / campos faltantes ---
    const faltantes = [];
    if (!window.estadoDatos.plantilla.cargado) faltantes.push("plantilla");
    if (!window.estadoDatos.sesion.cargado) faltantes.push("sesión");
    if (!window.estadoDatos.clase.cargado) faltantes.push("clase");
    if (!startDate) faltantes.push("fecha");

    if (faltantes.length > 0) {
        const mensajeFaltantes = `Datos faltantes: ${faltantes.join(', ')}.`;
        updateActionLog(mensajeFaltantes);
        // Aquí podrías mostrar el mensaje en otro lugar de la UI si lo deseas
        // Por ejemplo: document.getElementById('mensaje-datos-faltantes').textContent = mensajeFaltantes;
    } else {
        // Todos los datos están cargados, se puede proponer nombre
        if (window.sessionData && window.sessionData.nombreproyecto) {
             updateProposedFilename(); // Esta función ya existe y maneja la lógica
        }
    }
}
// SECCION_FIN: manejo_estado_datos_unificado

function updateActionLog(message) {
    console.log(`[LOG] ${message}`);
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    actionLog.appendChild(li);
    actionLog.scrollTop = actionLog.scrollHeight;
}

// --- Funciones para sincronizar datos JSON con campos ocultos del formulario ---
// Estas funciones son clave para pasar los datos del JS al backend al enviar el formulario
function setSessionJsonText(data) {
    console.log("[FUNC] setSessionJsonText llamada.");
    const sessionJsonTextInput = document.getElementById('session-json-text');
    if (sessionJsonTextInput) {
        sessionJsonTextInput.value = JSON.stringify(data);
        console.log("[FUNC] Campo 'session-json-text' actualizado.");
    } else {
        console.error("[ERROR] Campo 'session-json-text' no encontrado al intentar actualizar.");
    }
}

function setClassJsonText(data) {
    console.log("[FUNC] setClassJsonText llamada.");
    const classJsonTextInput = document.getElementById('class-json-text');
    if (classJsonTextInput) {
        classJsonTextInput.value = JSON.stringify(data);
        console.log("[FUNC] Campo 'class-json-text' actualizado.");
    } else {
        console.error("[ERROR] Campo 'class-json-text' no encontrado al intentar actualizar.");
    }
}

// --- Funciones para abrir y cerrar modales ---
function openSessionJsonModal() {
    const modal = document.getElementById('session-json-modal');
    if (modal) {
        modal.style.display = 'block';
        updateActionLog('Modal de sesión abierto');
    }
}

function closeSessionJsonModal() {
    const modal = document.getElementById('session-json-modal');
    if (modal) {
        modal.style.display = 'none';
        updateActionLog('Modal de sesión cerrado');
    }
}

function openClassJsonModal() {
    const modal = document.getElementById('class-json-modal');
    if (modal) {
        modal.style.display = 'block';
        updateActionLog('Modal de clase abierto');
    }
}

function closeClassJsonModal() {
    const modal = document.getElementById('class-json-modal');
    if (modal) {
        modal.style.display = 'none';
        updateActionLog('Modal de clase cerrado');
    }
}

// --- Funciones de carga desde modales ---
// Estas funciones son las que se llaman al hacer clic en "Cargar" en los modales
function handleSessionJsonLoad() {
    console.log("[FUNC] handleSessionJsonLoad iniciada.");
    const jsonText = sessionJsonTextarea.value.trim();
    if (!jsonText) {
        alert('Por favor, pegue el contenido JSON antes de cargar.');
        return;
    }
    try {
        const parsedData = JSON.parse(jsonText);
        if (!parsedData.nombreproyecto) {
            throw new Error('El JSON no contiene el campo "nombreproyecto".');
        }
        const projectName = parsedData.nombreproyecto;
        // 1. Guardar datos en la variable global (fuente de verdad)
        window.sessionData = parsedData;
        console.log("[DATA] window.sessionData actualizado desde modal.");

        // 2. Actualizar el campo oculto del formulario para que esté disponible al enviar
        setSessionJsonText(parsedData);
        
        // 3. Limpiar el input de archivo físico si existía
        const sessionJsonFileInput = document.getElementById('session-json-file');
        if (sessionJsonFileInput) {
            sessionJsonFileInput.value = '';
        }
        
        // 4. ACTUALIZACIÓN CLAVE: Actualizar visualmente el campo "Archivo seleccionado"
        // para indicar que los datos vienen del modal, incluyendo el nombre del proyecto.
        updateFileInfo(document.getElementById('session-json-file-info'), null, `Datos cargados desde el modal: ${projectName}`);
        updateActionLog(`JSON de sesión cargado desde el modal: ${projectName}`);
        
        // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
        window.estadoDatos.sesion.cargado = true;
        window.estadoDatos.sesion.nombreArchivo = `${projectName}.json`;
        window.estadoDatos.sesion.origen = 'modal';
        actualizarEstadoGeneral();
        
        // 5. Cerrar modal y actualizar otros elementos
        closeSessionJsonModal();
        updateProposedFilename();
        console.log("[FUNC] handleSessionJsonLoad completada.");
    } catch (e) {
        console.error('[ERROR] handleSessionJsonLoad:', e);
        alert('Error al parsear JSON: ' + e.message);
    }
}

function handleClassJsonLoad() {
    console.log("[FUNC] handleClassJsonLoad iniciada.");
    const jsonText = classJsonTextarea.value.trim();
    if (!jsonText) {
        alert('Por favor, pegue el contenido JSON antes de cargar.');
        return;
    }
    try {
        const parsedData = JSON.parse(jsonText);
        // 1. Guardar datos en la variable global (fuente de verdad)
        window.classData = parsedData;
        console.log("[DATA] window.classData actualizado desde modal.");

        // 2. Actualizar el campo oculto del formulario para que esté disponible al enviar
        setClassJsonText(parsedData);
        
        // 3. Limpiar el input de archivo físico si existía
        const classJsonFileInput = document.getElementById('class-json-file');
        if (classJsonFileInput) {
            classJsonFileInput.value = '';
        }
        
        // 4. ACTUALIZACIÓN CLAVE: Actualizar visualmente el campo "Archivo seleccionado"
        // para indicar que los datos vienen del modal. (Opcional: mostrar info del JSON si es relevante)
        // Como no hay un campo "nombre" obvio en el JSON de clase, mostramos un mensaje genérico.
        updateFileInfo(document.getElementById('class-json-file-info'), null, "Datos de clase cargados desde el modal");
        updateActionLog('JSON de clase cargado desde el modal');
        
        // --- ACTUALIZACIÓN DEL ESTADO UNIFICADO ---
        window.estadoDatos.clase.cargado = true;
        window.estadoDatos.clase.nombreArchivo = "Datos de clase cargados desde el modal";
        window.estadoDatos.clase.origen = 'modal';
        actualizarEstadoGeneral();
        
        // 5. Cerrar modal
        closeClassJsonModal();
        console.log("[FUNC] handleClassJsonLoad completada.");
    } catch (e) {
        console.error('[ERROR] handleClassJsonLoad:', e);
        alert('Error al parsear JSON: ' + e.message);
    }
}

// --- Función principal para generar el documento ---
async function generateDocument(event) {
    event.preventDefault();
    updateActionLog('--- Iniciando proceso de generación ---');
    console.log("[FUNC] generateDocument iniciada.");

    const form = document.getElementById('generation-form');
    if (!form) {
        const errorMsg = 'Error: Formulario principal no encontrado.';
        console.error(errorMsg);
        updateActionLog(errorMsg);
        return;
    }

    // 1. Crear FormData desde el formulario existente
    // Esto incluye la plantilla y cualquier archivo que se haya seleccionado
    const formData = new FormData(form);
    console.log("[DATA] FormData inicial creado.");

    // 2. Sobrescribir/Adjuntar datos JSON desde variables globales (priorizando modales/archivos cargados en memoria)
    // Esta es la parte crítica: aseguramos que los datos más recientes (de modal o archivo) se usen
    console.log("[DATA] Datos en window.sessionData:", window.sessionData ? 'Sí' : 'No');
    console.log("[DATA] Datos en window.classData:", window.classData ? 'Sí' : 'No');

    if (window.sessionData) {
        const sessionJsonText = JSON.stringify(window.sessionData);
        formData.set('session_json_text', sessionJsonText);
        updateActionLog('Datos de sesión (de modal o archivo) incluidos en la solicitud.');
        console.log("[DATA] session_json_text añadido/actualizado en formData.");
    } else {
        updateActionLog('No hay datos de sesión para incluir.');
    }
    if (window.classData) {
        const classJsonText = JSON.stringify(window.classData);
        formData.set('class_json_text', classJsonText);
        updateActionLog('Datos de clase (de modal o archivo) incluidos en la solicitud.');
        console.log("[DATA] class_json_text añadido/actualizado en formData.");
    } else {
        updateActionLog('No hay datos de clase para incluir.');
    }

    try {
        updateActionLog('Enviando datos al servidor...');
        console.log("[NET] Enviando solicitud POST a /generate.");

        // 3. Enviar solicitud usando fetch para tener control total sobre la respuesta
        const response = await fetch('/generate', {
            method: 'POST',
            body: formData
        });

        console.log(`[NET] Respuesta recibida. Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            const errorMsg = `Error del servidor: ${response.status} - ${errorText || 'Sin detalles'}`;
            console.error(errorMsg);
            throw new Error(errorText || `Error HTTP: ${response.status}`);
        }

        updateActionLog('Documento generado en el servidor. Preparando descarga...');
        console.log("[NET] Solicitud exitosa. Preparando descarga.");

        // 4. Obtener el nombre del archivo desde los headers de la respuesta
        const contentDisposition = response.headers.get('Content-Disposition');
        console.log(`[NET] Content-Disposition header: ${contentDisposition}`);
        let filename = 'sesion_generada.docx';
        if (contentDisposition) {
            // Expresión regular robusta para extraer el nombre de archivo
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '').trim();
                console.log(`[NET] Nombre de archivo extraído: ${filename}`);
            } else {
                console.warn("[WARN] No se pudo parsear el nombre del archivo del header. Usando nombre por defecto.");
            }
        } else {
             console.warn("[WARN] Header 'Content-Disposition' no encontrado. Usando nombre por defecto.");
        }

        // --- Intentar usar File System Access API primero para la descarga del documento ---
        if ('showSaveFilePicker' in window) {
            try {
                updateActionLog('Intentando usar selector de archivos del sistema para el documento...');
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Documentos Word',
                        accept: {'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']}
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(await response.blob());
                await writable.close();

                updateActionLog(`Documento guardado como ${handle.name} usando selector del sistema.`);
                return; // Salir si se usó la API moderna
            } catch (err) {
                if (err.name === 'AbortError') {
                    updateActionLog('Guardado cancelado por el usuario en el selector del sistema.');
                    return;
                } else {
                    console.warn('API File System Access no disponible o falló para documento, usando método alternativo:', err);
                    updateActionLog('Selector del sistema no disponible, usando método de descarga estándar...');
                    // Continuar con método alternativo
                }
            }
        }

        // 5. Crear Blob y forzar la descarga con diálogo (método alternativo)
        console.log("[DL] Creando Blob desde la respuesta...");
        const blob = await response.blob();
        console.log(`[DL] Blob creado. Tamaño: ${blob.size} bytes.`);

        if (blob.size === 0) {
             const errorMsg = 'Error: El servidor devolvió un archivo vacío.';
             console.error(errorMsg);
             updateActionLog(errorMsg);
             alert(errorMsg);
             return;
        }

        const url = window.URL.createObjectURL(blob);
        console.log(`[DL] Object URL creado: ${url.substring(0, 50)}...`);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename; // Este es el nombre que verá el usuario en el diálogo
        console.log(`[DL] Elemento <a> creado. Atributo download: ${a.download}`);

        document.body.appendChild(a);
        console.log("[DL] Elemento <a> añadido al DOM.");

        // --- Forzar el clic y la descarga ---
        console.log("[DL] Simulando clic para iniciar descarga...");
        a.click();
        console.log("[DL] Clic simulado.");

        // Limpiar
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log("[DL] Object URL revocado.");

        updateActionLog(`Documento descargado: ${filename}`);
        console.log(`[FUNC] generateDocument completada. Archivo '${filename}' descargado.`);

    } catch (error) {
        const errorMsg = `Error al generar/descargar el documento: ${error.message}`;
        console.error('[ERROR] generateDocument:', error);
        updateActionLog(`Error: ${errorMsg}`);
        alert(errorMsg);
    } finally {
        updateActionLog('--- Finalizado proceso de generación ---');
    }
}