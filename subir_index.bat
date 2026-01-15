@echo off
title Subir SOLO index.html
color 0B

:: Ir a la carpeta
cd /d "d:\pelixplus"

echo Subiendo unicamente index.html...
git add index.html
git commit -m "Actualizacion rapida index.html"
git push origin main || git push origin master

echo Completado.
timeout /t 3