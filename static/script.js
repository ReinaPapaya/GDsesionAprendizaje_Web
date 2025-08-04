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

document.addEventListener('DOMContentLoaded', function() {
    // Cargar archivo de plantilla
    templateFile.addEventListener('change', function() {
        const file = this.files[0];
        updateFileInfo(templateFileInfo, file);
        updateActionLog(`Plantilla cargada: ${file ? file.name : 'Ninguna'}`);
    });

    // Cargar JSON de sesión
    sessionJsonFile.addEventListener('change', function() {
        const file = this.files[0];
        updateFileInfo(sessionJsonFileInfo, file);
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    sessionData = JSON.parse(e.target.result);
                    updateActionLog(`JSON de Sesión cargado desde archivo: ${file.name}`);
                    updateProposedFilename();
                } catch (error) {
                    alert('Error al leer el archivo JSON de sesión.');
                    sessionJsonFile.value = '';
                    updateFileInfo(sessionJsonFileInfo, null);
                }
            };
            reader.readAsText(file);
        }
    });

    // Cargar JSON de clase
    classJsonFile.addEventListener('change', function() {
        const file = this.files[0];
        updateFileInfo(classJsonFileInfo, file);
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    classData = JSON.parse(e.target.result);
                    updateActionLog(`JSON de Clase cargado desde archivo: ${file.name}`);
                } catch (error) {
                    alert('Error al leer el archivo JSON de clase.');
                    classJsonFile.value = '';
                    updateFileInfo(classJsonFileInfo, null);
                }
            };
            reader.readAsText(file);
        }
    });

    // Abrir modales
    pasteSessionBtn.addEventListener('click', () => {
        sessionJsonTextarea.value = sessionData ? JSON.stringify(sessionData, null, 2) : '';
        sessionJsonModal.style.display = 'block';
        updateActionLog('Modal de sesión abierto');
    });

    pasteClassBtn.addEventListener('click', () => {
        classJsonTextarea.value = classData ? JSON.stringify(classData, null, 2) : '';
        classJsonModal.style.display = 'block';
        updateActionLog('Modal de clase abierto');
    });

    // Cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
            updateActionLog('Modal cerrado');
        });
    });

    // Verificar JSON de sesión
    document.getElementById('verify-session-json-btn')?.addEventListener('click', () => {
        try {
            const json = JSON.parse(sessionJsonTextarea.value);
            if (!json.nombreproyecto) throw new Error('Falta nombreproyecto');
            sessionData = json;
            // Generar nombre del archivo
            const cleanName = json.nombreproyecto.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
            sessionJsonFilename.value = `sesion_${cleanName}`;
            updateActionLog('JSON de sesión verificado y nombre generado');
            updateProposedFilename();
        } catch (e) {
            alert('JSON de sesión inválido: ' + e.message);
        }
    });

    // Guardar JSON de sesión
    document.getElementById('save-session-json-btn')?.addEventListener('click', () => {
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
            } catch (e) {}
        }
        if (jsonText) {
            const blob = new Blob([jsonText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateActionLog(`JSON guardado como ${filename}`);
        } else {
            alert('No hay contenido JSON para guardar.');
        }
    });

    // Cargar JSON de sesión
    document.getElementById('load-session-json-btn')?.addEventListener('click', () => {
        const jsonText = sessionJsonTextarea.value.trim();
        if (!jsonText) {
            alert('Por favor, pegue el contenido JSON antes de cargar.');
            return;
        }
        try {
            sessionData = JSON.parse(jsonText);
            updateActionLog('JSON de sesión cargado desde el modal');
            sessionJsonFile.value = '';
            updateFileInfo(sessionJsonFileInfo, null);
            closeSessionJsonModal();
            updateProposedFilename();
        } catch (e) {
            alert('Error al parsear JSON: ' + e.message);
        }
    });

    // Actualizar nombre del archivo al cambiar fecha
    document.getElementById('start-date')?.addEventListener('change', updateProposedFilename);

    // Inicializar
    updateProposedFilename();

    // Enviar formulario
    generationForm.addEventListener('submit', generateDocument);
});

function updateFileInfo(infoElement, file) {
    if (file) {
        infoElement.textContent = `Archivo seleccionado: ${file.name}`;
        infoElement.style.display = 'block';
    } else {
        infoElement.textContent = '';
        infoElement.style.display = 'none';
    }
}

function updateProposedFilename() {
    const startDate = document.getElementById('start-date')?.value;
    const proposedFilename = document.getElementById('proposed-filename');
    if (sessionData && sessionData.nombreproyecto && startDate) {
        const cleanName = sessionData.nombreproyecto.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
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
        return 'Periodo no disponible';
    }
}

function updateActionLog(message) {
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    actionLog.appendChild(li);
    actionLog.scrollTop = actionLog.scrollHeight;
}

function generateDocument(event) {
    event.preventDefault();
    const formData = new FormData(generationForm);

    if (sessionData) {
        formData.set('session_json_text', JSON.stringify(sessionData));
    }
    if (classData) {
        formData.set('class_json_text', JSON.stringify(classData));
    }

    updateActionLog('Generando documento...');

    // Enviar el formulario (el navegador manejará la descarga)
    const form = document.getElementById('generation-form');
    form.submit();
}
