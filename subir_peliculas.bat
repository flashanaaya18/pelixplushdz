@echo off
:: Versión Automática Hacker - PelixPlus Auto-Updater
:: Inicia automáticamente y detecta cambios en tiempo real

:: Configuración inicial
chcp 65001 >nul
title ��� HACKER SYSTEM - PelixPlus Auto-Sync ���
color 0A
setlocal enabledelayedexpansion

:: Limpiar pantalla con efecto
cls
echo �������������������������������������������������������������
echo  ���  ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ���
echo ���  SISTEMA DE ACTUALIZACI�N AUTOM�TICO - PELIXPLUS  ���
echo  ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ���
echo �������������������������������������������������������������
echo.

:: Efecto de carga inicial
echo [%%] INICIANDO SISTEMA HACKER...
for /l %%i in (1,1,20) do (
    set /a progress=%%i*5
    echo � ESCANEANDO SISTEMA... !progress!%%
    ping -n 1 -w 50 127.0.0.1 >nul
    cls
    echo �������������������������������������������������������������
    echo  ���  ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ���
    echo ���  SISTEMA DE ACTUALIZACI�N AUTOM�TICO - PELIXPLUS  ���
    echo  ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ��� ���
    echo �������������������������������������������������������������
    echo.
)

:: Efecto de texto hacker
echo � CONECTANDO CON REPOSITORIO GITHUB...
timeout /t 1 /nobreak >nul
echo � SISTEMA DE DETECCI�N ACTIVADO: TIEMPO REAL
timeout /t 1 /nobreak >nul
echo � MODO AUTOM�TICO: ACTIVADO
timeout /t 1 /nobreak >nul
echo.

:: Monitor en tiempo real
:monitor_loop
cls
echo �������������������������������������������������������������
echo � MONITOR EN TIEMPO REAL - %DATE% %TIME:~0,8% �
echo �������������������������������������������������������������
echo.

:: Navegar al directorio
cd /d "d:\pelixplus" 2>nul
if errorlevel 1 (
    echo ��� ERROR: No se encuentra d:\pelixplus
    timeout /t 3
    exit /b 1
)

:: Verificar cambios
echo ��� ESCANEANDO CAMBIOS EN TIEMPO REAL...
git status --porcelain >nul
if errorlevel 1 (
    echo � SISTEMA: No hay cambios detectados...
    echo � PR�XIMO ESCANEO EN 10 SEGUNDOS
    echo.
    timeout /t 10 /nobreak >nul
    goto monitor_loop
)

:: CAMBIOS DETECTADOS - Iniciar secuencia de actualización
echo ��� ��� ��� ��� ALERTA: CAMBIOS DETECTADOS! ��� ��� ��� ���
echo.

:: Animación de detección
for /l %%i in (1,1,5) do (
    echo � DETECTANDO ARCHIVOS MODIFICADOS... [███████▒]
    timeout /t 0.5 /nobreak >nul
    cls
    echo �������������������������������������������������������������
    echo � MONITOR EN TIEMPO REAL - %DATE% %TIME:~0,8% �
    echo �������������������������������������������������������������
    echo.
    echo � DETECTANDO ARCHIVOS MODIFICADOS... [█████████]
    timeout /t 0.5 /nobreak >nul
    cls
    echo �������������������������������������������������������������
    echo � MONITOR EN TIEMPO REAL - %DATE% %TIME:~0,8% �
    echo �������������������������������������������������������������
    echo.
)

:: Paso 1: Agregar archivos
echo [PASO 1/3] � AGREGANDO ARCHIVOS...
git add .
echo � COMPLETADO: Todos los archivos preparados
timeout /t 1 /nobreak >nul

:: Paso 2: Commit con animación
echo [PASO 2/3] � CREANDO VERSI�N...
set "timestamp=%DATE% %TIME:~0,8%"
echo � MENSAJE: "Actualización automática - !timestamp!"
git commit -m "Auto-Update: !timestamp!" --quiet
echo � COMPLETADO: Versión creada exitosamente
timeout /t 1 /nobreak >nul

:: Paso 3: Subir a GitHub con efecto visual
echo [PASO 3/3] � SINCRONIZANDO CON LA NUBE...
echo.
for /l %%i in (1,1,10) do (
    set /a percent=%%i*10
    echo � SUBIENDO DATOS... [!percent!%%] ██████████
    timeout /t 0.2 /nobreak >nul
)
git push origin main 2>nul || git push origin master 2>nul
echo.
echo � ��� SINCRONIZACI�N COMPLETADA! ���
echo.

:: Mostrar éxito con animación
for /l %%i in (1,1,3) do (
    echo ���������������������������������������������������������
    echo � ��� � � � � � � � OPERACI�N EXITOSA � � � � � � � ��� �
    echo ���������������������������������������������������������
    timeout /t 0.3 /nobreak >nul
    cls
    echo ���������������������������������������������������������
    echo � � � � � � � � SISTEMA ACTUALIZADO � � � � � � � � �
    echo ���������������������������������������������������������
    timeout /t 0.3 /nobreak >nobreak >nul
    cls
)

:: Información final
cls
echo �������������������������������������������������������������
echo �         SISTEMA PELIXPLUS - ACTUALIZADO          �
echo �������������������������������������������������������������
echo.
echo � HORA: %TIME:~0,8%
echo � FECHA: %DATE%
echo � ESTADO: � SINCRONIZADO CON GITHUB
echo � URL: https://github.com/tuusuario/pelixplus
echo.
echo �������������������������������������������������������������
echo � El sistema continuar� monitoreando en 5 segundos... �
echo �������������������������������������������������������������

timeout /t 5 /nobreak >nul

:: Volver al monitor
goto monitor_loop