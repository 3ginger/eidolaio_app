// Vercel Serverless Function Entry Point
// This file wraps the Express app for Vercel serverless deployment

const app = require('../api/dist/index.js').default;

module.exports = app;
