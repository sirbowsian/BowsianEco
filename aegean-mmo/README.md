# 🏛️ AEGEAN: OATHS OF OLYMPUS

**A Greek Mythology Open-World MMO**  
*Sail the wine-dark sea. Earn the favor of gods. Become the myth they will never forget.*

## Overview

AEGEAN: Oaths of Olympus is a multiplayer online game inspired by:
- **RuneScape**: Deep skill-based progression, crafting, and economy
- **Assassin's Creed Odyssey**: Ancient Greek world, naval exploration, and mythic combat

## Features Implemented

### Core Gameplay
- ✅ **Open World Exploration** - Explore 4 distinct regions of ancient Greece
- ✅ **Real-time Multiplayer** - See and interact with other players
- ✅ **Skill System** - Train Warfare, Archery, Sailing, Smithing, and Piety
- ✅ **Level Progression** - Gain experience and level up your hero
- ✅ **Divine Favor System** - Earn blessings from Athena, Zeus, and Poseidon
- ✅ **NPC Interactions** - Meet famous Greeks like Socrates and Leonidas
- ✅ **Quest System** - Accept and complete mythological quests
- ✅ **Chat System** - Communicate in the Agora with other heroes

### World Regions
1. **Attika** - Starting region with olive groves and marble quarries
2. **Sparta Highlands** - Rugged mountains and military camps
3. **Delphi Sanctum** - Oracle city with religious quests
4. **Cyclades Archipelago** - Island-hopping zone with sailing and pirates

### Skills to Master
- ⚔️ **Warfare** - Swords, spears, and battlefield combat
- 🏹 **Archery** - Bows, javelins, and ranged precision
- ⛵ **Sailing** - Navigate the Aegean Sea
- 🔨 **Smithing** - Forge legendary weapons and armor
- 🙏 **Piety** - Earn divine favor from the gods

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

```bash
cd aegean-mmo
npm install
```

### Running the Game

```bash
npm start
```

Then open your browser to: **http://localhost:3000**

## Controls

| Key | Action |
|-----|--------|
| **WASD** or **Arrow Keys** | Move your character |
| **T** | Train a random skill (+10 EXP) |
| **Click on NPCs** | Interact and accept quests |
| **Enter** | Open chat |
| **Mouse Click** | Interact with world |

## Architecture

```
aegean-mmo/
├── server.js          # Node.js + Socket.io game server
├── client/
│   ├── index.html     # Game UI with Greek-themed styling
│   └── game.js        # Canvas-based game client
├── package.json       # Dependencies
└── README.md          # This file
```

## Technical Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Graphics**: 2D canvas rendering with Greek aesthetic
- **Networking**: Real-time WebSocket communication

## Future Enhancements (Vision)

Based on the full design document, here are planned features:

### Naval Gameplay
- 🚢 Trireme ship combat and boarding
- 🌊 Sea monster encounters (Scylla, Charybdis)
- ⚓ Player-owned ships with upgrades
- 🏴‍☠️ Pirate ambushes and merchant escorts

### Expanded World
- 🏛️ Mount Olympus endgame zone
- 💀 The Underworld dungeon complex
- 🐂 Cretan Labyrinth raid
- 🌋 Forge of Hephaestus crafting dungeon

### Divine System
- ⚡ Hubris meter with consequences
- 🎁 14 patron gods with unique blessings
- 🏆 Divine trials and ascension paths
- 😤 Nemesis agents for hubristic heroes

### Social Features
- 🤝 Guilds (Symmachies)
- 💒 Player marriages and oath bonds
- 🏘️ Player housing and estates
- 🎭 Festivals (Panathenaia, Dionysia)

### Endgame Raids
- 🦁 Twelve Labors weekly rotation
- 🐉 Titan awakening seasonal events
- ⚔️ Siege of Troy large-scale battles
- 🍎 Golden Apple faction conflicts

## Join the Adventure

Open multiple browser windows to experience multiplayer! Each window represents a different hero exploring the sunlit seas of ancient Greece.

---

*"The gods have stopped speaking. The threads of fate are torn. You… carry a mark not meant for mortals."*

**Become the legend. Live the myth.**
