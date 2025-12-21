import socket

HOST = '192.168.1.13'  # La IP de la máquina donde corre el servidor
PORT = 9999         # Debe ser el mismo puerto que el servidor

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

try:
    # 1. Conectar al servidor
    client.connect((HOST, PORT))
    print(f"[CONECTADO] Conectado exitosamente al servidor en {HOST}:{PORT}")

    # 2. Recibir el mensaje de bienvenida del servidor y mostrarlo
    server_response = client.recv(1024).decode('utf-8')
    print(f"[SERVIDOR] {server_response}")

    # 3. Enviar un mensaje al servidor
    client_message = "Hola servidor, soy un cliente!"
    client.send(client_message.encode('utf-8'))

except ConnectionRefusedError:
    print("[ERROR] No se pudo conectar al servidor. ¿Está en ejecución?")
finally:
    # 4. Cerrar la conexión
    client.close()
    print("[DESCONECTADO] Conexión cerrada.")