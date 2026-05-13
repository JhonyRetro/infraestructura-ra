import paho.mqtt.client as mqtt
from crate import client
import json

db_connection = client.connect("localhost:4200", username="crate")
cursor = db_connection.cursor()

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode('utf-8'))

        sensor_id = payload.get('id_nodo') or payload.get('sensor_id')
        ts = payload.get('timestamp')
        datos = payload.get('datos', payload)

        query = """
                INSERT INTO sensores_datos (sensor_id, "timestamp", temperatura, humedad, co2, volatiles)
                VALUES (?, ?, ?, ?, ?, ?) \
                """
        valores = (
            sensor_id,
            ts,
            datos.get('temperatura'),
            datos.get('humedad'),
            datos.get('co2'),
            datos.get('volatiles')
        )

        cursor.execute(query, valores)
        print(f"Guardado en CrateDB: {sensor_id}")

    except Exception as e:
        print(f"Error procesando mensaje: {e}")


mqtt_client = mqtt.Client()
mqtt_client.on_message = on_message

mqtt_client.connect("localhost", 1883, 60)
mqtt_client.subscribe("sensores/datos")

print("Middleware escuchando a Mosquitto y conectado a CrateDB...")
mqtt_client.loop_forever()