 class SoundSystem {
            constructor() {
                this.enabled = true;
                this.ctx = null;
            }
            init() {
                if (!this.ctx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioContext();
                }
                if (this.ctx.state === 'suspended') { this.ctx.resume(); }
            }
            coinFlip() { 
                if (!this.enabled) return;
                for(let i=0; i<6; i++) {
                    setTimeout(() => this.playTone(500 + i*80, 'sine', 0.08, 0.08), i * 90);
                }
            }
            coinLanding() { this.playTone(850, 'triangle', 0.2, 0.2); }
            playTone(freq, type, duration, vol = 0.1) {
                if (!this.enabled) return;
                try {
                    this.init();
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + duration);
                } catch (e) { }
            }
            roll() { this.playTone(300, 'triangle', 0.15, 0.15); setTimeout(() => this.playTone(450, 'triangle', 0.2, 0.15), 100); }
            line() { this.playTone(600, 'sine', 0.1, 0.1); }
            capture() { this.playTone(800, 'square', 0.15, 0.1); setTimeout(() => this.playTone(1200, 'square', 0.25, 0.12), 120); }
            turn() { this.playTone(400, 'sine', 0.12, 0.08); }
            win() {
                [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
                    setTimeout(() => this.playTone(f, 'triangle', 0.3, 0.15), i * 150);
                });
            }
        }
        const sound = new SoundSystem();

        // --- CONFETI DE FIESTA (sin librerías externas) ---
        const CONFETTI_COLORS = ['#ffc93c', '#00c2ff', '#ff3d68', '#33d69f', '#ffffff'];
        function launchConfetti(originX, originY, count = 22) {
            for (let i = 0; i < count; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                const size = 6 + Math.random() * 7;
                const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
                const startX = originX + (Math.random() * 120 - 60);
                const drift = (Math.random() * 160 - 80);
                const duration = 1.1 + Math.random() * 0.9;
                const rot = (Math.random() * 720 - 360) + 'deg';

                piece.style.left = `${startX}px`;
                piece.style.top = `${originY}px`;
                piece.style.width = `${size}px`;
                piece.style.height = `${size * (Math.random() > 0.5 ? 1 : 2.2)}px`;
                piece.style.background = color;
                piece.style.setProperty('--rot', rot);
                piece.style.transform = `translateX(0)`;
                piece.animate(
                    [
                        { transform: `translate(0, 0) rotate(0deg)`, offset: 0 },
                        { transform: `translate(${drift}px, 110vh) rotate(${rot})`, offset: 1 }
                    ],
                    { duration: duration * 1000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' }
                );
                document.body.appendChild(piece);
                setTimeout(() => piece.remove(), duration * 1000 + 100);
            }
        }

        function confettiFromElement(el, count) {
            if (!el) { launchConfetti(window.innerWidth / 2, window.innerHeight / 3, count); return; }
            const rect = el.getBoundingClientRect();
            launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
        }

        function confettiBurstCenter(count = 90) {
            launchConfetti(window.innerWidth * 0.2, -10, Math.floor(count / 3));
            launchConfetti(window.innerWidth * 0.5, -10, Math.floor(count / 3));
            launchConfetti(window.innerWidth * 0.8, -10, Math.floor(count / 3));
        }

        let gameState = {
            blueTeam: { name: 'EQUIPO AZUL', participants: ['Juan Camilo', 'Andres Eduardo', 'Francy\'s', 'Jaider', 'Luis', 'Laura', 'Rafael'], score: 0 },
            redTeam: { name: 'EQUIPO ROJO', participants: ['Jesús David', 'Carlos', 'Withman', 'Marbin', 'Carla', 'Nuvia', 'Freddy', 'Andres Felipe'], score: 0 },
            boardSize: 6,
            lines: { horizontal: [], vertical: [] },
            boxes: [],
            currentTurnIndex: 0,
            allParticipants: [],
            remainingMoves: 0,
            hasRolled: false,
            consecutiveCaptures: 0, // Control Fair Play (Máx 3 repeticiones seguidas)
            gameOver: false,
            isLightMode: false
        };

        function initConfigUI() {
            renderConfigParticipants('blue');
            renderConfigParticipants('red');
            loadSavedGamePrompt();
        }

        function renderConfigParticipants(teamKey) {
            const listEl = document.getElementById(`${teamKey}ParticipantsList`);
            const parts = teamKey === 'blue' ? gameState.blueTeam.participants : gameState.redTeam.participants;
            listEl.innerHTML = '';
            parts.forEach((p, idx) => {
                const div = document.createElement('div');
                div.className = 'participant-item';
                div.innerHTML = `<span>${p}</span> ${parts.length > 1 ? `<button class="btn-icon" onclick="removeParticipant('${teamKey}', ${idx})">✕</button>` : ''}`;
                listEl.appendChild(div);
            });
        }

        window.removeParticipant = function (teamKey, idx) {
            const parts = teamKey === 'blue' ? gameState.blueTeam.participants : gameState.redTeam.participants;
            if (parts.length > 1) {
                parts.splice(idx, 1);
                renderConfigParticipants(teamKey);
            }
        };

        document.getElementById('blueAddBtn').addEventListener('click', () => {
            const input = document.getElementById('blueNewParticipant');
            const val = input.value.trim();
            if (val) { gameState.blueTeam.participants.push(val); input.value = ''; renderConfigParticipants('blue'); }
        });

        document.getElementById('redAddBtn').addEventListener('click', () => {
            const input = document.getElementById('redNewParticipant');
            const val = input.value.trim();
            if (val) { gameState.redTeam.participants.push(val); input.value = ''; renderConfigParticipants('red'); }
        });

        function saveGame() {
            localStorage.setItem('timbiriche_neon_save', JSON.stringify(gameState));
        }

        function loadSavedGamePrompt() {
            const saved = localStorage.getItem('timbiriche_neon_save');
            const resumeBtn = document.getElementById('resumeGameBtn');
            resumeBtn.style.display = saved ? 'block' : 'none';
        }

        document.getElementById('resumeGameBtn').addEventListener('click', () => {
            const saved = localStorage.getItem('timbiriche_neon_save');
            if (saved) {
                gameState = JSON.parse(saved);
                if (gameState.isLightMode) {
                    document.body.classList.add('light-mode');
                    document.getElementById('themeToggleBtn').innerText = '🌙';
                }
                startGameSession(true);
            }
        });

        document.getElementById('startBattleBtn').addEventListener('click', () => {
            gameState.blueTeam.name = document.getElementById('blueTeamName').value.trim() || 'EQUIPO AZUL';
            gameState.redTeam.name = document.getElementById('redTeamName').value.trim() || 'EQUIPO ROJO';
            gameState.boardSize = parseInt(document.getElementById('boardSizeSelect').value);
            
             // Actualizar nombres en la moneda 3D antes de mostrar el modal
           // document.getElementById('coinBlueName').innerText = gameState.blueTeam.name.substring(0, 10);
            //document.getElementById('coinRedName').innerText = gameState.redTeam.name.substring(0, 10);
            document.getElementById('coinResultText').innerText = '¡Listo para el volado!';
            
              // Mostrar modal de moneda en lugar de iniciar de golpe
            document.getElementById('coinFlipModal').classList.add('active');

            gameState.allParticipants = [];
            const maxLen = Math.max(gameState.blueTeam.participants.length, gameState.redTeam.participants.length);
            for (let i = 0; i < maxLen; i++) {
                if (i < gameState.blueTeam.participants.length) gameState.allParticipants.push({ name: gameState.blueTeam.participants[i], team: 'blue' });
                if (i < gameState.redTeam.participants.length) gameState.allParticipants.push({ name: gameState.redTeam.participants[i], team: 'red' });
            }

            const n = gameState.boardSize;
            gameState.lines.horizontal = Array(n).fill(0).map(() => Array(n - 1).fill(null));
            gameState.lines.vertical = Array(n - 1).fill(0).map(() => Array(n).fill(null));
            gameState.boxes = Array(n - 1).fill(0).map(() => Array(n - 1).fill(null));

            gameState.blueTeam.score = 0;
            gameState.redTeam.score = 0;
            gameState.currentTurnIndex = 0;
            gameState.remainingMoves = 0;
            gameState.hasRolled = false;
            gameState.consecutiveCaptures = 0;
            gameState.gameOver = false;

            startGameSession(false);
        });

        let currentCoinRotationY = 0;

        document.getElementById('flipCoinBtn').addEventListener('click', () => {
            const coin = document.getElementById('coin3d');
            const resultText = document.getElementById('coinResultText');
            sound.coinFlip();

            // Decidir aleatoriamente 0 (Azul/Cara) o 1 (Rojo/Cruz)
            const winnerTeam = Math.random() < 0.5 ? 'blue' : 'red';
            
            // Calcular giros completos en Y (ej. 5 o 6 vueltas completas = 1800 o 2160 grados) + cara final (0 o 180)
            const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
            const targetRotation = winnerTeam === 'blue' ? extraSpins : extraSpins + 180;
            
            currentCoinRotationY = targetRotation;
            coin.style.transform = `rotateY(${currentCoinRotationY}deg)`;
            resultText.innerText = 'Girando moneda... 🪙';

            setTimeout(() => {
                sound.coinLanding();
                const winningName = winnerTeam === 'blue' ? gameState.blueTeam.name : gameState.redTeam.name;
                resultText.innerHTML = `¡Ganó <span style="color: ${winnerTeam === 'blue' ? 'var(--blue-team)' : 'var(--red-team)'};">${winningName}</span>! Inicia la batalla.`;
                confettiFromElement(document.getElementById('coinFlipModal'), 80);

                // Reorganizar participantes para que el equipo ganador comience primero
                setupParticipantsAndStart(winnerTeam);
            }, 5600);
        });

        document.getElementById('skipCoinBtn').addEventListener('click', () => {
            setupParticipantsAndStart('blue'); // Por defecto arranca azul si se omite
        });

        function setupParticipantsAndStart(startingTeam) {
            gameState.allParticipants = [];
            const blueParts = [...gameState.blueTeam.participants];
            const redParts = [...gameState.redTeam.participants];
            
            const maxLen = Math.max(blueParts.length, redParts.length);
            
            // Intercalar turnos garantizando que el equipo ganador encabece la lista
            let firstList = startingTeam === 'blue' ? blueParts : redParts;
            let secondList = startingTeam === 'blue' ? redParts : blueParts;
            let firstTeamKey = startingTeam;
            let secondTeamKey = startingTeam === 'blue' ? 'red' : 'blue';

            for (let i = 0; i < maxLen; i++) {
                if (i < firstList.length) gameState.allParticipants.push({ name: firstList[i], team: firstTeamKey });
                if (i < secondList.length) gameState.allParticipants.push({ name: secondList[i], team: secondTeamKey });
            }

            const n = gameState.boardSize;
            gameState.lines.horizontal = Array(n).fill(0).map(() => Array(n - 1).fill(null));
            gameState.lines.vertical = Array(n - 1).fill(0).map(() => Array(n).fill(null));
            gameState.boxes = Array(n - 1).fill(0).map(() => Array(n - 1).fill(null));

            gameState.blueTeam.score = 0;
            gameState.redTeam.score = 0;
            gameState.currentTurnIndex = 0;
            gameState.remainingMoves = 0;
            gameState.hasRolled = false;
            gameState.consecutiveCaptures = 0;
            gameState.gameOver = false;

            setTimeout(() => {
                document.getElementById('coinFlipModal').classList.remove('active');
                startGameSession(false);
            }, 2400);
        }

        function startGameSession(isResumed) {
            document.getElementById('configScreen').classList.remove('active');
            document.getElementById('gameScreen').classList.add('active');

            document.getElementById('blueScoreName').innerText = gameState.blueTeam.name;
            document.getElementById('redScoreName').innerText = gameState.redTeam.name;
            document.getElementById('modalBlueTag').innerText = gameState.blueTeam.name;
            document.getElementById('modalRedTag').innerText = gameState.redTeam.name;

            buildBoardDOM();
            updateUI();
            if (!isResumed) {
                addLog('Batalla iniciada. ¡A lanzar el dado!');
                saveGame();
            }
        }

        function buildBoardDOM() {
            const wrapper = document.getElementById('boardWrapper');
            wrapper.innerHTML = '';
            const n = gameState.boardSize;
            const grid = document.createElement('div');
            grid.className = 'timbiriche-grid';

            const colTracks = ['12px'], rowTracks = ['12px'];
            for (let i = 0; i < n - 1; i++) {
                colTracks.push('50px'); colTracks.push('12px');
                rowTracks.push('50px'); rowTracks.push('12px');
            }
            grid.style.gridTemplateColumns = colTracks.join(' ');
            grid.style.gridTemplateRows = rowTracks.join(' ');

            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    dot.style.gridRow = `${r * 2 + 1}`; dot.style.gridColumn = `${c * 2 + 1}`;
                    grid.appendChild(dot);

                    if (c < n - 1) {
                        const hLine = document.createElement('div');
                        hLine.className = 'line horizontal';
                        hLine.style.gridRow = `${r * 2 + 1}`; hLine.style.gridColumn = `${c * 2 + 2}`;
                        hLine.innerHTML = '<div class="line-inner"></div>';
                        hLine.addEventListener('click', () => handleLineClick('h', r, c));
                        hLine.addEventListener('touchend', (e) => { e.preventDefault(); handleLineClick('h', r, c); });
                        grid.appendChild(hLine);
                    }

                    if (r < n - 1) {
                        const vLine = document.createElement('div');
                        vLine.className = 'line vertical';
                        vLine.style.gridRow = `${r * 2 + 2}`; vLine.style.gridColumn = `${c * 2 + 1}`;
                        vLine.innerHTML = '<div class="line-inner"></div>';
                        vLine.addEventListener('click', () => handleLineClick('v', r, c));
                        vLine.addEventListener('touchend', (e) => { e.preventDefault(); handleLineClick('v', r, c); });
                        grid.appendChild(vLine);
                    }

                    if (r < n - 1 && c < n - 1) {
                        const box = document.createElement('div');
                        box.className = 'box-cell';
                        box.style.gridRow = `${r * 2 + 2}`; box.style.gridColumn = `${c * 2 + 2}`;
                        box.id = `box-${r}-${c}`;
                        grid.appendChild(box);
                    }
                }
            }
            wrapper.appendChild(grid);
            syncBoardVisuals();
        }

        function syncBoardVisuals() {
            const n = gameState.boardSize;
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n - 1; c++) {
                    const owner = gameState.lines.horizontal[r][c];
                    if (owner) {
                        document.querySelectorAll('.line.horizontal').forEach(el => {
                            if (parseInt(el.style.gridRow) === r * 2 + 1 && parseInt(el.style.gridColumn) === c * 2 + 2) {
                                el.classList.add('occupied', owner);
                            }
                        });
                    }
                }
            }
            for (let r = 0; r < n - 1; r++) {
                for (let c = 0; c < n; c++) {
                    const owner = gameState.lines.vertical[r][c];
                    if (owner) {
                        document.querySelectorAll('.line.vertical').forEach(el => {
                            if (parseInt(el.style.gridRow) === r * 2 + 2 && parseInt(el.style.gridColumn) === c * 2 + 1) {
                                el.classList.add('occupied', owner);
                            }
                        });
                    }
                }
            }
            for (let r = 0; r < n - 1; r++) {
                for (let c = 0; c < n - 1; c++) {
                    const owner = gameState.boxes[r][c];
                    if (owner) {
                        const boxEl = document.getElementById(`box-${r}-${c}`);
                        if (boxEl) {
                            boxEl.classList.add(`${owner}-owner`);
                            boxEl.innerText = owner === 'blue' ? '🔵' : '🔴';
                        }
                    }
                }
            }
        }

        function handleLineClick(type, r, c) {
            if (gameState.gameOver) return;
            if (!gameState.hasRolled || gameState.remainingMoves <= 0) {
                alert('¡Primero debes lanzar el dado para obtener movimientos!');
                return;
            }

            const currentParticipant = gameState.allParticipants[gameState.currentTurnIndex];
            const teamColor = currentParticipant.team;

            if (type === 'h' && gameState.lines.horizontal[r][c] !== null) return;
            if (type === 'v' && gameState.lines.vertical[r][c] !== null) return;

            if (type === 'h') gameState.lines.horizontal[r][c] = teamColor;
            else gameState.lines.vertical[r][c] = teamColor;

            const gridChildren = document.querySelectorAll('.timbiriche-grid > div');
            gridChildren.forEach(el => {
                const row = parseInt(el.style.gridRow), col = parseInt(el.style.gridColumn);
                if (type === 'h' && el.classList.contains('horizontal') && row === r * 2 + 1 && col === c * 2 + 2) {
                    el.classList.add('occupied', teamColor);
                }
                if (type === 'v' && el.classList.contains('vertical') && row === r * 2 + 2 && col === c * 2 + 1) {
                    el.classList.add('occupied', teamColor);
                }
            });

            sound.line();
            addLog(`${currentParticipant.name} dibujó una línea.`);

            const scoredBoxes = checkCompletedBoxes(r, c, type, teamColor);
            gameState.remainingMoves--;
            updateUI();

            if (scoredBoxes > 0) {
                sound.capture();
                gameState.consecutiveCaptures++;

                // REGLA DE JUEGO LIMPIO: Máximo 3 repeticiones seguidas por jugador
                if (gameState.consecutiveCaptures >= 3) {
                    addLog(`${currentParticipant.name} alcanzó el límite de 3 capturas seguidas. Turno finalizado por Fair Play.`);
                    gameState.hasRolled = false;
                    gameState.remainingMoves = 0;
                    gameState.consecutiveCaptures = 0;
                    gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.allParticipants.length;
                    sound.turn();
                    addLog(`Turno de ${gameState.allParticipants[gameState.currentTurnIndex].name}.`);
                } else {
                    addLog(`${currentParticipant.name} conquistó ${scoredBoxes} cuadrado(s) y repite turno.`);
                    gameState.hasRolled = false;
                    gameState.remainingMoves = 0;
                }
                updateUI();
            } else {
                if (gameState.remainingMoves <= 0) {
                    gameState.hasRolled = false;
                    gameState.consecutiveCaptures = 0; // Reiniciar contador al perder el turno normalmente
                    gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.allParticipants.length;
                    sound.turn();
                    addLog(`Turno de ${gameState.allParticipants[gameState.currentTurnIndex].name}.`);
                    updateUI();
                }
            }

            saveGame();
            checkGameOver();
        }

        function checkCompletedBoxes(r, c, type, teamColor) {
            let completedCount = 0;
            const n = gameState.boardSize;
            if (type === 'h') {
                if (r > 0 && isBoxComplete(r - 1, c) && !gameState.boxes[r - 1][c]) { claimBox(r - 1, c, teamColor); completedCount++; }
                if (r < n - 1 && isBoxComplete(r, c) && !gameState.boxes[r][c]) { claimBox(r, c, teamColor); completedCount++; }
            } else {
                if (c > 0 && isBoxComplete(r, c - 1) && !gameState.boxes[r][c - 1]) { claimBox(r, c - 1, teamColor); completedCount++; }
                if (c < n - 1 && isBoxComplete(r, c) && !gameState.boxes[r][c]) { claimBox(r, c, teamColor); completedCount++; }
            }
            return completedCount;
        }

        function isBoxComplete(br, bc) {
            return gameState.lines.horizontal[br][bc] !== null &&
                gameState.lines.horizontal[br + 1][bc] !== null &&
                gameState.lines.vertical[br][bc] !== null &&
                gameState.lines.vertical[br][bc + 1] !== null;
        }

        function claimBox(br, bc, teamColor) {
            gameState.boxes[br][bc] = teamColor;
            if (teamColor === 'blue') gameState.blueTeam.score++;
            else gameState.redTeam.score++;

            const boxEl = document.getElementById(`box-${br}-${bc}`);
            if (boxEl) {
                boxEl.classList.add(`${teamColor}-owner`);
                boxEl.innerText = teamColor === 'blue' ? '🔵' : '🔴';
                confettiFromElement(boxEl, 10);
            }

            const scoreEl = document.querySelector(`.team-score.${teamColor}`);
            if (scoreEl) {
                scoreEl.classList.remove('bump');
                void scoreEl.offsetWidth;
                scoreEl.classList.add('bump');
                setTimeout(() => scoreEl.classList.remove('bump'), 260);
            }
        }

        document.getElementById('rollDiceBtn').addEventListener('click', () => {
            if (gameState.gameOver) return;
            if (gameState.hasRolled) {
                alert('Ya lanzaste el dado. Utiliza tus movimientos restantes.');
                return;
            }

            sound.roll();
            const result = Math.floor(Math.random() * 3) + 1;
            gameState.remainingMoves = result;
            gameState.hasRolled = true;

            const dice = document.getElementById('dice3d');
            const diceFaceMain = document.getElementById('diceFaceMain');
            diceFaceMain.innerText = result;

            const exactRotations = {
                1: 'rotateX(0deg) rotateY(0deg)',
                2: 'rotateX(0deg) rotateY(-90deg)',
                3: 'rotateX(0deg) rotateY(-180deg)'
            };

            const randomX = (Math.floor(Math.random() * 2) + 2) * 360;
            const randomY = (Math.floor(Math.random() * 2) + 2) * 360;
            dice.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg)`;

            setTimeout(() => { dice.style.transform = exactRotations[result]; }, 800);

            const currentParticipant = gameState.allParticipants[gameState.currentTurnIndex];
            addLog(`${currentParticipant.name} lanzó el dado → ${result} movimiento(s).`);
            updateUI();
            saveGame();
        });

        function updateUI() {
            document.getElementById('blueScore').innerText = gameState.blueTeam.score;
            document.getElementById('redScore').innerText = gameState.redTeam.score;

            const currentParticipant = gameState.allParticipants[gameState.currentTurnIndex];
            const turnTextEl = document.getElementById('currentTurnText');
            turnTextEl.innerText = `${currentParticipant.name} — ${currentParticipant.team === 'blue' ? gameState.blueTeam.name : gameState.redTeam.name}`;
            turnTextEl.className = `turn-player ${currentParticipant.team}`;

            const diceFace = document.getElementById('diceFaceMain');
            diceFace.className = `dice-face ${currentParticipant.team}-dice`;

            document.getElementById('movesCounterText').innerHTML = `Movimientos restantes: <span>${gameState.remainingMoves}</span>`;
            document.getElementById('consecutiveCounterText').innerHTML = `Capturas consecutivas: <span>${gameState.consecutiveCaptures}/3</span>`;

            const listEl = document.getElementById('activeParticipantsList');
            listEl.innerHTML = '';
            gameState.allParticipants.forEach((p, idx) => {
                const item = document.createElement('div');
                item.className = `active-participant-item ${p.team}-part ${idx === gameState.currentTurnIndex ? 'active-turn' : ''}`;
                item.innerHTML = `<span>${p.team === 'blue' ? '🔵' : '🔴'} ${p.name}</span>`;
                listEl.appendChild(item);
            });
        }

        function addLog(msg) {
            const logEl = document.getElementById('activityLog');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerText = msg;
            logEl.insertBefore(entry, logEl.firstChild);
            if (logEl.children.length > 30) logEl.removeChild(logEl.lastChild);
        }

        function checkGameOver() {
            const n = gameState.boardSize;
            let totalBoxes = (n - 1) * (n - 1);
            let capturedBoxes = gameState.blueTeam.score + gameState.redTeam.score;

            if (capturedBoxes >= totalBoxes) {
                gameState.gameOver = true;
                sound.win();
                showVictoryModal();
                localStorage.removeItem('timbiriche_neon_save');
            }
        }

        function showVictoryModal() {
            const modal = document.getElementById('victoryModal');
            const titleEl = document.getElementById('victoryTitle');
            const subtitleEl = document.getElementById('victorySubtitle');

            document.getElementById('modalBlueScore').innerText = gameState.blueTeam.score;
            document.getElementById('modalRedScore').innerText = gameState.redTeam.score;

            if (gameState.blueTeam.score > gameState.redTeam.score) {
                titleEl.innerText = '¡VICTORIA AZUL!';
                titleEl.style.color = 'var(--blue-team)';
                subtitleEl.innerText = `${gameState.blueTeam.name} dominó el tablero con ${gameState.blueTeam.score} territorios.`;
            } else if (gameState.redTeam.score > gameState.blueTeam.score) {
                titleEl.innerText = '¡VICTORIA ROJA!';
                titleEl.style.color = 'var(--red-team)';
                subtitleEl.innerText = `${gameState.redTeam.name} dominó el tablero con ${gameState.redTeam.score} territorios.`;
            } else {
                titleEl.innerText = '¡EMPATE TÉCNICO!';
                titleEl.style.color = '#ffb700';
                subtitleEl.innerText = `Ambos equipos conquistaron ${gameState.blueTeam.score} territorios.`;
            }
            modal.classList.add('active');
            confettiBurstCenter(100);
            setTimeout(() => confettiBurstCenter(60), 500);
            setTimeout(() => confettiBurstCenter(60), 1100);
        }

        // --- GESTIÓN DE TEMA CLARO / OSCURO ---
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            gameState.isLightMode = !gameState.isLightMode;
            document.body.classList.toggle('light-mode', gameState.isLightMode);
            document.getElementById('themeToggleBtn').innerText = gameState.isLightMode ? '🌙' : '☀️';
            saveGame();
        });

        // --- GESTIÓN DE MODAL REGLAS ---
        document.getElementById('helpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('active');
        });
        document.getElementById('closeHelpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('active');
        });

        document.getElementById('restartGameBtn').addEventListener('click', () => {
            if (confirm('¿Deseas reiniciar la partida actual?')) {
                const n = gameState.boardSize;
                gameState.lines.horizontal = Array(n).fill(0).map(() => Array(n - 1).fill(null));
                gameState.lines.vertical = Array(n - 1).fill(0).map(() => Array(n).fill(null));
                gameState.boxes = Array(n - 1).fill(0).map(() => Array(n - 1).fill(null));
                gameState.blueTeam.score = 0;
                gameState.redTeam.score = 0;
                gameState.currentTurnIndex = 0;
                gameState.remainingMoves = 0;
                gameState.hasRolled = false;
                gameState.consecutiveCaptures = 0;
                gameState.gameOver = false;
                buildBoardDOM();
                updateUI();
                addLog('Partida reiniciada.');
                saveGame();
            }
        });

        document.getElementById('configReturnBtn').addEventListener('click', () => {
            if (confirm('¿Volver a la configuración? Se mantendrá guardada tu partida.')) {
                document.getElementById('gameScreen').classList.remove('active');
                document.getElementById('configScreen').classList.add('active');
                loadSavedGamePrompt();
            }
        });

        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.getElementById('victoryModal').classList.remove('active');
            document.getElementById('gameScreen').classList.remove('active');
            document.getElementById('configScreen').classList.add('active');
            localStorage.removeItem('timbiriche_neon_save');
            loadSavedGamePrompt();
        });

        document.getElementById('modalConfigBtn').addEventListener('click', () => {
            document.getElementById('victoryModal').classList.remove('active');
            document.getElementById('gameScreen').classList.remove('active');
            document.getElementById('configScreen').classList.add('active');
            localStorage.removeItem('timbiriche_neon_save');
            loadSavedGamePrompt();
        });

        document.getElementById('audioToggleBtn').addEventListener('click', () => {
            sound.enabled = !sound.enabled;
            document.getElementById('audioToggleBtn').innerText = sound.enabled ? '🔊' : '🔇';
        });

        window.onload = () => { initConfigUI(); };