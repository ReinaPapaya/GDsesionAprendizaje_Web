document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generateForm');
    const logList = document.getElementById('processLog');
    const fileInputs = document.querySelectorAll('input[type="file"]');

    // Mostrar nombres de archivos seleccionados
    fileInputs.forEach(input => {
        input.addEventListener('change', (event) => {
            const fileListDiv = document.getElementById(`${input.id}Files`);
            fileListDiv.textContent = `Archivos seleccionados: ${Array.from(event.target.files).map(f => f.name).join(', ')}`;
            addLogMessage(`${input.labels[0].textContent} seleccionado(s): ${Array.from(event.target.files).map(f => f.name).join(', ')}`);
        });
    });

    // Manejar envío del formulario
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearLog();
        addLogMessage('Iniciando proceso de generación...');

        const formData = new FormData(form);
        try {
            // Verificar que se proporcionó al menos un JSON de sesión
            if (!formData.get('session_json') && !formData.get('session_json_text')) {
                throw new Error('Datos de sesión no proporcionados (archivo o texto JSON requerido)');
            }
            addLogMessage('Archivo o texto de sesión proporcionado');

            // Verificar que se proporcionó al menos un JSON de clase
            if (!formData.get('class_json') && !formData.get('class_json_text')) {
                throw new Error('Datos de clase no proporcionados (archivo o texto JSON requerido)');
            }
            addLogMessage('Archivo o texto de clase proporcionado');

            // Enviar solicitud al backend
            addLogMessage('Enviando datos al servidor...');
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido del servidor');
            }

            addLogMessage('Datos verificados en el servidor');
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : 'documento.docx';

            addLogMessage('Documento generado exitosamente');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            addLogMessage(`Documento ${filename} descargado`);
        } catch (error) {
            addLogMessage(`Error: ${error.message}`, 'error');
        }
    });

    // Funciones auxiliares
    function addLogMessage(message, type = 'info') {
        const li = document.createElement('li');
        li.className = `log-${type}`;
        li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logList.appendChild(li);
        logList.scrollTop = logList.scrollHeight; // Auto-scroll al último mensaje
    }

    function clearLog() {
        logList.innerHTML = '';
    }
});
