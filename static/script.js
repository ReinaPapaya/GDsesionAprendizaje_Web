// static/script.js

// Variables globales
let currentJsonType = ''; // 'session' o 'class'
let sessionData = null;
let classData = null;

// Elementos del DOM
const modal = document.getElementById('json-modal');
const modalTitle = document.getElementById('modal-title');
const jsonTextarea = document.getElementById('json-textarea');
const verifyJsonBtn = document.getElementById('verify-json-btn');
const saveJsonBtn = document.getElementById('save-json-btn');
const validationMessage = document.getElementById('json-validation-message');
const pasteSessionBtn = document.getElementById('paste-session-btn');
const pasteClassBtn = document.getElementById('paste-class-btn');
const sessionJsonFile = document.getElementById('session-json-file');
const classJsonFile = document.getElementById('class-json-file');
const alumnosPreview = document.getElementById('alumnos-preview');
const generationForm = document.getElementById('generation-form');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Configurar fecha mínima para el selector de fecha
    // const today = new Date().toISOString().split('T')[0];
    // document.getElementById('start-date').setAttribute('min', today);
    
    // Botones para pegar JSON
    pasteSessionBtn.addEventListener('click', () => openJsonModal('session'));
    pasteClassBtn.addEventListener('click', () => openJsonModal('class'));
    
    // Botones del modal
    verifyJsonBtn.addEventListener('click', verifyJson);
    saveJsonBtn.addEventListener('click', saveJson);
    
    // Cerrar modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
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

// Funciones para manejo de JSON pegado
function openJsonModal(type) {
    currentJsonType = type;
    modalTitle.textContent = type === 'session' ? 'Pegar JSON de Sesión' : 'Pegar JSON de Clase';
    jsonTextarea.value = '';
    validationMessage.textContent = '';
    validationMessage.className = '';
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    currentJsonType = '';
}

function verifyJson() {
    const jsonText = jsonTextarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage('Por favor, pegue el contenido JSON.', 'invalid');
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
            reference_structure: currentJsonType // Podría enviarse una estructura de referencia real
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.valid) {
            showValidationMessage('JSON válido.', 'valid');
        } else {
            showValidationMessage(`JSON inválido: ${data.error}`, 'invalid');
        }
    })
    .catch(error => {
        console.error('Error al validar JSON:', error);
        showValidationMessage('Error al validar el JSON.', 'invalid');
    });
}

function saveJson() {
    const jsonText = jsonTextarea.value.trim();
    
    if (!jsonText) {
        showValidationMessage('Por favor, pegue el contenido JSON antes de guardar.', 'invalid');
        return;
    }
    
    try {
        const parsedData = JSON.parse(jsonText);
        
        if (currentJsonType === 'session') {
            sessionData = parsedData;
            // Limpiar el input file si se estaba usando
            sessionJsonFile.value = '';
        } else if (currentJsonType === 'class') {
            classData = parsedData;
            // Limpiar el input file si se estaba usando
            classJsonFile.value = '';
        }
        
        closeModal();
        updateAlumnosPreview();
        alert(`JSON de ${currentJsonType} guardado correctamente.`);
    } catch (e) {
        showValidationMessage(`Error al parsear JSON: ${e.message}`, 'invalid');
    }
}

function showValidationMessage(message, type) {
    validationMessage.textContent = message;
    validationMessage.className = type;
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
            // Crear un blob del archivo y descargarlo
            return response.blob();
        } else {
            // Manejar errores del servidor
            return response.json().then(err => {
                throw new Error(err.error || 'Error desconocido al generar el documento.');
            });
        }
    })
    .then(blob => {
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'documento_generado.docx'; // Nombre por defecto
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
