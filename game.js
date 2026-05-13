// Talladega Raceway - NASCAR Racing Game
// Realistic mechanical features with weight transfer and steering physics

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
let gameState = 'waiting'; // waiting, racing, finished
let startTime = 0;
let currentLapTime = 0;
let bestLapTime = Infinity;
let lap = 1;
const totalLaps = 3;

// Track definition (Talladega Superspeedway oval)
const track = {
    centerX: canvas.width / 2,
    centerY: canvas.height / 2,
    radiusX: Math.min(canvas.width, canvas.height) * 0.35,
    radiusY: Math.min(canvas.width, canvas.height) * 0.25,
    width: 80,
    banking: 33, // degrees of banking at Talladega
    length: 2.66 * 1609, // meters (2.66 miles)
    
    // Track surface properties
    grip: 0.92,
    wearRate: 0.0001
};

// Car physics with realistic weight and steering
class Car {
    constructor(x, y, color, isPlayer = false) {
        // Position and velocity
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0; // Radians
        this.angularVel = 0;
        
        // Physical properties (NASCAR Cup Series car)
        this.mass = 1542; // kg (3400 lbs including driver)
        this.length = 5.2; // meters
        this.width = 2.0; // meters
        this.cgHeight = 0.5; // Center of gravity height in meters
        this.wheelbase = 2.9; // meters
        
        // Weight distribution (rear-biased for NASCAR)
        this.weightDistributionFront = 0.48;
        this.weightDistributionRear = 0.52;
        
        // Engine and drivetrain
        this.enginePower = 550000; // Watts (~750 hp)
        this.maxRPM = 9500;
        this.currentRPM = 0;
        this.gear = 1;
        this.gears = [0, 3.5, 2.5, 2.0, 1.7, 1.5]; // Gear ratios
        this.finalDrive = 3.5;
        this.throttle = 0;
        this.brake = 0;
        this.handbrake = false;
        
        // Steering
        this.steerAngle = 0;
        this.maxSteerAngle = 0.35; // Radians (~20 degrees)
        this.steerSpeed = 2.5; // How fast we can turn the wheel
        this.steerReturnSpeed = 3.0;
        
        // Tires
        this.tireWear = { FL: 1.0, FR: 1.0, RL: 1.0, RR: 1.0 };
        this.tireGrip = 1.0;
        this.tirePressure = 1.0;
        this.slipAngle = 0;
        
        // Aerodynamics
        this.dragCoefficient = 0.35;
        this.downforceCoefficient = 3.2; // High downforce for NASCAR
        this.frontalArea = 2.1; // m²
        this.airDensity = 1.225; // kg/m³
        
        // Fuel
        this.fuel = 100; // percentage
        this.fuelConsumption = 0.0002;
        
        // Visual properties
        this.color = color;
        this.isPlayer = isPlayer;
        
        // AI properties
        this.aiTargetSpeed = 0;
        this.aiReactionTime = 0.1 + Math.random() * 0.1;
    }
    
    update(dt, input) {
        if (!this.isPlayer && gameState === 'racing') {
            this.updateAI(dt);
        }
        
        // Apply throttle
        if (input.accelerate) {
            this.throttle = Math.min(this.throttle + dt * 3, 1);
        } else {
            this.throttle = Math.max(this.throttle - dt * 2, 0);
        }
        
        // Apply brake
        if (input.brake) {
            this.brake = Math.min(this.brake + dt * 5, 1);
        } else {
            this.brake = Math.max(this.brake - dt * 3, 0);
        }
        
        // Handbrake
        this.handbrake = input.handbrake;
        
        // Steering input
        let targetSteer = 0;
        if (input.left) targetSteer = -this.maxSteerAngle;
        if (input.right) targetSteer = this.maxSteerAngle;
        
        // Smooth steering input
        if (targetSteer > this.steerAngle) {
            this.steerAngle = Math.min(this.steerAngle + this.steerSpeed * dt, targetSteer);
        } else if (targetSteer < this.steerAngle) {
            this.steerAngle = Math.max(this.steerAngle - this.steerSpeed * dt, targetSteer);
        } else {
            // Return to center
            if (this.steerAngle > 0) {
                this.steerAngle = Math.max(0, this.steerAngle - this.steerReturnSpeed * dt);
            } else {
                this.steerAngle = Math.min(0, this.steerAngle + this.steerReturnSpeed * dt);
            }
        }
        
        // Speed-dependent steering reduction (realistic)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const speedFactor = Math.max(0.3, 1 - speed / 150);
        const effectiveSteer = this.steerAngle * speedFactor;
        
        // Calculate forces
        this.calculateForces(dt, effectiveSteer);
        
        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Update angle based on angular velocity
        this.angle += this.angularVel * dt;
        
        // Update RPM based on speed and gear
        const wheelRadius = 0.33; // meters
        const wheelCircumference = 2 * Math.PI * wheelRadius;
        const wheelRPM = (speed * 60) / wheelCircumference;
        this.currentRPM = Math.min(wheelRPM * this.gears[this.gear] * this.finalDrive, this.maxRPM);
        
        // Automatic transmission
        if (this.currentRPM > this.maxRPM * 0.9 && this.gear < this.gears.length - 1) {
            this.gear++;
        } else if (this.currentRPM < this.maxRPM * 0.4 && this.gear > 1) {
            this.gear--;
        }
        
        // Fuel consumption
        if (this.throttle > 0) {
            this.fuel = Math.max(0, this.fuel - this.fuelConsumption * this.throttle * dt * 1000);
        }
        
        // Tire wear
        if (speed > 50) {
            const wear = track.wearRate * dt * (1 + Math.abs(effectiveSteer) * 2);
            this.tireWear.FL -= wear * (0.8 + Math.random() * 0.4);
            this.tireWear.FR -= wear * (0.8 + Math.random() * 0.4);
            this.tireWear.RL -= wear * (0.8 + Math.random() * 0.4);
            this.tireWear.RR -= wear * (0.8 + Math.random() * 0.4);
            
            // Update tire grip based on wear
            this.tireGrip = Math.min(
                this.tireWear.FL,
                this.tireWear.FR,
                this.tireWear.RL,
                this.tireWear.RR
            );
        }
        
        // Keep car on track (simple boundary)
        this.constrainToTrack();
    }
    
    calculateForces(dt, steerAngle) {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const direction = Math.atan2(this.vy, this.vx);
        
        // Weight transfer calculation (realistic physics)
        const acceleration = this.throttle * this.enginePower / (this.mass * speed + 1);
        const braking = this.brake * 15000 / this.mass;
        
        // Longitudinal weight transfer (acceleration/braking)
        const longWeightTransfer = (this.mass * acceleration * this.cgHeight) / this.wheelbase;
        const frontWeightRatio = this.weightDistributionFront - (longWeightTransfer / (this.mass * 9.81));
        const rearWeightRatio = this.weightDistributionRear + (longWeightTransfer / (this.mass * 9.81));
        
        // Lateral weight transfer (cornering)
        const lateralAccel = speed * speed / Math.max(track.radiusX, 100);
        const latWeightTransfer = (this.mass * lateralAccel * this.cgHeight) / 1.5; // track width approx 1.5m
        
        // Engine force
        const engineForce = this.throttle * this.enginePower / (speed + 1);
        
        // Drag force
        const dragForce = 0.5 * this.airDensity * this.dragCoefficient * this.frontalArea * speed * speed;
        
        // Downforce
        const downforce = 0.5 * this.airDensity * this.downforceCoefficient * this.frontalArea * speed * speed;
        const normalForce = this.mass * 9.81 + downforce;
        
        // Tire forces with slip angle
        this.slipAngle = steerAngle - direction + this.angle;
        const corneringStiffness = 80000 * this.tireGrip * track.grip;
        const corneringForce = corneringStiffness * Math.sin(this.slipAngle);
        
        // Braking force
        const brakingForce = this.brake * 15000 * this.tireGrip;
        const handbrakeForce = this.handbrake ? 8000 : 0;
        
        // Net force in direction of travel
        const forwardForce = engineForce - dragForce - brakingForce - handbrakeForce;
        
        // Apply forces to velocity
        const fx = forwardForce * Math.cos(this.angle) + corneringForce * Math.sin(this.angle);
        const fy = forwardForce * Math.sin(this.angle) - corneringForce * Math.cos(this.angle);
        
        // Update velocity with mass consideration
        this.vx += (fx / this.mass) * dt;
        this.vy += (fy / this.mass) * dt;
        
        // Angular velocity from steering and slip
        this.angularVel = (steerAngle * speed / this.wheelbase) * 0.5 + 
                         (this.slipAngle * corneringForce / (this.mass * speed + 1)) * 0.3;
        
        // Damping
        this.vx *= 0.999;
        this.vy *= 0.999;
        this.angularVel *= 0.95;
        
        // Store weight transfer for HUD
        this.weightTransfer = Math.abs(frontWeightRatio - this.weightDistributionFront) * 100;
    }
    
    updateAI(dt) {
        // Simple AI that follows the track
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const dx = track.centerX - this.x;
        const dy = track.centerY - this.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate ideal racing line
        const idealRadius = track.radiusX * 0.8;
        const angle = Math.atan2(dy, dx);
        const targetX = track.centerX + Math.cos(angle) * idealRadius;
        const targetY = track.centerY + Math.sin(angle) * idealRadius;
        
        // Steer toward target
        const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
        const angleDiff = targetAngle - this.angle;
        
        if (angleDiff > 0.1) {
            this.steerAngle = Math.min(this.steerAngle + this.steerSpeed * dt, this.maxSteerAngle);
        } else if (angleDiff < -0.1) {
            this.steerAngle = Math.max(this.steerAngle - this.steerSpeed * dt, -this.maxSteerAngle);
        } else {
            this.steerAngle *= 0.9;
        }
        
        // Control speed
        const targetSpeed = 180 + Math.random() * 20; // MPH equivalent
        if (speed < targetSpeed * 0.447) { // Convert to m/s
            this.throttle = Math.min(this.throttle + dt * 2, 1);
            this.brake = Math.max(this.brake - dt * 3, 0);
        } else {
            this.throttle = Math.max(this.throttle - dt * 2, 0.5);
            this.brake = 0;
        }
    }
    
    constrainToTrack() {
        const dx = this.x - track.centerX;
        const dy = this.y - track.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const innerRadius = track.radiusX - track.width / 2;
        const outerRadius = track.radiusX + track.width / 2;
        
        if (dist < innerRadius) {
            this.x = track.centerX + Math.cos(angle) * (innerRadius + 5);
            this.y = track.centerY + Math.sin(angle) * (innerRadius + 5);
            this.vx *= 0.5;
            this.vy *= 0.5;
        } else if (dist > outerRadius) {
            this.x = track.centerX + Math.cos(angle) * (outerRadius - 5);
            this.y = track.centerY + Math.sin(angle) * (outerRadius - 5);
            this.vx *= 0.5;
            this.vy *= 0.5;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Car body (NASCAR stock car shape)
        ctx.fillStyle = this.color;
        
        // Main body
        ctx.beginPath();
        ctx.roundRect(-this.length/2, -this.width/2, this.length, this.width, 0.3);
        ctx.fill();
        
        // Hood
        ctx.fillStyle = this.isPlayer ? '#cc0000' : this.color;
        ctx.beginPath();
        ctx.ellipse(0.5, 0, this.length/3, this.width/2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Windshield
        ctx.fillStyle = '#336699';
        ctx.beginPath();
        ctx.roundRect(0.2, -this.width/3, this.length/5, this.width/1.5, 0.1);
        ctx.fill();
        
        // Roof
        ctx.fillStyle = this.color;
        ctx.fillRect(-0.3, -this.width/2.5, this.length/4, this.width/1.25);
        
        // Number on roof
        if (this.isPlayer) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('43', 0, 4);
        }
        
        // Rear spoiler
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.length/2 - 0.2, -this.width/2 - 0.1, 0.3, this.width + 0.2);
        
        // Wheels
        ctx.fillStyle = '#111';
        const wheelOffset = this.width/2 + 0.1;
        ctx.beginPath();
        ctx.arc(-this.length/3, -wheelOffset, 0.25, 0, Math.PI * 2);
        ctx.arc(this.length/3, -wheelOffset, 0.25, 0, Math.PI * 2);
        ctx.arc(-this.length/3, wheelOffset, 0.25, 0, Math.PI * 2);
        ctx.arc(this.length/3, wheelOffset, 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    getSpeed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 2.237; // Convert to MPH
    }
}

// Create player car
const playerCar = new Car(
    track.centerX + track.radiusX * 0.8,
    track.centerY,
    '#ff0000',
    true
);

// Create AI cars
const aiCars = [];
const carColors = ['#0066ff', '#00cc00', '#ffcc00', '#ff6600', '#9900ff', '#00cccc', '#ff00cc'];
for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const offset = (Math.random() - 0.5) * 20;
    aiCars.push(new Car(
        track.centerX + Math.cos(angle) * (track.radiusX + offset),
        track.centerY + Math.sin(angle) * (track.radiusX + offset),
        carColors[i]
    ));
}

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && gameState === 'waiting') {
        gameState = 'racing';
        startTime = Date.now();
        document.getElementById('message').style.display = 'none';
    }
    if (e.code === 'KeyR') {
        resetCar();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function getInput() {
    return {
        accelerate: keys['KeyW'] || keys['ArrowUp'],
        brake: keys['KeyS'] || keys['ArrowDown'],
        left: keys['KeyA'] || keys['ArrowLeft'],
        right: keys['KeyD'] || keys['ArrowRight'],
        handbrake: keys['Space']
    };
}

function resetCar() {
    playerCar.x = track.centerX + track.radiusX * 0.8;
    playerCar.y = track.centerY;
    playerCar.vx = 0;
    playerCar.vy = 0;
    playerCar.angle = -Math.PI / 2;
    playerCar.steerAngle = 0;
}

// Draw track
function drawTrack() {
    // Grass background
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Track surface
    ctx.strokeStyle = '#333';
    ctx.lineWidth = track.width;
    ctx.lineCap = 'round';
    
    // Draw oval track
    ctx.beginPath();
    ctx.ellipse(track.centerX, track.centerY, track.radiusX, track.radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Track edges
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(track.centerX, track.centerY, track.radiusX - track.width/2, track.radiusY - track.width/2 * (track.radiusY/track.radiusX), 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(track.centerX, track.centerY, track.radiusX + track.width/2, track.radiusY + track.width/2 * (track.radiusY/track.radiusX), 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Start/finish line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(track.centerX + track.radiusX, track.centerY - track.width/2);
    ctx.lineTo(track.centerX + track.radiusX, track.centerY + track.width/2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Banking indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${track.banking}° BANKING`, track.centerX - track.radiusX * 0.5, track.centerY - track.radiusY * 0.8);
    
    // Turn markers
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.font = '14px Arial';
    ctx.fillText('TURN 1', track.centerX, track.centerY - track.radiusY * 0.9);
    ctx.fillText('TURN 2', track.centerX + track.radiusX * 0.9, track.centerY);
    ctx.fillText('TURN 3', track.centerX, track.centerY + track.radiusY * 0.9);
    ctx.fillText('TURN 4', track.centerX - track.radiusX * 0.9, track.centerY);
}

// Update HUD
function updateHUD() {
    const speed = playerCar.getSpeed();
    document.getElementById('speedValue').textContent = Math.round(speed);
    document.getElementById('gearValue').textContent = playerCar.gear;
    document.getElementById('rpmValue').textContent = Math.round(playerCar.currentRPM);
    document.getElementById('fuelValue').textContent = Math.round(playerCar.fuel) + '%';
    document.getElementById('weightTransfer').textContent = Math.round(playerCar.weightTransfer || 0) + '%';
    
    // Tire wear indicators
    updateTireIndicator('tireFL', playerCar.tireWear.FL);
    updateTireIndicator('tireFR', playerCar.tireWear.FR);
    updateTireIndicator('tireRL', playerCar.tireWear.RL);
    updateTireIndicator('tireRR', playerCar.tireWear.RR);
    
    // Lap info
    document.getElementById('lapValue').textContent = `${lap}/${totalLaps}`;
    
    // Calculate position
    let position = 1;
    aiCars.forEach(car => {
        const carDist = Math.sqrt((car.x - track.centerX)**2 + **(car.y - track.centerY)2);
        const playerDist = Math.sqrt((playerCar.x - track.centerX)**2 + **(playerCar.y - track.centerY)2);
        if (carDist > playerDist) position++;
    });
    document.getElementById('positionValue').textContent = `${position}/${aiCars.length + 1}`;
    
    // Lap timer
    if (gameState === 'racing') {
        currentLapTime = (Date.now() - startTime) / 1000;
        const minutes = Math.floor(currentLapTime / 60);
        const seconds = (currentLapTime % 60).toFixed(2);
        document.getElementById('currentLapValue').textContent = 
            `${minutes}:${seconds.padStart(5, '0')}`;
        
        if (bestLapTime !== Infinity) {
            const bestMin = Math.floor(bestLapTime / 60);
            const bestSec = (bestLapTime % 60).toFixed(2);
            document.getElementById('bestLapValue').textContent = 
                `${bestMin}:${bestSec.padStart(5, '0')}`;
        }
    }
}

function updateTireIndicator(id, wear) {
    const element = document.getElementById(id);
    element.className = 'tire-indicator';
    if (wear > 0.7) {
        element.classList.add('tire-good');
    } else if (wear > 0.4) {
        element.classList.add('tire-worn');
    } else {
        element.classList.add('tire-bad');
    }
}

// Check lap completion
let lastCheckPoint = 0;
let passedHalfway = false;

function checkLapCompletion() {
    const angle = Math.atan2(playerCar.y - track.centerY, playerCar.x - track.centerX);
    const normalizedAngle = (angle + Math.PI) / (Math.PI * 2); // 0 to 1
    
    // Check if we passed the start/finish line
    if (normalizedAngle > 0.9 && lastCheckPoint < 0.1) {
        if (passedHalfway) {
            // Completed a lap
            if (currentLapTime < bestLapTime) {
                bestLapTime = currentLapTime;
            }
            lap++;
            startTime = Date.now();
            currentLapTime = 0;
            
            if (lap > totalLaps) {
                gameState = 'finished';
                document.getElementById('messageTitle').textContent = 'RACE FINISHED!';
                document.getElementById('messageText').textContent = `Final Position: ${document.getElementById('positionValue').textContent}`;
                document.getElementById('message').style.display = 'block';
            }
        }
    }
    
    // Check if we passed halfway point
    if (normalizedAngle > 0.4 && normalizedAngle < 0.6) {
        passedHalfway = true;
    }
    
    lastCheckPoint = normalizedAngle;
}

// Main game loop
let lastTime = Date.now();

function gameLoop() {
    const currentTime = Date.now();
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta time
    lastTime = currentTime;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw track
    drawTrack();
    
    // Update and draw cars
    if (gameState === 'racing') {
        const input = getInput();
        playerCar.update(dt, input);
        
        aiCars.forEach(car => {
            car.update(dt, { accelerate: false, brake: false, left: false, right: false, handbrake: false });
            car.draw();
        });
        
        checkLapCompletion();
    }
    
    playerCar.draw();
    
    // Update HUD
    updateHUD();
    
    requestAnimationFrame(gameLoop);
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    track.centerX = canvas.width / 2;
    track.centerY = canvas.height / 2;
    track.radiusX = Math.min(canvas.width, canvas.height) * 0.35;
    track.radiusY = Math.min(canvas.width, canvas.height) * 0.25;
});

// Show initial message
document.getElementById('message').style.display = 'block';

// Start game loop
gameLoop();
