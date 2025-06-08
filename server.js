const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
// Configuración CORS flexible para desarrollo
app.use(cors({
  origin: function (origin, callback) {
    // Permitir cualquier origen en desarrollo
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/admin', adminRoutes);

// Basic route
// Ruta básica para /api (útil para pruebas y evitar 404)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API de Blockchain Voting Platform funcionando correctamente',
    endpoints: [
      '/api/auth',
      '/api/admin',
      '/api/elections'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Verificación básica de funcionamiento
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working correctly' });
});

// Start server
const PORT = 3333; // Puerto fijo para evitar conflictos

// Escuchar explícitamente en todas las interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Test the connection by visiting http://localhost:${PORT}/test`);
});