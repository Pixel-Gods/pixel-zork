// game.js — simple Zork-like engine
(() => {
  const output = document.getElementById('output');
  const cmdInput = document.getElementById('command');
  const submitBtn = document.getElementById('submit');
  const restartBtn = document.getElementById('restart');
  const helpBtn = document.getElementById('help');
  const locationEl = document.getElementById('location');
  const movesEl = document.getElementById('moves');
  const invList = document.getElementById('inv-list');

  // Define rooms
  const ROOMS = {
    foyer: {
      name: "Foyer",
      desc: "You are standing in the foyer of a dark old house. A dusty hallway leads north. There is a small key on a table.",
      exits: { north: 'hallway' },
      items: ['small key']
    },
    hallway: {
      name: "Hallway",
      desc: "A long hallway with portraits on the walls. Doors lead east and west. Stairs go up.",
      exits: { south: 'foyer', east: 'kitchen', west: 'library', up: 'attic' },
      items: []
    },
    kitchen: {
      name: "Kitchen",
      desc: "An abandoned kitchen. A rusty knife lies by the sink. There's a closed cellar door to the north with a lock.",
      exits: { west: 'hallway', north: 'cellar' },
      items: ['rusty knife'],
      locked: { north: true }
    },
    cellar: {
      name: "Cellar",
      desc: "A cold, damp cellar. You see a glowing gem on a pedestal.",
      exits: { south: 'kitchen' },
      items: ['glowing gem']
    },
    library: {
      name: "Library",
      desc: "Rows of old books. A large book on a lectern looks out of place.",
      exits: { east: 'hallway' },
      items: ['ancient book']
    },
    attic: {
      name: "Attic",
      desc: "Cobwebs and trunks. A hatch is here leading further up.",
      exits: { down: 'hallway', up: 'roof' },
      items: []
    },
    roof: {
      name: "Roof",
      desc: "You are on the roof under a starry sky. There's a telescope here.",
      exits: { down: 'attic' },
      items: ['telescope']
    }
  };

  // Game state
  let state = {
    location: 'foyer',
    inventory: [],
    moves: 0
  };

  function write(text, cls) {
    const p = document.createElement('div');
    if (cls) p.className = cls;
    p.innerHTML = text;
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }

  function describe(locationKey) {
    const room = ROOMS[locationKey];
    write(`<strong>${room.name}</strong> — ${room.desc}`);
    if (room.items && room.items.length) {
      write('You see here: ' + room.items.map(i => `<span class="command">${i}</span>`).join(', '), 'system');
    }
    updateStatus();
  }

  function updateStatus() {
    const loc = ROOMS[state.location];
    locationEl.textContent = loc.name;
    movesEl.textContent = 'Moves: ' + state.moves;
    invList.textContent = state.inventory.length ? state.inventory.join(', ') : '—';
  }

  function restart() {
    state = { location: 'foyer', inventory: [], moves: 0 };
    output.innerHTML = '';
    write('<em>Game restarted.</em>', 'system');
    describe(state.location);
  }

  function showHelp() {
    write(`<strong>Commands:</strong> go [dir], north/south/east/west/up/down, look, take <item>, drop <item>, inventory, use <item>, restart`, 'system');
  }

  function move(dir) {
    const room = ROOMS[state.location];
    const dest = room.exits[dir];
    if (!dest) {
      write("You can't go that way.");
      return;
    }
    // check locked doors
    if (room.locked && room.locked[dir]) {
      write("The way is locked.");
      return;
    }
    state.location = dest;
    state.moves++;
    describe(state.location);
  }

  function look() {
    describe(state.location);
  }

  function take(itemName) {
    const room = ROOMS[state.location];
    const idx = room.items ? room.items.indexOf(itemName) : -1;
    if (idx === -1) {
      write("You don't see that here.");
      return;
    }
    room.items.splice(idx, 1);
    state.inventory.push(itemName);
    state.moves++;
    write(`You take the ${itemName}.`);
    updateStatus();
    // special: taking gem ends the game
    if (itemName === 'glowing gem') {
      write('<strong>As you pick up the gem, the house trembles. You have reclaimed the glowing gem — you win!</strong>');
    }
  }

  function drop(itemName) {
    const idx = state.inventory.indexOf(itemName);
    if (idx === -1) {
      write("You don't have that.");
      return;
    }
    state.inventory.splice(idx, 1);
    ROOMS[state.location].items = ROOMS[state.location].items || [];
    ROOMS[state.location].items.push(itemName);
    state.moves++;
    write(`You drop the ${itemName}.`);
    updateStatus();
  }

  function inventory() {
    write('You are carrying: ' + (state.inventory.length ? state.inventory.join(', ') : 'nothing'), 'system');
  }

  function use(itemName) {
    if (!itemName) {
      write("Use what?");
      return;
    }
    if (!state.inventory.includes(itemName)) {
      write("You don't have that item.");
      return;
    }
    // Puzzle: small key unlocks kitchen north (cellar)
    if (itemName === 'small key' && state.location === 'kitchen') {
      if (ROOMS.kitchen.locked && ROOMS.kitchen.locked.north) {
        ROOMS.kitchen.locked.north = false;
        state.moves++;
        write("You unlock the cellar door with the small key. The door is now open.");
        return;
      } else {
        write("There's nothing to unlock here with the key.");
        return;
      }
    }
    if (itemName === 'rusty knife' && state.location === 'cellar') {
      write("You cannot use the knife here in a special way, but it might be useful elsewhere.");
      return;
    }
    write("You try to use it, but nothing special happens.");
  }

  function parse(input) {
    if (!input) return;
    const raw = input.trim();
    if (!raw) return;
    write(`<span class="command">&gt; ${escapeHtml(raw)}</span>`);
    const parts = raw.toLowerCase().split(/\s+/);
    const verb = parts[0];
    const rest = parts.slice(1).join(' ');

    if (verb === 'go' && rest) move(normalizeDir(rest));
    else if (['north','south','east','west','up','down','n','s','e','w'].includes(verb)) {
      move(normalizeDir(verb));
    } else if (verb === 'look') look();
    else if (verb === 'take' && rest) take(rest);
    else if (verb === 'get' && rest) take(rest);
    else if (verb === 'drop' && rest) drop(rest);
    else if (verb === 'inventory' || verb === 'i') inventory();
    else if (verb === 'use' && rest) use(rest);
    else if (verb === 'help') showHelp();
    else if (verb === 'restart') restart();
    else write("I don't understand that command. Type 'help' for a short list of commands.", 'system');

    updateStatus();
  }

  function normalizeDir(t) {
    if (!t) return t;
    t = t.replace('.', '');
    const map = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
    return map[t] || t;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]'/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // UI wiring
  submitBtn.addEventListener('click', () => {
    parse(cmdInput.value);
    cmdInput.value = '';
    cmdInput.focus();
  });
  cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });
  restartBtn.addEventListener('click', restart);
  helpBtn.addEventListener('click', showHelp);

  // initial
  write('<em>Welcome to Pixel Zork — a tiny browser text adventure.</em>', 'system');
  describe(state.location);
  cmdInput.focus();
})();
