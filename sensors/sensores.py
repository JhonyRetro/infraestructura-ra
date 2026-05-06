import asyncio
import aiohttp
import random
import time
import json

estadisticas = {"enviados": 0, "errores": 0}


async def sensor_node(session, sensor_id, endpoint_url, sleep_time):
    http_method = random.choice(["GET", "POST"])

    while True:
        datos = {
            "temperatura": round(random.uniform(15.0, 35.0), 2),
            "humedad": round(random.uniform(30.0, 80.0), 2),
            "co2": round(random.uniform(400.0, 1200.0), 2),
            "volatiles": round(random.uniform(0.0, 50.0), 2)
        }

        payload = {
            "sensor_id": sensor_id,
            "timestamp": time.time(),
            "datos": datos
        }

        try:
            if http_method == "POST":
                async with session.post(endpoint_url, json=payload, timeout=2) as response:
                    status = response.status
                print(sensor_id, datos)
            else:
                async with session.get(endpoint_url, params={"data": json.dumps(payload)}, timeout=2) as response:
                    status = response.status
                print(sensor_id, "GET")

            estadisticas["enviados"] += 1

        except Exception:
            estadisticas["errores"] += 1

        await asyncio.sleep(sleep_time)


async def delayed_start(session, sensor_id, endpoint, sleep_time, max_delay):
    await asyncio.sleep(random.uniform(0, max_delay))
    await sensor_node(session, sensor_id, endpoint, sleep_time)


async def monitor_estadisticas():
    while True:
        await asyncio.sleep(5)
        print(
            f"[{time.strftime('%X')}] Estado red - Éxitos: {estadisticas['enviados']} | Bloqueos/Pérdidas: {estadisticas['errores']}")


async def main():
    endpoint_url = "http://localhost:3000/record"  # Cambiar por IP de lab
    sensores = 19737
    tiempo_dormido = 300.0

    connector = aiohttp.TCPConnector(limit=10)

    print(f"Preparando {sensores} sensores simulados...")

    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [asyncio.create_task(monitor_estadisticas())]

        for i in range(sensores):
            sensor_id = f"sensor-{i}"

            tasks.append(
                asyncio.create_task(
                    delayed_start(session, sensor_id, endpoint_url, tiempo_dormido, max_delay=7200.0)
                )
            )

        await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSimulation closed")