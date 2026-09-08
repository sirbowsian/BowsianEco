const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'client')));

// Game state
const players = new Map();
const npcs = [
  { id: 'socrates', name: 'Socrates', x: 400, y: 300, role: 'philosopher', quest: 'Seek wisdom in the marketplace' },
  { id: 'leonidas', name: 'Leonidas', x: 600, y: 250, role: 'warrior', quest: 'Train in the arena' },
  { id: 'priestess', name: 'Priestess of Athena', x: 200, y: 400, role: 'priest', quest: 'Make an offering at the temple' }
];

const worldRegions = [
  { name: 'Attika', x: 0, y: 0, width: 800, height: 600, description: 'Starting region with olive groves and marble quarries' },
  { name: 'Sparta Highlands', x: 800, y: 0, width: 600, height: 400, description: 'Rugged mountains and military camps' },
  { name: 'Delphi Sanctum', x: 200, y: 600, width: 500, height: 400, description: 'Oracle city with religious quests' },
  { name: 'Cyclades Archipelago', x: 700, y: 400, width: 800, height: 600, description: 'Island-hopping zone with sailing and pirates' }
];

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Initialize player
  const player = {
    id: socket.id,
    username: `Hero_${Math.floor(Math.random() * 1000)}`,
    x: Math.random() * 700 + 50,
    y: Math.random() * 500 + 50,
    level: 1,
    experience: 0,
    health: 100,
    maxHealth: 100,
    patronGod: 'Athena',
    skills: {
      warfare: 1,
      archery: 1,
      sailing: 1,
      smithing: 1,
      piety: 1
    },
    divineFavor: {
      Athena: 0,
      Zeus: 0,
      Poseidon: 0
    },
    hubris: 0,
    currentRegion: 'Attika'
  };
  
  players.set(socket.id, player);
  
  // Send initial game state
  socket.emit('init', {
    playerId: socket.id,
    players: Array.from(players.values()),
    npcs: npcs,
    regions: worldRegions
  });
  
  // Broadcast new player to others
  socket.broadcast.emit('playerJoined', player);
  
  // Handle player movement
  socket.on('move', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = data.x;
      player.y = data.y;
      
      // Update region based on position
      for (const region of worldRegions) {
        if (player.x >= region.x && player.x <= region.x + region.width &&
            player.y >= region.y && player.y <= region.y + region.height) {
          if (player.currentRegion !== region.name) {
            player.currentRegion = region.name;
            socket.emit('regionChanged', { region: region.name, description: region.description });
          }
          break;
        }
      }
      
      socket.broadcast.emit('playerMoved', { id: socket.id, x: player.x, y: player.y });
    }
  });
  
  // Handle skill training
  socket.on('trainSkill', (skillName) => {
    const player = players.get(socket.id);
    if (player && player.skills[skillName]) {
      const expGain = 10;
      player.experience += expGain;
      player.skills[skillName] += 0.1;
      
      // Level up check
      if (player.experience >= player.level * 100) {
        player.level++;
        player.experience = 0;
        player.maxHealth += 10;
        player.health = player.maxHealth;
        socket.emit('levelUp', { level: player.level, maxHealth: player.maxHealth });
      }
      
      socket.emit('skillUpdate', { 
        skill: skillName, 
        level: player.skills[skillName],
        experience: player.experience,
        level_total: player.level
      });
      
      // Divine favor gain for piety training
      if (skillName === 'piety') {
        player.divineFavor[player.patronGod] += 5;
        socket.emit('favorUpdate', { god: player.patronGod, favor: player.divineFavor[player.patronGod] });
      }
    }
  });
  
  // Handle NPC interaction
  socket.on('interactNPC', (npcId) => {
    const npc = npcs.find(n => n.id === npcId);
    if (npc) {
      socket.emit('npcDialogue', {
        npcName: npc.name,
        dialogue: `Greetings, hero! ${npc.quest}`,
        options: ['Accept Quest', 'Ask about the gods', 'Leave']
      });
    }
  });
  
  // Handle chat
  socket.on('chatMessage', (message) => {
    const player = players.get(socket.id);
    if (player) {
      io.emit('chatMessage', {
        username: player.username,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🏛️  Aegean: Oaths of Olympus server running on port ${PORT}`);
  console.log(`🌊 Sail the wine-dark sea at http://localhost:${PORT}`);
});
