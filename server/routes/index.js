const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');

const mqttClient = mqtt.connect('mqtt://localhost:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
});

mqttClient.on('error',(err) => {
    console.log('MQTT Error:', err.message || err);
});

router.get('/', function(req, res, next) {
    res.render('index', { title: 'Data-Logger' });
});

function procesarDatos(id_nodo, temperatura, humedad, co2, volatiles) {
    const now = new Date();

    const mensajeMQTT = {
        id_nodo: id_nodo,
        timestamp: now.getTime(),
        temperatura: parseFloat(temperatura),
        humedad: parseFloat(humedad),
        co2: parseFloat(co2),
        volatiles: parseFloat(volatiles)
    };

    mqttClient.publish('sensores/datos', JSON.stringify(mensajeMQTT), (err) => {
        if (err) console.log('Error al publicar en MQTT:', err.message);
        else console.log('Publicado en MQTT (SOAP):', JSON.stringify(mensajeMQTT));
    });

    const logsDir = path.join(__dirname, '../public/logs/');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const mesActual = now.getMonth() + 1;
    const logfile_name = path.join(logsDir, id_nodo + "-" + now.getFullYear() + "-" + mesActual + "-" + now.getDate() + '.csv');

    const content = `${id_nodo};${now.getTime()};${temperatura};${humedad};${co2};${volatiles}\r\n`;

    fs.stat(logfile_name, function(err, stat) {
        if(err == null) {
            append2file(logfile_name, content);
        } else if(err.code === 'ENOENT') {
            let headers = 'id_nodo;timestamp;temperatura;humedad;CO2;volatiles\r\n';
            append2file(logfile_name, headers + content);
        } else {
            console.log('Some other error: ', err.code);
        }
    });
}

function append2file(file2append, content){
    fs.appendFile(file2append, content, function (err) {
        if (err) throw err;
    });
}
// =======================
// TOKEN BUCKET
// =======================
let tokens = 10;
const MAX_TOKENS = 10;
const REFILL_INTERVAL_MS = 1000;

setInterval(() => {
    if (tokens < MAX_TOKENS) {
        tokens++;
    }
}, REFILL_INTERVAL_MS);

function tokenBucketMiddleware(req, res, next) {
    if (tokens > 0) {
        tokens--;
        console.log(`Token Bucket: petición permitida. Tokens restantes: ${tokens}`);
        return next();
    }

    console.log('Token Bucket: petición bloqueada');
    return res.status(429).json({
        error: 'Demasiadas peticiones. Inténtalo más tarde.'
    });
}

router.post('/record', tokenBucketMiddleware, (req, res) => {
    const body = req.body;

    if (body && body.sensor_id && body.datos) {
        procesarDatos(
            body.sensor_id,
            body.datos.temperatura,
            body.datos.humedad,
            body.datos.co2,
            body.datos.volatiles
        );
        res.status(200).json({ status: "Datos recibidos vía POST" });
    } else {
        res.status(400).json({ error: "Payload inválido" });
    }
});

router.get('/record', tokenBucketMiddleware, function(req, res, next) {
    if (req.query.data) {
        try {
            const payload = JSON.parse(req.query.data);
            if (payload && payload.sensor_id && payload.datos) {
                procesarDatos(
                    payload.sensor_id,
                    payload.datos.temperatura,
                    payload.datos.humedad,
                    payload.datos.co2,
                    payload.datos.volatiles
                );
                return res.status(200).json({ status: "Datos recibidos vía GET" });
            }
        } catch (error) {
            return res.status(400).json({ error: "JSON inválido en GET" });
        }
    }

    res.render('index', { title: 'Data-Logger' });
});

const soapService = {
    SensorService: {
        SensorPort: {
            RecordData: function(args) {
                const id_nodo = args.sensor_id;
                const temperatura = args.temperatura;
                const humedad = args.humedad;
                const co2 = args.co2;
                const volatiles = args.volatiles;

                procesarDatos(id_nodo, temperatura, humedad, co2, volatiles);

                return {
                    status: "Datos recibidos mediante SOAP y procesados correctamente."
                };
            }
        }
    }
};

module.exports = {
    router,
    soapService
};