// static/script.js

// Variables globales
let sessionData = null;
let classData = null;

// Elementos del DOM
const sessionJsonModal = document.getElementById('session-json-modal');
const classJsonModal = document.getElementById('class-json-modal');
const sessionJsonFilename = document.getElementById('session-json-filename'); // Campo para el nombre del archivo
const sessionJsonTextarea = document.getElementById('session-json-textarea');
const classJsonTextarea = document.getElementById('class-json-textarea');
const sessionJsonValidationMessage = document.getElementById('session-json-validation-message');
const classJsonValidationMessage = document.getElementById('class-json-validation-message');

// Elementos para mostrar nombres de archivos
const templateFileInfo = document.getElementById('template-file-info');
const sessionJsonFileInfo = document.getElementById('session-json-file-info');
const classJsonFileInfo = document.getElementById('class-json-file-info');

// Elementos de los formularios principales
const pasteSessionBtn = document.getElementById('paste-session-btn');
const pasteClassBtn = document.getElementById('paste-class-btn');
const templateFile = document.getElementById('template-file');
const sessionJsonFile = document.getElementById('session-json-file');
const classJsonFile = document.getElementById('class-json-file');
const statusMessage = document.getElementById('status-message');
const generationForm = document.getElementById('generation-form');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
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
    if (document.querySelector('#session-json-modal .close')) {
        document.querySelector('#session-json-modal .close').addEventListener('click', closeSessionJsonModal);
    }
    document.getElementById('verify-session-json-btn').addEventListener('click', () => verifyJson('session'));
    document.getElementById('save-session-json-btn').addEventListener('click', saveSessionJson);
    document.getElementById('load-session-json-btn').addEventListener('click', loadSessionJson);
    
    // Actualizar nombre automáticamente al pegar JSON en el modal de sesión
    sessionJsonTextarea.addEventListener('input', updateFilenameFromJson);
    
    // Botones del modal de Clase
    if (document.querySelector('#class-json-modal .close')) {
        document.querySelector('#class-json-modal .close').addEventListener('click', closeClassJsonModal);
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
    sessionJsonFilename.value = ''; // Limpiar el campo de nombre del archivo
    sessionJsonValidationMessage.textContent = '';
    sessionJsonValidationMessage.className = '';
    sessionJsonModal.style.display = 'block';
    
    // Intentar actualizar el nombre del archivo desde sessionData si ya existe
    if (sessionData && sessionData.nombreproyecto) {
        const cleanName = cleanProjectName(sessionData.nombreproyecto);
        sessionJsonFilename.value = cleanName; // Asignar el nombre del proyecto al campo Nombre del Archivo
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

// Función para limpiar el nombre del proyecto para usarlo en nombres de archivo
function cleanProjectName(projectName) {
    return projectName
        .substring(0, 50) // Limitar longitud
        .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ\s]/g, '') // Eliminar caracteres especiales
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
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
            sessionJsonFilename.value = cleanName; // Actualiza el campo Nombre del Archivo
        }
    } catch (e) {
        // Si el JSON no es válido, no hacemos nada
        // El usuario verá un error al verificar
    }
}

// Función genérica para verificar JSON (sintaxis básica local)
function verifyJson(type) {
    const textarea = type === 'session' ? sessionJsonTextarea : classJsonTextarea;
    const validationMessage = type === 'session' ? sessionJsonValidationMessage : classJsonValidationMessage;
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage(validationMessage, 'Por favor, pegue el contenido JSON.', 'invalid');
        return;
    }
    
    try {
        // Intentar parsear el JSON localmente primero para un feedback inmediato
        JSON.parse(jsonText);
        showValidationMessage(validationMessage, 'JSON válido (sintaxis). Puede cargarlo o guardarlo. La validación completa de estructura se realizará al generar el documento.', 'valid');
    } catch (e) {
        showValidationMessage(validationMessage, `JSON inválido (sintaxis): ${e.message}`, 'invalid');
    }
}

// Función para mostrar mensajes de validación
function showValidationMessage(element, message, type) {
    element.textContent = message;
    element.className = type; // 'valid' o 'invalid' para aplicar estilos CSS
}

// Función para guardar JSON de Sesión localmente
function saveSessionJson() {
    const jsonText = sessionJsonTextarea.value.trim();
    let filenameInput = sessionJsonFilename.value.trim(); // Usar el valor del campo de nombre
    
    if (!jsonText) {
        showValidationMessage(sessionJsonValidationMessage, 'Por favor, pegue el contenido JSON antes de guardar.', 'invalid');
        return;
    }
    
    // Determinar el nombre del archivo
    let filename = 'sesion_proyecto.json'; // Valor por defecto

    if (filenameInput) {
        // Usar el nombre proporcionado por el usuario (sin extensión)
        filename = `sesion_${filenameInput}.json`;
    } else {
        // Si no hay nombre en el campo, intentar obtenerlo del JSON
        try {
            const parsedData = JSON.parse(jsonText);
            const projectName = parsedData.nombreproyecto || '';
            if (projectName) {
                const cleanProjectName = cleanProjectName(projectName);
                filename = `sesion_${cleanProjectName}.json`;
            } else {
                // Advertir si no hay nombre de proyecto
                if (!confirm('No se encontró un nombre de proyecto en el JSON ni en el campo de nombre. ¿Desea guardar el archivo como "sesion_proyecto.json"?')) {
                    return;
                }
            }
        } catch (e) {
            // Si el JSON no es válido para parsear el nombre, usar el nombre por defecto
            // y mostrar un mensaje de advertencia
             if (!confirm('El JSON parece inválido para extraer el nombre del proyecto. ¿Desea guardar el archivo como "sesion_proyecto.json"?')) {
                    return;
             }
        }
    }
    
    // Crear y descargar el archivo
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

// Función para cargar JSON de Sesión en la aplicación
function loadSessionJson() {
    const jsonText = sessionJsonTextarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage(sessionJsonValidationMessage, 'Por favor, pegue el contenido JSON antes de cargar.', 'invalid');
        return;
    }
    
    try {
        const parsedData = JSON.parse(jsonText);
        sessionData = parsedData;
        // Limpiar el input file si se estaba usando
        sessionJsonFile.value = '';
        updateFileInfo(sessionJsonFileInfo, null); // Limpiar la info del archivo
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
                // Actualizar el nombre del archivo en el modal si está abierto
                if (sessionJsonModal.style.display === 'block' && sessionData.nombreproyecto) {
                    const cleanName = cleanProjectName(sessionData.nombreproyecto);
                    sessionJsonFilename.value = cleanName;
                }
            } catch (error) {
                console.error('Error al parsear JSON de sesión:', error);
                alert('Error al leer el archivo JSON de sesión.');
                sessionJsonFile.value = ''; // Limpiar el input
                updateFileInfo(sessionJsonFileInfo, null); // Limpiar la info del archivo
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
                classJsonFile.value = ''; // Limpiar el input
                updateFileInfo(classJsonFileInfo, null); // Limpiar la info del archivo
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
    event.preventDefault();
    
    const formData = new FormData(generationForm);
    
    // Si tenemos datos JSON pegados, los añadimos al formData
    if (sessionData) {
        formData.append('session_json_text', JSON.stringify(sessionData));
    }
    
    if (classData) {
        formData.append('class_json_text', JSON.stringify(classData));
    }
    
    // Validaciones básicas
    if (!formData.get('template').name && !templateFile.files.length) {
        alert('Por favor, seleccione una plantilla .docx.');
        return;
    }
    
    if (!formData.get('start_date')) {
        alert('Por favor, seleccione una fecha de inicio.');
        return;
    }
    
    updateStatusMessage('Generando documento...');
    
    // Enviar solicitud al backend
    fetch('/generate', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            // Obtener el nombre sugerido por el servidor
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'sesion_generada.docx'; // Valor por defecto

            if (contentDisposition) {
                // Intentar extraer el nombre del encabezado
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, ''); // Eliminar comillas
                }
            }

            // Crear un blob del archivo y descargarlo
            return response.blob().then(blob => ({ blob, filename }));
        } else {
            // Manejar errores del servidor
            return response.json().then(err => {
                throw new Error(err.error || 'Error desconocido al generar el documento.');
            });
        }
    })
    .then(({ blob, filename }) => {
        // Crear enlace de descarga usando el nombre del servidor
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        updateStatusMessage('Documento generado y descargado.');
    })
    .catch(error => {
        console.error('Error:', error);
        alert(`Error al generar el documento: ${error.message}`);
        updateStatusMessage(`Error: ${error.message}`);
    });
}
