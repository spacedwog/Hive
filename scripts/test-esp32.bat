@echo off
REM Script de teste rápido ESP32
REM Execute este script para testar a conexão

echo ========================================
echo      TESTE RAPIDO - ESP32
echo ========================================
echo.

set ESP32_IP=192.168.15.188

echo [1/4] Testando conectividade (Ping)...
ping -n 2 %ESP32_IP% | find "TTL=" > nul
if %errorlevel%==0 (
    echo   [OK] ESP32 responde ao ping
) else (
    echo   [ERRO] ESP32 nao responde ao ping
    echo   - Verifique se esta ligado
    echo   - Verifique se esta na mesma rede
    goto :end
)
echo.

echo [2/4] Testando porta HTTP 80...
powershell -Command "Test-NetConnection -ComputerName %ESP32_IP% -Port 80 -InformationLevel Quiet" > nul
if %errorlevel%==0 (
    echo   [OK] Porta 80 esta aberta
) else (
    echo   [ERRO] Porta 80 nao responde
    echo   - Servidor HTTP pode nao estar rodando
    goto :end
)
echo.

echo [3/4] Testando endpoint /status...
curl -s -o nul -w "%%{http_code}" http://%ESP32_IP%/status > %temp%\http_code.txt
set /p HTTP_CODE=<%temp%\http_code.txt
del %temp%\http_code.txt

if "%HTTP_CODE%"=="200" (
    echo   [OK] Endpoint /status retorna 200
    echo.
    echo [4/4] Resposta completa:
    curl -s http://%ESP32_IP%/status
    echo.
    echo.
    echo ========================================
    echo   RESULTADO: TUDO FUNCIONANDO!
    echo ========================================
) else (
    echo   [ERRO] Endpoint retorna %HTTP_CODE%
    echo.
    if "%HTTP_CODE%"=="404" (
        echo   DIAGNOSTICO: Firmware incorreto ou nao carregado
        echo   SOLUCAO: Carregue o firmware correto no ESP32
        echo.
        echo   Passos:
        echo   1. Conecte ESP32 via USB
        echo   2. Abra Arduino IDE
        echo   3. Abra: hive_mind\esp32_cam\esp32_cam.ino
        echo   4. Configure WiFi no codigo
        echo   5. Upload
        echo.
        echo   Ver detalhes em: SOLUTION_REFLASH_FIRMWARE.md
    ) else if "%HTTP_CODE%"=="401" (
        echo   DIAGNOSTICO: Problema de autenticacao
        echo   SOLUCAO: Verifique credenciais no firmware
    ) else (
        echo   DIAGNOSTICO: Erro HTTP desconhecido
        echo   SOLUCAO: Verifique logs do ESP32 via Serial Monitor
    )
    echo.
    echo ========================================
    echo   RESULTADO: PRECISA CORRECAO
    echo ========================================
)
echo.

:end
echo.
echo Para diagnostico completo, execute:
echo   node scripts\diagnose-esp32.cjs
echo.
pause
