# Generador de Sesiones de Aprendizaje Web

Aplicación web para generar documentos de sesiones de aprendizaje a partir de plantillas Word y archivos JSON, basada en el script original `GDsesionAprendizaje.py`.

## Características

- Carga de plantilla `.docx`
- Carga de datos mediante archivos JSON o pegando directamente el contenido JSON
- Cálculo automático de edades de alumnos en meses
- Generación automática del periodo de sesiones
- Vista previa de datos de alumnos
- Descarga del documento `.docx` generado

## Requisitos

- Python 3.7+
- Flask
- docxtpl
- python-docx

## Instalación Local

1. Clonar el repositorio o descargar los archivos.
2. Crear un entorno virtual:
   ```bash
   python -m venv venv
   # En Windows
   venv\Scripts\activate
   # En macOS/Linux
   source venv/bin/activate