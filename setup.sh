#!/bin/bash
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, ejecuta este script con sudo."
  exit 1
fi

NODE_BINARY="/home/alumno/.nvm/versions/node/v24.15.0/bin/node"
NODE_APP="./server/"
HAPROXY_CONF="./server/haproxy.cfg"
MOSQUITTO_CONF="./broker/mosquitto.conf"
GRAFANA_BINARY="/usr/share/grafana/bin/grafana"
GRAFANA_CONF="./service/grafana.ini"

echo "Iniciando despliegue de infraestructura..."

echo "[1/5] Deteniendo servicios del sistema..."
systemctl stop haproxy 2>/dev/null
systemctl stop mosquitto 2>/dev/null
systemctl stop grafana-server 2>/dev/null

echo "[2/5] Matando procesos residuales en puertos clave..."
PORTS=(80 1883 3000 3001 8080)
for port in "${PORTS[@]}"; do
    fuser -k ${port}/tcp >/dev/null 2>&1
    echo "  -> Puerto $port liberado."
done

sleep 2

echo "[3/5] Copiando archivos de configuración a sus rutas por defecto..."

if [ -f "$HAPROXY_CONF" ]; then
    cp "$HAPROXY_CONF" /etc/haproxy/haproxy.cfg
    chmod 644 /etc/haproxy/haproxy.cfg
    echo "  -> HAProxy config actualizada."
fi

if [ -f "$MOSQUITTO_CONF" ]; then
    cp "$MOSQUITTO_CONF" /etc/mosquitto/mosquitto.conf
    chmod 644 /etc/mosquitto/mosquitto.conf
    echo "  -> Mosquitto config actualizada."
fi

if [ -f "$GRAFANA_CONF" ]; then
    cp "$GRAFANA_CONF" /etc/grafana/grafana.ini
    chmod 644 /etc/grafana/grafana.ini
    echo "  -> Grafana config actualizada."
fi

echo "[4/5] Levantando servicios con la nueva configuración..."
systemctl start mosquitto
sudo -u alumno bash -c "sudo nohup $GRAFANA_BINARY server --config=/etc/grafana/grafana.ini --homepath=/usr/share/grafana > ./service/grafana.log 2>&1 &"
systemctl start haproxy

if systemctl is-active --quiet haproxy; then
    echo "  -> Servicios levantados correctamente."
else
    echo "HAProxy falló al arrancar. Revisa la sintaxis de haproxy.cfg"
fi

echo "[5/5] Levantando instancias de Node.js en puertos 3000 y 3001..."

if [ -d "$NODE_APP" ]; then
    cd "$NODE_APP" || exit

    export PORT=3000
    nohup $NODE_BINARY app.js > node_3000.log 2>&1 &
    echo "  -> Nodo 1 (Puerto 3000) en ejecución [PID: $!]"

    export PORT=3001
    nohup $NODE_BINARY app.js > node_3001.log 2>&1 &
    echo "  -> Nodo 2 (Puerto 3001) en ejecución [PID: $!]"
else
    echo "Error: No se encontró la ruta del proyecto Node ($NODE_APP)"
fi

echo "¡Despliegue finalizado!"