const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
require('dotenv').config();

// Importar el manejador centralizado de errores
const { globalErrorHandler } = require('./middlewares/errorHandler');

// Importar rutas
const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const syncRoutes = require('./routes/sync');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

// Importar nuevas rutas administrativas
const activityLogRoutes = require('./routes/activityLog');
const electoralCategoryRoutes = require('./routes/electoralCategory');
const electionSettingsRoutes = require('./routes/electionSettings');
const adminVoterRoutes = require('./routes/adminVoter');
const candidateAdminRoutes = require('./routes/candidateAdmin');
const electionAdminRoutes = require('./routes/electionAdmin');
const statisticsRoutes = require('./routes/statistics');

// Load environment variables
dotenv.config();

// Connect to MongoDB
console.log('Intentando conectar a MongoDB...');
connectDB().then(() => {
  console.log('Conexión a MongoDB establecida con éxito');
}).catch(err => {
  console.error('Error al conectar a MongoDB:', err.message);
});

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware básicos
app.use(cors({
  origin: '*', // Allow all origins in development mode
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Origin', 'Authorization']
}));
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Nuevas rutas administrativas
app.use('/api/admin/activity', activityLogRoutes);
app.use('/api/admin/categories', electoralCategoryRoutes);
app.use('/api/admin/settings', electionSettingsRoutes);
app.use('/api/admin/voters', adminVoterRoutes);
app.use('/api/admin/candidates', candidateAdminRoutes);
app.use('/api/admin/elections', electionAdminRoutes);
app.use('/api/admin/statistics', statisticsRoutes);

// Ruta de estado para verificar si el servidor está en funcionamiento
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Manejador centralizado de errores
app.use(globalErrorHandler);

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=== Servidor Express iniciado y escuchando en el puerto ${PORT} en todas las interfaces ===`);
  console.log(`La API está disponible en: http://localhost:${PORT}/api`);
  console.log(`También puedes acceder usando: http://127.0.0.1:${PORT}/api`);
});

server.on('error', (error) => {
  console.error('Error al iniciar el servidor Express:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Intente con otro puerto.`);
  }
});

module.exports = app;
