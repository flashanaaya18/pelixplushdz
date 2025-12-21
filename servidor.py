import socket
import threading

def handle_client(client_socket, address):
    """
    Maneja la conexión para un cliente individual.
    """
    print(f"[NUEVA CONEXIÓN] {address} conectado.")

    try:
        # Enviar un mensaje de bienvenida al cliente
        welcome_message = "¡Bienvenido al servidor! Gracias por conectarte."
        client_socket.send(welcome_message.encode('utf-8'))

        # Recibir mensaje del cliente
        data = client_socket.recv(1024)
        if data:
            print(f"[{address}] dice: {data.decode('utf-8')}")

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        # Cerrar la conexión con el cliente
        print(f"[CONEXIÓN CERRADA] {address}.")
        client_socket.close()

HOST = '0.0.0.0'    # Escuchar en todas las interfaces de red disponibles
PORT = 9999         # Puerto para escuchar

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen()
print(f"[ESCUCHANDO] El servidor está escuchando en {HOST}:{PORT}")

while True:
    client, addr = server.accept()
    thread = threading.Thread(target=handle_client, args=(client, addr))
    thread.start()
    print(f"[CONEXIONES ACTIVAS] {threading.active_count() - 1}")