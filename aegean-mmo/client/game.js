// AEGEAN: Oaths of Olympus - Game Client
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Socket connection
const socket = io();

// Game state
let playerId = null;
let players = new Map();
let npcs = [];
let regions = [];
let myPlayer = null;

// Input handling
const keys = {};
let moveInterval = null;

// Camera
const camera = { x: 0, y: 0 };

// Initialize game
socket.on('init', (data) => {
    playerId = data.playerId;
    myPlayer = data.players.find(p => p.id === playerId);
    
    data.players.forEach(p => {
        if (p.id !== playerId) {
            players.set(p.id, p);
        }
    });
    
    npcs = data.npcs;
    regions = data.regions;
    
    updateUI();
    gameLoop();
});

// Handle other players
socket.on('playerJoined', (player) => {
    if (player.id !== playerId) {
        players.set(player.id, player);
    }
});

socket.on('playerMoved', (data) => {
    const player = players.get(data.id);
    if (player) {
        player.x = data.x;
        player.y = data.y;
    }
});

socket.on('playerLeft', (id) => {
    players.delete(id);
});

// Handle skill updates
socket.on('skillUpdate', (data) => {
    updateSkillUI(data.skill, data.level);
    document.getElementById('exp-display').textContent = `${data.experience}/${myPlayer.level * 100}`;
    document.getElementById('level-display').textContent = data.level_total;
    myPlayer.experience = data.experience;
    myPlayer.level = data.level_total;
});

socket.on('levelUp', (data) => {
    myPlayer.level = data.level;
    myPlayer.maxHealth = data.maxHealth;
    myPlayer.health = data.maxHealth;
    
    // Show level up notification
    const levelDisplay = document.getElementById('level-display');
    levelDisplay.classList.add('level-up');
    setTimeout(() => levelDisplay.classList.remove('level-up'), 3000);
    
    updateUI();
});

socket.on('favorUpdate', (data) => {
    document.getElementById(`favor-${data.god.toLowerCase()}`).textContent = data.favor;
});

socket.on('regionChanged', (data) => {
    document.getElementById('region-name').textContent = `🏛️ ${data.region}`;
    document.getElementById('region-desc').textContent = data.description;
    document.getElementById('region-display').textContent = data.region;
});

socket.on('npcDialogue', (data) => {
    showDialogue(data.npcName, data.dialogue, data.options);
});

socket.on('chatMessage', (data) => {
    addChatMessage(data.username, data.message, data.timestamp);
});

// Input handling
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === 'Enter' && document.activeElement !== document.getElementById('chat-input')) {
        document.getElementById('chat-input').focus();
    }
    
    if (e.key.toLowerCase() === 't') {
        trainRandomSkill();
    }
    
    startMoving();
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    stopMoving();
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Check NPC clicks
    npcs.forEach(npc => {
        const screenX = npc.x - camera.x + canvas.width / 2;
        const screenY = npc.y - camera.y + canvas.height / 2;
        const dist = Math.sqrt((clickX - screenX) ** 2 + (clickY - screenY) ** 2);
        
        if (dist < 40) {
            socket.emit('interactNPC', npc.id);
        }
    });
});

function startMoving() {
    if (!moveInterval) {
        moveInterval = setInterval(() => {
            let dx = 0, dy = 0;
            const speed = 5;
            
            if (keys['w'] || keys['arrowup']) dy -= speed;
            if (keys['s'] || keys['arrowdown']) dy += speed;
            if (keys['a'] || keys['arrowleft']) dx -= speed;
            if (keys['d'] || keys['arrowright']) dx += speed;
            
            if (dx !== 0 || dy !== 0) {
                myPlayer.x += dx;
                myPlayer.y += dy;
                
                // Keep in bounds
                myPlayer.x = Math.max(0, Math.min(1500, myPlayer.x));
                myPlayer.y = Math.max(0, Math.min(1000, myPlayer.y));
                
                socket.emit('move', { x: myPlayer.x, y: myPlayer.y });
            }
        }, 16);
    }
}

function stopMoving() {
    clearInterval(moveInterval);
    moveInterval = null;
}

function trainRandomSkill() {
    const skills = ['warfare', 'archery', 'sailing', 'smithing', 'piety'];
    const randomSkill = skills[Math.floor(Math.random() * skills.length)];
    socket.emit('trainSkill', randomSkill);
}

// Chat system
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = e.target.value.trim();
        if (message) {
            socket.emit('chatMessage', message);
            e.target.value = '';
        }
        e.target.blur();
    }
});

function addChatMessage(username, message, timestamp) {
    const chatMessages = document.getElementById('chat-messages');
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.innerHTML = `<span class="chat-timestamp">[${time}]</span> <span class="chat-username">${username}:</span> ${message}`;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Dialogue system
function showDialogue(npcName, text, options) {
    const panel = document.getElementById('dialogue-panel');
    document.getElementById('dialogue-npc').textContent = npcName;
    document.getElementById('dialogue-text').textContent = text;
    
    const optionsDiv = document.getElementById('dialogue-options');
    optionsDiv.innerHTML = '';
    
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-btn';
        btn.textContent = option;
        btn.onclick = () => {
            closeDialogue();
            // Handle dialogue choice (could send to server)
        };
        optionsDiv.appendChild(btn);
    });
    
    panel.style.display = 'block';
}

function closeDialogue() {
    document.getElementById('dialogue-panel').style.display = 'none';
}

// UI Updates
function updateUI() {
    if (!myPlayer) return;
    
    document.getElementById('level-display').textContent = myPlayer.level;
    document.getElementById('exp-display').textContent = `${myPlayer.experience}/${myPlayer.level * 100}`;
    document.getElementById('health-display').textContent = `${myPlayer.health}/${myPlayer.maxHealth}`;
    document.getElementById('god-display').textContent = myPlayer.patronGod;
    
    // Update skills
    Object.keys(myPlayer.skills).forEach(skill => {
        updateSkillUI(skill, myPlayer.skills[skill]);
    });
}

function updateSkillUI(skill, level) {
    const skillLevel = document.getElementById(`${skill}-level`);
    const skillBar = document.getElementById(`${skill}-bar`);
    
    if (skillLevel && skillBar) {
        skillLevel.textContent = Math.floor(level);
        const progress = (level % 1) * 100;
        skillBar.style.width = `${Math.max(10, progress)}%`;
    }
}

// Rendering
function drawWorld() {
    // Clear canvas
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw regions
    regions.forEach(region => {
        const screenX = region.x - camera.x + canvas.width / 2;
        const screenY = region.y - camera.y + canvas.height / 2;
        
        // Region background
        ctx.fillStyle = getRegionColor(region.name);
        ctx.fillRect(screenX, screenY, region.width, region.height);
        
        // Region border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, region.width, region.height);
        
        // Region name
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 16px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(region.name, screenX + region.width / 2, screenY + 30);
    });
    
    // Draw sea/water
    ctx.fillStyle = 'rgba(65, 105, 225, 0.3)';
    for (let i = 0; i < 50; i++) {
        const waveX = (i * 100 - camera.x * 0.5) % canvas.width;
        const waveY = (i * 80 - camera.y * 0.5) % canvas.height;
        ctx.beginPath();
        ctx.ellipse(waveX < 0 ? waveX + canvas.width : waveX, 
                   waveY < 0 ? waveY + canvas.height : waveY, 
                   60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getRegionColor(name) {
    switch(name) {
        case 'Attika': return '#90ee90';
        case 'Sparta Highlands': return '#8b7355';
        case 'Delphi Sanctum': return '#dda0dd';
        case 'Cyclades Archipelago': return '#87ceeb';
        default: return '#90ee90';
    }
}

function drawPlayer(player, isMe = false) {
    const screenX = player.x - camera.x + canvas.width / 2;
    const screenY = player.y - camera.y + canvas.height / 2;
    
    // Skip if off screen
    if (screenX < -50 || screenX > canvas.width + 50 || 
        screenY < -50 || screenY > canvas.height + 50) return;
    
    // Draw character body
    ctx.fillStyle = isMe ? '#ffd700' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw character outline
    ctx.strokeStyle = isMe ? '#b8860b' : '#8b0000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw helmet/crown
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(screenX, screenY - 5, 12, Math.PI, 0);
    ctx.fill();
    
    // Draw plume
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 17);
    ctx.lineTo(screenX - 5, screenY - 30);
    ctx.lineTo(screenX + 5, screenY - 30);
    ctx.closePath();
    ctx.fill();
    
    // Draw name
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(player.username, screenX, screenY + 35);
    
    // Draw level badge
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(screenX + 15, screenY - 15, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '10px Georgia';
    ctx.fillText(player.level, screenX + 15, screenY - 12);
}

function drawNPC(npc) {
    const screenX = npc.x - camera.x + canvas.width / 2;
    const screenY = npc.y - camera.y + canvas.height / 2;
    
    // Skip if off screen
    if (screenX < -50 || screenX > canvas.width + 50 || 
        screenY < -50 || screenY > canvas.height + 50) return;
    
    // Draw NPC
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw quest marker
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(screenX + 20, screenY - 20);
    ctx.lineTo(screenX + 30, screenY - 30);
    ctx.lineTo(screenX + 35, screenY - 25);
    ctx.lineTo(screenX + 25, screenY - 15);
    ctx.closePath();
    ctx.fill();
    
    // Draw name
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, screenX, screenY + 40);
    
    // Draw role
    ctx.font = '12px Georgia';
    ctx.fillStyle = '#555';
    ctx.fillText(npc.role, screenX, screenY + 55);
}

function drawEnvironment() {
    // Draw some trees/olive groves
    for (let i = 0; i < 30; i++) {
        const treeX = (i * 150 + 50) - camera.x + canvas.width / 2;
        const treeY = (i * 100 + 100) - camera.y + canvas.height / 2;
        
        if (treeX > -50 && treeX < canvas.width + 50 && 
            treeY > -50 && treeY < canvas.height + 50) {
            // Tree trunk
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(treeX - 5, treeY, 10, 30);
            
            // Tree foliage
            ctx.fillStyle = '#228b22';
            ctx.beginPath();
            ctx.arc(treeX, treeY - 10, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw temple columns
    const templeX = 200 - camera.x + canvas.width / 2;
    const templeY = 400 - camera.y + canvas.height / 2;
    
    ctx.fillStyle = '#f5f5dc';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(templeX + i * 40, templeY - 60, 8, 60);
    }
    
    // Temple roof
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(templeX - 10, templeY - 60);
    ctx.lineTo(templeX + 150, templeY - 60);
    ctx.lineTo(templeX + 70, templeY - 100);
    ctx.closePath();
    ctx.fill();
}

function updateCamera() {
    if (myPlayer) {
        // Smooth camera follow
        const targetX = myPlayer.x;
        const targetY = myPlayer.y;
        
        camera.x += (targetX - camera.x) * 0.1;
        camera.y += (targetY - camera.y) * 0.1;
    }
}

function gameLoop() {
    updateCamera();
    
    // Draw everything
    drawWorld();
    drawEnvironment();
    
    // Draw NPCs
    npcs.forEach(npc => drawNPC(npc));
    
    // Draw other players
    players.forEach(player => drawPlayer(player, false));
    
    // Draw self
    if (myPlayer) {
        drawPlayer(myPlayer, true);
    }
    
    requestAnimationFrame(gameLoop);
}

// Initial render
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#d4af37';
ctx.font = 'bold 24px Georgia';
ctx.textAlign = 'center';
ctx.fillText('🏛️ Loading Aegean: Oaths of Olympus...', canvas.width / 2, canvas.height / 2);
