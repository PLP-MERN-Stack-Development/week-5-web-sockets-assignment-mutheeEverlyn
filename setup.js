const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Setting up environment variables...');

// Server .env
const serverEnv = `PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=${Math.random().toString(36).substring(2, 15)}
CLIENT_URL=http://localhost:5173`;

// Client .env
const clientEnv = `VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000`;

// Create server .env
fs.writeFileSync(path.join(__dirname, 'server', '.env'), serverEnv);
console.log('Created server/.env');

// Create client .env
fs.writeFileSync(path.join(__dirname, 'client', '.env'), clientEnv);
console.log('Created client/.env');

console.log('\nEnvironment setup complete!');
console.log('\nNext steps:');
console.log('1. Install server dependencies:');
console.log('   cd server && npm install');
console.log('2. Install client dependencies:');
console.log('   cd client && npm install');
console.log('3. Start the development servers:');
console.log('   - In server directory: npm run dev');
console.log('   - In client directory: npm run dev');

rl.close(); 