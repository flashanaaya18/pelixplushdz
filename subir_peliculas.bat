@echo off
:: Configuración para mostrar caracteres especiales correctamente
chcp 65001 >nul

:: Título de la ventana y color verde estilo hacker
title Actualizador Automático PelixPlus
color 0A

cls
echo ======================================================
echo   DETECTANDO NUEVAS PELÍCULAS Y SUBIENDO A GITHUB
echo ======================================================
echo.

:: 1. Navegar a la carpeta exacta de tu proyecto
cd /d "d:\pelixplus"

:: 2. Agregar todos los archivos nuevos o modificados
echo [1/3] Buscando cambios en la carpeta...
git add .

:: 3. Guardar los cambios (Commit) con fecha y hora automática
echo [2/3] Guardando cambios locales...
set "timestamp=%DATE% %TIME%"
git commit -m "Nueva película agregada - %timestamp%"

:: 4. Subir a GitHub (Intenta 'main', si falla intenta 'master')
echo [3/3] Subiendo a GitHub...
git push origin main || git push origin master

echo.
echo ======================================================
echo   ¡ÉXITO! TU PÁGINA SE ESTÁ ACTUALIZANDO
echo ======================================================
echo.
echo Esta ventana se cerrará en 5 segundos...
timeout /t 5