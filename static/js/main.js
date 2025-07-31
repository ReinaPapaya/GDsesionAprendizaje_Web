document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generateForm');
    const logList = document.getElementById('processLog');
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const classJsonText = document.getElementById('class_json_text');
    const classJsonStatus = document.getElementById('classJsonStatus');
    const studentsList = document.getElementById('studentsList');

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
            if (!formData.get('session_json') && !formData.get('session_json_text')) {
                throw new Error('Datos de sesión no proporcionados (archivo o texto JSON requerido)');
            }
            addLogMessage('Archivo o texto de sesión proporcionado');

            if (!formData.get('class_json') && !formData.get('class_json_text')) {
                throw new Error('Datos de clase no proporcionados (archivo o texto JSON requerido)');
            }
            addLogMessage('Archivo o texto de clase proporcionado');

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

    // Funciones para el editor de alumnos
    window.openClassEditor = function() {
        const modal = document.getElementById('classEditorModal');
        modal.style.display = 'block';
        loadClassData();
        addLogMessage('Editor de clase abierto');
    };

    window.closeClassEditor = function() {
        const modal = document.getElementById('classEditorModal');
        modal.style.display = 'none';
        addLogMessage('Editor de clase cerrado');
    };

    window.addStudentRow = function() {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="student-name" placeholder="Nombre"></td>
            <td><input type="text" class="student-birthdate" placeholder="dd/mm/yyyy"></td>
            <td><input type="text" class="student-needs" placeholder="Necesidades"></td>
            <td><input type="text" class="student-notes" placeholder="Notas"></td>
            <td><button type="button" onclick="deleteStudentRow(this)">Eliminar</button></td>
        `;
        studentsList.appendChild(row);
        addLogMessage('Añadido nuevo alumno al editor');
    };

    window.deleteStudentRow = function(button) {
        button.parentElement.parentElement.remove();
        addLogMessage('Eliminado alumno del editor');
    };

    window.saveClassJson = async function() {
        const students = [];
        studentsList.querySelectorAll('tr').forEach(row => {
            const name = row.querySelector('.student-name').value;
            const birthdate = row.querySelector('.student-birthdate').value;
            const needs = row.querySelector('.student-needs').value;
            const notes = row.querySelector('.student-notes').value;
            if (name || birthdate || needs || notes) {
                students.push({
                    nombre: name,
                    fechaNacimiento: birthdate,
                    necesidadesEspeciales: needs,
                    notas: notes
                });
            }
        });

        const classJson = { alumnos: students };
        try {
            const response = await fetch('/edit_class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(classJson)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar JSON de clase');
            }

            classJsonText.value = JSON.stringify(classJson);
            classJsonStatus.textContent = 'Clase editada: ' + students.length + ' alumno(s)';
            addLogMessage('JSON de clase guardado con ' + students.length + ' alumno(s)');
            closeClassEditor();
        } catch (error) {
            addLogMessage(`Error al guardar clase: ${error.message}`, 'error');
        }
    };

    function loadClassData() {
        studentsList.innerHTML = '';
        try {
            const classData = classJsonText.value ? JSON.parse(classJsonText.value) : { alumnos: [] };
            classData.alumnos.forEach(alumno => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="text" class="student-name" value="${alumno.nombre || ''}" placeholder="Nombre"></td>
                    <td><input type="text" class="student-birthdate" value="${alumno.fechaNacimiento || ''}" placeholder="dd/mm/yyyy"></td>
                    <td><input type="text" class="student-needs" value="${alumno.necesidadesEspeciales || ''}" placeholder="Necesidades"></td>
                    <td><input type="text" class="student-notes" value="${alumno.notas || ''}" placeholder="Notas"></td>
                    <td><button type="button" onclick="deleteStudentRow(this)">Eliminar</button></td>
                `;
                studentsList.appendChild(row);
            });
            if (classData.alumnos.length > 0) {
                classJsonStatus.textContent = 'Clase cargada: ' + classData.alumnos.length + ' alumno(s)';
                addLogMessage('Cargados ' + classData.alumnos.length + ' alumno(s) en el editor');
            }
        } catch (error) {
            addLogMessage('Error al cargar JSON de clase: ' + error.message, 'error');
        }
    }

    // Funciones auxiliares para el log
    function addLogMessage(message, type = 'info') {
        const li = document.createElement('li');
        li.className = `log-${type}`;
        li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logList.appendChild(li);
        logList.scrollTop = logList.scrollHeight;
    }

    function clearLog() {
        logList.innerHTML = '';
    }
});
