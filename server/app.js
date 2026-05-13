const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const serveIndex = require('serve-index');
const soap = require('soap');
const fs = require('fs');

const indexModule = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexModule.router);
app.use('/users', usersRouter);
app.use('/logs', serveIndex(path.join(__dirname, 'public/logs')));
app.use('/logs', express.static(path.join(__dirname, 'public/logs')));

const port = process.env.PORT || 3000;

const wsdlPath = path.join(__dirname, 'docs/service.wsdl');

app.use(function (req, res, next) {
    next(createError(404));
});

app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

const server = app.listen(port, () => {
    console.log(`Express Server is running on port ${port}`);
});

if (fs.existsSync(wsdlPath)) {
    const wsdlXml = fs.readFileSync(wsdlPath, 'utf8');

    soap.listen(server, '/wsdl', indexModule.soapService, wsdlXml, function(){
        console.log(`Servidor SOAP activado. WSDL disponible en http://localhost:${port}/wsdl?wsdl`);
    });
} else {
    console.error(`¡ATENCIÓN! No se encontró el archivo WSDL en la ruta: ${wsdlPath}`);
}

module.exports = app;