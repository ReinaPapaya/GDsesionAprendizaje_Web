// static/script.js

// Variables globales
let sessionData = null;
let classData = null;
let generationForm;

// Elementos del DOM
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded ejecutado, buscando formulario...');
    generationForm = document.getElementById('uploadForm');
    if (!generationForm) {
        console.error('Formulario con id="uploadForm" no encontrado');
        console.log('Elementos del DOM:', document.querySelectorAll('form')); // Depuración
        alert('Error: Formulario no encontrado. Por favor, recargue la página.');
        return;
    }
    console.log('Formulario encontrado:', generationForm);

    // Botones para abrir modales
    pasteSessionBtn.addEventListener('click', openSessionJsonModal);
    pasteClassBtn.addEventListener('click', openClassJsonModal);
    
    // Inputs de tipo file para mostrar nombres
    templateFile.addEventListener('change', function() {
        updateFileInfo(templateFileInfo, this.files[0]);
    });
    
    sessionJsonFile.addEventListener('change', function() {
        updateFileInfo(sessionJsonFileInfo, this.files[0]);
        handleSessionJsonFile.call(this, { target: this });
    });
    
    classJsonFile.addEventListener('change', function() {
        updateFileInfo(classJsonFileInfo, this.files[0]);
        handleClassJsonFile.call(this, { target: this });
    });
    
    // Botones del modal de Sesión
    const sessionCloseBtn = document.querySelector('#session-json-modal .close');
    if (sessionCloseBtn) {
        sessionCloseBtn.addEventListener('click', closeSessionJsonModal);
    }
    document.getElementById('verify-session-json-btn').addEventListener('click', () => verifyJson('session'));
    document.getElementById('save-session-json-btn').addEventListener('click', saveSessionJson);
    document.getElementById('load-session-json-btn').addEventListener('click', loadSessionJson);
    
    // Actualizar nombre automáticamente al pegar JSON en el modal de sesión
    sessionJsonTextarea.addEventListener('input', updateFilenameFromJson);
    
    // Botones del modal de Clase
    const classCloseBtn = document.querySelector('#class-json-modal .close');
    if (classCloseBtn) {
        classCloseBtn.addEventListener('click', closeClassJsonModal);
    }
    document.getElementById('verify-class-json-btn').addEventListener('click', () => verifyJson('class'));
    document.getElementById('load-class-json-btn').addEventListener('click', loadClassJson);
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === sessionJsonModal) closeSessionJsonModal();
        if (event.target === classJsonModal) closeClassJsonModal();
    });
    
    // Envío del formulario
    generationForm.addEventListener('submit', generateDocument);
});

// Función para actualizar la información del archivo seleccionado
function updateFileInfo(infoElement, file) {
    if (file) {
        infoElement.textContent = `Archivo seleccionado: ${file.name}`;
        infoElement.style.display = 'block';
    } else {
        infoElement.textContent = '';
        infoElement.style.display = 'none';
    }
}

// Funciones para manejo de modales
function openSessionJsonModal() {
    sessionJsonTextarea.value = '';
    sessionJsonFilename.value = '';
    sessionJsonValidationMessage.textContent = '';
    sessionJsonValidationMessage.className = '';
    sessionJsonModal.style.display = 'block';
    
    if (sessionData && sessionData.nombreproyecto) {
        const cleanName = cleanProjectName(sessionData.nombreproyecto);
        sessionJsonFilename.value = cleanName;
    }
}

function closeSessionJsonModal() {
    sessionJsonModal.style.display = 'none';
}

function openClassJsonModal() {
    classJsonTextarea.value = '';
    classJsonValidationMessage.textContent = '';
    classJsonValidationMessage.className = '';
    classJsonModal.style.display = 'block';
}

function closeClassJsonModal() {
    classJsonModal.style.display = 'none';
}

// Función para limpiar el nombre del proyecto
function cleanProjectName(projectName) {
    return projectName
        .substring(0, 50)
        .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[áéíóúÁÉÍÓÚ]/g, match => 
            ({'á':'a', 'é':'e', 'í':'i', 'ó':'o', 'ú':'u', 'Á':'A', 'É':'E', 'Í':'I', 'Ó':'O', 'Ú':'U'}[match])
        );
}

// Función para actualizar el nombre del archivo desde el JSON pegado
function updateFilenameFromJson() {
    const jsonText = sessionJsonTextarea.value.trim();
    if (!jsonText) return;
    
    try {
        const parsedData = JSON.parse(jsonText);
        if (parsedData.nombreproyecto) {
            const cleanName = cleanProjectName(parsedData.nombreproyecto);
            sessionJsonFilename.value = cleanName;
        }
    } catch (e) {
        // El usuario verá un error al verificar
    }
}

// Función genérica para verificar JSON
function verifyJson(type) {
    const textarea = type === 'session' ? sessionJsonTextarea : classJsonTextarea;
    const validationMessage = type === 'session' ? sessionJsonValidationMessage : classJsonValidationMessage;
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage(validationMessage, 'Por favor, pegue el contenido JSON.', 'invalid');
        return;
    }
    
    try {
        JSON.parse(jsonText);
        showValidationMessage(validationMessage, 'JSON válido (sintaxis). Puede cargarlo o guardarlo.', 'valid');
    } catch (e) {
        showValidationMessage(validationMessage, `JSON inválido (sintaxis): ${e.message}`, 'invalid');
    }
}

// Función para mostrar mensajes de validación
function showValidationMessage(element, message, type) {
    element.textContent = message;
    element.className = type;
}

// Función para guardar JSON de Sesión localmente
function saveSessionJson() {
    const jsonText = sessionJsonTextarea.value.trim();
    let filenameInput = sessionJsonFilename.value.trim();
    
    if (!jsonText) {
        showValidationMessage(sessionJsonValidationMessage, 'Por favor, pegue el contenido JSON antes de guardar.', 'invalid');
        return;
    }
    
    let filename = 'sesion_proyecto.json';
    if (filenameInput) {
        filename = `sesion_${filenameInput}.json`;
    } else {
        try {
            const parsedData = JSON.parse(jsonText);
            const projectName = parsedData.nombreproyecto || '';
            if (projectName) {
                filename = `sesion_${cleanProjectName(projectName)}.json`;
            } else if (!confirm('No se encontró un nombre de proyecto. ¿Desea guardar como "sesion_proyecto.json"?')) {
                return;
            }
        } catch (e) {
            if (!confirm('El JSON es inválido para extraer el nombre. ¿Desea guardar como "sesion_proyecto.json"?')) {
                return;
            }
        }
    }
    
    try {
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showValidationMessage(sessionJsonValidationMessage, `Archivo guardado como: ${filename}`, 'valid');
    } catch (e) {
        console.error('Error al guardar el archivo:', e);
        showValidationMessage(sessionJsonValidationMessage, `Error al guardar el archivo: ${e.message}`, 'invalid');
    }
}

// Función para cargar JSON de Sesión
function loadSessionJson() {
    const jsonText = sessionJsonTextarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage(sessionJsonValidationMessage, 'Por favor, pegue el contenido JSON antes de cargar.', 'invalid');
        return;
    }
    
    try {
        sessionData = JSON.parse(jsonText);
        sessionJsonFile.value = '';
        updateFileInfo(sessionJsonFileInfo, null);
        closeSessionJsonModal();
        updateStatusMessage('JSON de Sesión cargado correctamente.');
        alert('JSON de Sesión cargado correctamente.');
    } catch (e) {
        showValidationMessage(sessionJsonValidationMessage, `Error al parsear JSON: ${e.message}`, 'invalid');
    }
}

// Funciones para manejo de archivos JSON
function handleSessionJsonFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                sessionData = JSON.parse(e.target.result);
                updateStatusMessage('JSON de Sesión cargado desde archivo.');
                if (sessionJsonModal.style.display === 'block' && sessionData.nombreproyecto) {
                    sessionJsonFilename.value = cleanProjectName(sessionData.nombreproyecto);
                }
            } catch (error) {
                console.error('Error al parsear JSON de sesión:', error);
                alert('Error al leer el archivo JSON de sesión.');
                sessionJsonFile.value = '';
                updateFileInfo(sessionJsonFileInfo, null);
            }
        };
        reader.readAsText(file);
    }
}

function handleClassJsonFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                classData = JSON.parse(e.target.result);
                updateStatusMessage('JSON de Clase cargado desde archivo.');
            } catch (error) {
                console.error('Error al parsear JSON de clase:', error);
                alert('Error al leer el archivo JSON de clase.');
                classJsonFile.value = '';
                updateFileInfo(classJsonFileInfo, null);
            }
        };
        reader.readAsText(file);
    }
}

// Función para actualizar el mensaje de estado
function updateStatusMessage(message) {
    if (statusMessage) {
        statusMessage.innerHTML = `<p>${message}</p>`;
    }
}

// Función para generar el documento
function generateDocument(event) {
    console.log('generateDocument iniciado');
    event.preventDefault();
    
    if (!generationForm) {
        console.error('Formulario no encontrado');
        alert('Error: Formulario no encontrado. Recargue la página.');
        return;
    }
    
    const formData = new FormData(generationForm);
    
    if (sessionData) {
        console.log('Añadiendo datos de sesión desde variable');
        formData.append('session_json_text', JSON.stringify(sessionData));
    }
    
    if (classData) {
        console.log('Añadiendo datos de clase desde variable');
        formData.append('class_json_text', JSON.stringify(classData));
    }
    
    const templateFileInput = document.getElementById('template-file');
    const startDateInput = document.getElementById('start-date');
    const sessionFileInput = document.getElementById('session-json-file');
    const classFileInput = document.getElementById('class-json-file');
    
    const hasTemplateFile = templateFileInput && templateFileInput.files && templateFileInput.files.length > 0;
    console.log('Tiene archivo de plantilla:', hasTemplateFile);
    
    if (!hasTemplateFile) {
        alert('Por favor, seleccione una plantilla .docx.');
        return;
    }
    
    const startDate = startDateInput ? startDateInput.value : '';
    console.log('Fecha de inicio:', startDate);
    
    if (!startDate) {
        alert('Por favor, seleccione una fecha de inicio.');
        return;
    }
    
    const hasSessionFile = sessionFileInput && sessionFileInput.files && sessionFileInput.files.length > 0;
    const hasSessionData = sessionData || hasSessionFile;
    console.log('Tiene datos de sesión:', hasSessionData, '(variable:', !!sessionData, ', archivo:', hasSessionFile, ')');
    
    if (!hasSessionData) {
        alert('Por favor, cargue los datos de sesión (archivo JSON o pegue el contenido).');
        return;
    }
    
    const hasClassFile = classFileInput && classFileInput.files && classFileInput.files.length > 0;
    const hasClassData = classData || hasClassFile;
    console.log('Tiene datos de clase:', hasClassData, '(variable:', !!classData, ', archivo:', hasClassFile, ')');
    
    if (!hasClassData) {
        alert('Por favor, cargue los datos de clase (archivo JSON o pegue el contenido).');
        return;
    }
    
    console.log('Todas las validaciones pasaron, enviando solicitud...');
    updateStatusMessage('Generando documento...');
    
    fetch('/generate', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Respuesta recibida:', response.status, response.statusText);
        if (response.ok) {
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'sesion_generada.docx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            console.log('Nombre de archivo:', filename);
            return response.blob().then(blob => ({ blob, filename }));
        } else {
            return response.text().then(text => {
                console.error('Error del servidor:', text);
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.error || 'Error desconocido al generar el documento.');
                } catch (parseError) {
                    throw new Error(`Error del servidor: ${response.status} ${response.statusText}. Respuesta: ${text}`);
                }
            });
        }
    })
    .then(({ blob, filename }) => {
        console.log('Creando enlace de descarga para:', filename);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        updateStatusMessage('Documento generado y descargado correctamente.');
        console.log('Descarga completada');
    })
    .catch(error => {
        console.error('Error completo:', error);
        alert(`Error al generar el documento: ${error.message}`);
        updateStatusMessage(`Error: ${error.message}`);
    });
}
