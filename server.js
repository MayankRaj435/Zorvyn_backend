const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.port;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀  Zorvyn Finance API Server                         ║
║                                                          ║
║   Environment : ${env.nodeEnv.padEnd(39)}║
║   Port        : ${String(PORT).padEnd(39)}║
║   API Base    : http://localhost:${PORT}/api${' '.repeat(19)}║
║   API Docs    : http://localhost:${PORT}/api-docs${' '.repeat(14)}║
║   Health      : http://localhost:${PORT}/api/health${' '.repeat(13)}║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    const { closeDatabase } = require('./src/config/database');
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    const { closeDatabase } = require('./src/config/database');
    closeDatabase();
    process.exit(0);
  });
});

module.exports = server;

