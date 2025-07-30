// static/script.js

// Variables globales
let sessionData = null;
let classData = null;

// Elementos del DOM
const sessionJsonModal = document.getElementById('session-json-modal');
const classJsonModal = document.getElementById('class-json-modal');
const sessionJsonFilename = document.getElementById('session-json-filename');
const sessionJsonTextarea = document.getElementById('session-json-textarea');
const classJsonTextarea = document.getElementById('class-json-textarea');
const sessionJsonValidationMessage = document.getElementById('session-json-validation-message');
const classJsonValidationMessage = document.getElementById('class-json-validation-message');

// Elementos de los formularios principales
const pasteSessionBtn = document.getElementById('paste-session-btn');
const pasteClassBtn = document.getElementById('paste-class-btn');
const sessionJsonFile = document.getElementById('session-json-file');
const classJsonFile = document.getElementById('class-json-file');
const alumnosPreview = document.getElementById('alumnos-preview');
const generationForm = document.getElementById('generation-form');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Botones para abrir modales
    pasteSessionBtn.addEventListener('click', openSessionJsonModal);
    pasteClassBtn.addEventListener('click', openClassJsonModal);
    
    // Botones del modal de Sesión
    if (document.querySelector('#session-json-modal .close')) {
        document.querySelector('#session-json-modal .close').addEventListener('click', closeSessionJsonModal);
    }
    document.getElementById('verify-session-json-btn').addEventListener('click', () => verifyJson('session'));
    document.getElementById('save-session-json-btn').addEventListener('click', saveSessionJson);
    document.getElementById('load-session-json-btn').addEventListener('click', loadSessionJson);
    
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
    
    // Manejo de archivos JSON
    sessionJsonFile.addEventListener('change', handleSessionJsonFile);
    classJsonFile.addEventListener('change', handleClassJsonFile);
    
    // Vista previa de alumnos
    sessionJsonFile.addEventListener('change', updateAlumnosPreview);
    classJsonFile.addEventListener('change', updateAlumnosPreview);
    
    // Envío del formulario
    generationForm.addEventListener('submit', generateDocument);
});

// Funciones para manejo de modales
function openSessionJsonModal() {
    sessionJsonTextarea.value = '';
    sessionJsonFilename.value = '';
    sessionJsonValidationMessage.textContent = '';
    sessionJsonValidationMessage.className = '';
    sessionJsonModal.style.display = 'block';
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

// Función genérica para verificar JSON
function verifyJson(type) {
    const textarea = type === 'session' ? sessionJsonTextarea : classJsonTextarea;
    const validationMessage = type === 'session' ? sessionJsonValidationMessage : classJsonValidationMessage;
    const jsonText = textarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage(validationMessage, 'Por favor, pegue el contenido JSON.', 'invalid');
        return;
    }
    
    // Enviar al backend para validación
    fetch('/validate_json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            json_text: jsonText,
            reference_structure: type // Podría enviarse una estructura de referencia real
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.valid) {
            showValidationMessage(validationMessage, 'JSON válido.', 'valid');
        } else {
            showValidationMessage(validationMessage, `JSON inválido: ${data.error}`, 'invalid');
        }
    })
    .catch(error => {
        console.error('Error al validar JSON:', error);
        showValidationMessage(validationMessage, 'Error al validar el JSON.', 'invalid');
    });
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
    
    // Intentar parsear para obtener el nombre del proyecto
    let projectName = '';
    try {
        const parsedData = JSON.parse(jsonText);
        projectName = parsedData.nombreproyecto || '';
    } catch (e) {
        showValidationMessage(sessionJsonValidationMessage, `Error al parsear JSON: ${e.message}`, 'invalid');
        return;
    }
    
    // Determinar el nombre del archivo
    let filename = 'sesion_proyecto.json'; // Valor por defecto
    
    if (filenameInput) {
        // Usar el nombre proporcionado por el usuario (sin extensión)
        filename = `sesion_${filenameInput}.json`;
    } else if (projectName) {
        // Usar el nombre del proyecto del JSON
        // Limpiar el nombre del proyecto para usarlo en el nombre del archivo
        const cleanProjectName = projectName
            .substring(0, 50) // Limitar longitud
            .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ\s]/g, '') // Eliminar caracteres especiales
            .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
            .replace(/[áéíóúÁÉÍÓÚ]/g, match => 
                ({'á':'a', 'é':'e', 'í':'i', 'ó':'o', 'ú':'u', 'Á':'A', 'É':'E', 'Í':'I', 'Ó':'O', 'Ú':'U'}[match])
            );
        filename = `sesion_${cleanProjectName}.json`;
    } else {
        // Advertir si no hay nombre de proyecto
        if (!confirm('No se encontró un nombre de proyecto en el JSON. ¿Desea guardar el archivo como "sesion_proyecto.json"?')) {
            return;
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
        closeSessionJsonModal();
        updateAlumnosPreview();
        alert('JSON de Sesión cargado correctamente.');
    } catch (e) {
        showValidationMessage(sessionJsonValidationMessage, `Error al parsear JSON: ${e.message}`, 'invalid');
    }
}

// Función para cargar JSON de Clase en la aplicación
function loadClassJson() {
    const jsonText = classJsonTextarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage(classJsonValidationMessage, 'Por favor, pegue el contenido JSON antes de cargar.', 'invalid');
        return;
    }
    
    try {
        const parsedData = JSON.parse(jsonText);
        classData = parsedData;
        // Limpiar el input file si se estaba usando
        classJsonFile.value = '';
        closeClassJsonModal();
        updateAlumnosPreview();
        alert('JSON de Clase cargado correctamente.');
    } catch (e) {
        showValidationMessage(classJsonValidationMessage, `Error al parsear JSON: ${e.message}`, 'invalid');
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
                updateAlumnosPreview();
            } catch (error) {
                console.error('Error al parsear JSON de sesión:', error);
                alert('Error al leer el archivo JSON de sesión.');
                sessionJsonFile.value = ''; // Limpiar el input
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
                updateAlumnosPreview();
            } catch (error) {
                console.error('Error al parsear JSON de clase:', error);
                alert('Error al leer el archivo JSON de clase.');
                classJsonFile.value = ''; // Limpiar el input
            }
        };
        reader.readAsText(file);
    }
}

// Función para actualizar la vista previa de alumnos
function updateAlumnosPreview() {
    // Si se cargó un JSON de clase, mostrar los alumnos
    let dataToShow = null;
    
    if (classData && classData.alumnos) {
        dataToShow = classData;
    } else if (classJsonFile.files.length > 0) {
        // Si hay un archivo seleccionado pero no se ha cargado aún, mostrar mensaje
        alumnosPreview.innerHTML = '<p>Procesando archivo de clase...</p>';
        return;
    } else {
        alumnosPreview.innerHTML = '<p>Cargue el JSON de clase para ver la vista previa de alumnos.</p>';
        return;
    }
    
    // Generar tabla de alumnos
    if (dataToShow.alumnos && Array.isArray(dataToShow.alumnos)) {
        let tableHTML = `
            <table id="alumnos-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Fecha Nac.</th>
                        <th>Necesidades</th>
                        <th>Notas</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        dataToShow.alumnos.forEach(alumno => {
            tableHTML += `
                <tr>
                    <td>${alumno.nombre || 'N/A'}</td>
                    <td>${alumno.fechaNacimiento || 'N/A'}</td>
                    <td>${alumno.necesidades || 'Ninguna'}</td>
                    <td>${alumno.notas || ''}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        alumnosPreview.innerHTML = tableHTML;
    } else {
        alumnosPreview.innerHTML = '<p>No se encontraron alumnos en el JSON de clase.</p>';
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
    if (!formData.get('template').name && !document.getElementById('template-file').files.length) {
        alert('Por favor, seleccione una plantilla .docx.');
        return;
    }
    
    if (!formData.get('start_date')) {
        alert('Por favor, seleccione una fecha de inicio.');
        return;
    }
    
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
        a.download = filename; // <- Aquí se usa el nombre del servidor o el extraído
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('Error:', error);
        alert(`Error al generar el documento: ${error.message}`);
    });
}
