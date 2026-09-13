  const ARCH_PHASES = ['Pre-design', 'SD', 'DD', 'CD', 'Bidding', 'CA'];

  const defaultPacket = {
    project: 'Riverside Lobby',
    project_id: 'riverside-lobby',
    profession_pack: 'architecture',
    phase: 'SD',
    goal: 'Review SD set — check egress clarity, lobby axis, and material callouts before DD.',
    constraints_summary: 'No leather · natural materials · FF&E cap $45k · preserve daylight to seating',
    open_run_ids: [],
    source: 'cos_route',
    decision_flags: ['needs_pm_signoff_on_egress']
  };

  const state = {
    view: 'cos',
    packet: null,
    packetOpened: false,
    packetCancelled: false,
    routedNotePending: false,
    lobbyRunning: false,
    designProject: 'lobby',
    handoffExpanded: false,
    cosSeeded: false,
  };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function setNav(view) {
    state.view = view;
    const cos = view === 'cos';
    document.getElementById('nav-cos').classList.toggle('active', cos);
    document.getElementById('nav-design').classList.toggle('active', !cos);
    document.getElementById('dot-cos').classList.toggle('dim', !cos);
    document.getElementById('dot-design').classList.toggle('dim', cos);
    document.getElementById('screen-cos').classList.toggle('active', cos);
    document.getElementById('screen-design').classList.toggle('active', !cos);
  }

  function addChatMsg(chatId, who, role, html) {
    const chat = document.getElementById(chatId);
    const div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'user' : role === 'system' ? 'system' : 'bot');
    if (role === 'system') {
      div.innerHTML = html;
    } else {
      div.innerHTML = `<div class="who">${esc(who)}</div>${html}`;
    }
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  function updateLobbyChip() {
    const chip = document.getElementById('lobby-run-chip');
    if (state.lobbyRunning) {
      chip.textContent = 'Running · drawing review';
      chip.className = 'chip running';
    } else {
      chip.textContent = 'Idle';
      chip.className = 'chip';
    }
  }

  /* ---------- CoS ---------- */
  function seedCoS() {
    if (state.cosSeeded) return;
    state.cosSeeded = true;
    addChatMsg('cos-chat', 'Chief of Staff', 'bot',
      'Hi Miles — I route studio work to the right specialist. Tell me what you need (review a set, open a project, check runs). <strong>I never generate images</strong>; Design does visual craft.');
  }

  function pickSuggest(text) {
    document.getElementById('cos-input').value = text;
    sendCoS();
  }

  function sendCoS() {
    const input = document.getElementById('cos-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addChatMsg('cos-chat', 'You', 'user', esc(text));

    const lower = text.toLowerCase();
    setTimeout(() => {
      if (isLobbyReviewIntent(lower)) {
        showHandoffPacket();
      } else if (lower.includes('kitchen') && (lower.includes('design') || lower.includes('open'))) {
        addChatMsg('cos-chat', 'Chief of Staff', 'bot',
          'Riverside Kitchen is Interior / Schematic. Opening Design for brainstorm — no formal handoff packet (early stage).');
        setTimeout(() => openKitchenInDesign(), 500);
      } else if (lower.includes('running') || lower.includes("what's running") || lower.includes('whats running')) {
        const runs = state.lobbyRunning
          ? 'One open run: <code>drawing_review</code> on Riverside Lobby.'
          : 'Nothing running right now. Lobby and Kitchen are idle.';
        addChatMsg('cos-chat', 'Chief of Staff', 'bot', runs);
      } else {
        addChatMsg('cos-chat', 'Chief of Staff', 'bot',
          'I can route reviews, open Design specialists, or check background runs. Try “Review Riverside Lobby SD set” — I’ll draft a confirmable handoff packet first.');
      }
    }, 380);
  }

  function isLobbyReviewIntent(lower) {
    return (
      (lower.includes('lobby') && (lower.includes('review') || lower.includes('sd'))) ||
      lower.includes('review riverside lobby') ||
      lower.includes('sd set')
    );
  }

  function showHandoffPacket() {
    state.packet = JSON.parse(JSON.stringify(defaultPacket));
    if (state.lobbyRunning) state.packet.open_run_ids = ['drawing_review_01'];
    state.packetOpened = false;
    state.packetCancelled = false;

    const p = state.packet;
    const flags = (p.decision_flags || []).map(f => `<span class="chip">${esc(f)}</span>`).join(' ') || '—';
    const runs = (p.open_run_ids && p.open_run_ids.length)
      ? p.open_run_ids.map(r => `<code>${esc(r)}</code>`).join(', ')
      : '<span style="color:var(--muted)">[]</span>';

    const html = `
      Drafted a <strong>Design handoff packet</strong> — confirm before opening Design (vs auto-jump).
      <div class="packet" id="packet-card">
        <div class="packet-h">
          <strong>Handoff packet</strong>
          <span class="chip">source: ${esc(p.source)}</span>
        </div>
        <div class="packet-body">
          <div class="packet-row"><span class="k">project</span><span class="v">${esc(p.project)}</span></div>
          <div class="packet-row"><span class="k">profession_pack</span><span class="v mono">${esc(p.profession_pack)}</span></div>
          <div class="packet-row"><span class="k">phase</span><span class="v mono">${esc(p.phase)}</span></div>
          <div class="packet-row"><span class="k">goal</span><span class="v" id="packet-goal-text">${esc(p.goal)}</span></div>
          <div class="packet-row"><span class="k">constraints_summary</span><span class="v">${esc(p.constraints_summary)}</span></div>
          <div class="packet-row"><span class="k">open_run_ids</span><span class="v mono">${runs}</span></div>
          <div class="packet-row"><span class="k">decision_flags</span><span class="v">${flags}</span></div>
        </div>
        <div class="edit-goal" id="edit-goal-row">
          <input id="edit-goal-input" value="${esc(p.goal)}" />
          <button class="btn small" onclick="saveGoalEdit()">Save</button>
        </div>
        <div class="packet-actions" id="packet-actions">
          <button class="btn small" id="btn-open-design" onclick="openInDesignFromPacket()">Open in Design</button>
          <button class="btn secondary small" onclick="toggleEditGoal()">Edit goal</button>
          <button class="btn ghost small" onclick="cancelPacket()">Cancel</button>
        </div>
      </div>`;

    addChatMsg('cos-chat', 'Chief of Staff', 'bot', html);
  }

  function toggleEditGoal() {
    const row = document.getElementById('edit-goal-row');
    if (!row) return;
    row.classList.toggle('show');
    if (row.classList.contains('show')) {
      document.getElementById('edit-goal-input').focus();
    }
  }

  function saveGoalEdit() {
    const input = document.getElementById('edit-goal-input');
    if (!input || !state.packet) return;
    state.packet.goal = input.value.trim() || state.packet.goal;
    const t = document.getElementById('packet-goal-text');
    if (t) t.textContent = state.packet.goal;
    document.getElementById('edit-goal-row').classList.remove('show');
  }

  function cancelPacket() {
    state.packetCancelled = true;
    const actions = document.getElementById('packet-actions');
    if (actions) {
      actions.innerHTML = '<span style="font-size:12px;color:var(--muted)">Packet cancelled — tell me another way to help.</span>';
    }
    const btn = document.getElementById('btn-open-design');
    if (btn) btn.disabled = true;
    addChatMsg('cos-chat', 'Chief of Staff', 'bot', 'Cancelled. Handoff stays here until you confirm — nothing opened in Design.');
  }

  function openInDesignFromPacket() {
    if (!state.packet || state.packetCancelled) return;
    saveGoalEditIfOpen();
    state.packetOpened = true;
    state.routedNotePending = true;
    state.designProject = 'lobby';
    const actions = document.getElementById('packet-actions');
    if (actions) {
      actions.innerHTML = '<span style="font-size:12px;color:var(--good)">✓ Opened in Design</span>';
    }
    enterDesign({ fromHandoff: true, project: 'lobby' });
  }

  function saveGoalEditIfOpen() {
    const row = document.getElementById('edit-goal-row');
    if (row && row.classList.contains('show')) saveGoalEdit();
  }

  function continueLobby() {
    // Continue chip still works — drafts packet if not already opened, else jumps Design
    if (state.packetOpened && state.packet) {
      enterDesign({ fromHandoff: true, project: 'lobby' });
      return;
    }
    addChatMsg('cos-chat', 'You', 'user', 'Continue Riverside Lobby');
    setTimeout(() => showHandoffPacket(), 300);
  }

  function openKitchenInDesign() {
    state.designProject = 'kitchen';
    state.packet = null;
    enterDesign({ fromHandoff: false, project: 'kitchen' });
  }

  function openDesignFromNav() {
    if (state.packetOpened && state.packet && state.designProject === 'lobby') {
      enterDesign({ fromHandoff: true, project: 'lobby', resume: true });
    } else if (state.designProject === 'kitchen') {
      enterDesign({ fromHandoff: false, project: 'kitchen', resume: true });
    } else {
      // Soft entry — prefer packet path
      addChatMsg('cos-chat', 'Chief of Staff', 'bot',
        'Design is ready when you confirm a handoff. Try “Review Riverside Lobby SD set” or use Continue on the pulse strip.');
    }
  }

  /* ---------- Design ---------- */
  function enterDesign({ fromHandoff, project, resume }) {
    setNav('design');
    const isLobby = project === 'lobby';
    document.getElementById('crumb').innerHTML = isLobby
      ? '<strong>Design</strong> · Riverside Lobby'
      : '<strong>Design</strong> · Riverside Kitchen';
    document.getElementById('design-title').textContent = isLobby ? 'Riverside Lobby' : 'Riverside Kitchen';
    document.getElementById('design-sub').textContent = isLobby
      ? 'Architecture · SD · chat-primary + canvas'
      : 'Interior · Schematic · early brainstorm';

    renderPhaseRail(isLobby ? 1 : 1); // SD for lobby; Schematic maps loosely — still show Architecture rail per brief for Lobby handoff

    const banner = document.getElementById('handoff-banner');
    const chat = document.getElementById('design-chat');

    if (fromHandoff && state.packet) {
      banner.style.display = '';
      document.getElementById('hb-goal').textContent = state.packet.goal;
      document.getElementById('hb-meta').textContent =
        `${state.packet.profession_pack} · ${state.packet.phase} · from Chief of Staff`;
      document.getElementById('hb-expand').textContent = formatPacketJson(state.packet);
      document.getElementById('hb-expand').classList.toggle('show', state.handoffExpanded);
      document.getElementById('hb-expand-btn').textContent = state.handoffExpanded ? 'Collapse' : 'Expand packet';

      if (!resume) {
        chat.innerHTML = '';
        addChatMsg('design-chat', 'Design', 'bot',
          `Got the handoff for <strong>${esc(state.packet.project)}</strong> (${esc(state.packet.profession_pack)} / ${esc(state.packet.phase)}). ` +
          `First move: start an <strong>advisory drawing review</strong> on the SD set, or switch to <strong>Redline</strong> for mark-up. Which do you want?`);
        applyTheme('night', true);
      }
      document.getElementById('canvas-panel').style.display = '';
      document.getElementById('split').classList.remove('canvas-collapsed');
    } else {
      banner.style.display = 'none';
      if (!resume) {
        chat.innerHTML = '';
        addChatMsg('design-chat', 'Design', 'bot',
          'Riverside Kitchen — Interior / Schematic. Early brainstorm; no formal CoS packet. Materials, layout, or client goals?');
        applyTheme('night', true);
      }
      document.getElementById('canvas-panel').style.display = '';
    }

    document.getElementById('design-status').textContent = fromHandoff ? 'Handoff received' : 'Ready';
  }

  function formatPacketJson(p) {
    return JSON.stringify(p, null, 2);
  }

  function togglePacketExpand() {
    state.handoffExpanded = !state.handoffExpanded;
    document.getElementById('hb-expand').classList.toggle('show', state.handoffExpanded);
    document.getElementById('hb-expand-btn').textContent = state.handoffExpanded ? 'Collapse' : 'Expand packet';
  }

  function renderPhaseRail(activeIndex) {
    const rail = document.getElementById('phase-rail');
    rail.innerHTML = ARCH_PHASES.map((name, i) => {
      const on = i === activeIndex ? ' on' : '';
      return `<button class="step-pill${on}" type="button" onclick="setPhase(${i})">${name}</button>`;
    }).join('');
  }

  function setPhase(i) {
    renderPhaseRail(i);
    if (state.view === 'design') {
      addChatMsg('design-chat', 'Design', 'bot',
        `Phase set to <strong>${esc(ARCH_PHASES[i])}</strong> (architecture pack). Suggested themes follow this phase.`);
      if (['CD', 'CA', 'DD'].includes(ARCH_PHASES[i])) {
        addChatMsg('design-chat', 'Design', 'bot', 'Suggestion: Redline or Blueprint fits documentation / mark-up.');
      }
    }
  }

  function backToCoS() {
    setNav('cos');
    document.getElementById('crumb').innerHTML = '<strong>Chief of Staff</strong> · chat';
    if (state.routedNotePending && state.packet) {
      state.routedNotePending = false;
      addChatMsg('cos-chat', '', 'system',
        `Routed to Design — ${esc(state.packet.project)} · ${esc(state.packet.phase)}`);
    }
  }

  function goCoS() {
    backToCoS();
  }

  function sendDesign() {
    const input = document.getElementById('design-input');
    const text = input.value.trim();
    if (!text) return;
    addChatMsg('design-chat', 'You', 'user', esc(text));
    input.value = '';
    setTimeout(() => {
      const lower = text.toLowerCase();
      if (lower.includes('redline')) { applyTheme('redline'); return; }
      if (lower.includes('blueprint')) { applyTheme('blueprint'); return; }
      if (lower.includes('trace')) { applyTheme('trace'); return; }
      if (lower.includes('night')) { applyTheme('night'); return; }
      if (lower.includes('review') || lower.includes('advisory')) {
        state.lobbyRunning = true;
        updateLobbyChip();
        document.getElementById('design-status').textContent = 'Review running…';
        addChatMsg('design-chat', 'Design', 'bot',
          'Starting advisory drawing review in the background. You can return to CoS — I’ll keep the canvas on Redline for mark-up.');
        applyTheme('redline', true);
        return;
      }
      addChatMsg('design-chat', 'Design', 'bot',
        'Noted. In production this would call edit/generate with Project Brain + handoff packet injected. (Prototype reply.)');
    }, 400);
  }

  function toggleCanvas() {
    const split = document.getElementById('split');
    const panel = document.getElementById('canvas-panel');
    const collapsed = split.classList.toggle('canvas-collapsed');
    panel.style.display = collapsed ? 'none' : '';
    if (collapsed) split.style.gridTemplateColumns = '1fr';
    else split.style.gridTemplateColumns = '';
  }

  const themes = {
    night: { bg: '#1a1a1a', line: '#ff3b30', type: 'solid', weight: 3, label: 'Night' },
    trace: { bg: '#f4f1ea', line: '#111111', type: 'solid', weight: 2, label: 'Trace' },
    redline: { bg: '#2a1515', line: '#ff3b30', type: 'dashed', weight: 4, label: 'Redline' },
    blueprint: { bg: '#0b3d91', line: '#ffffff', type: 'solid', weight: 2, label: 'Blueprint' },
  };

  function applyTheme(key, silent) {
    const t = themes[key];
    if (!t) return;
    document.querySelectorAll('.theme-swatch').forEach(el => el.classList.toggle('active', el.dataset.theme === key));
    paintCanvas(t);
    if (!silent && state.view === 'design') {
      addChatMsg('design-chat', 'Design', 'bot', `Theme set to <strong>${esc(t.label)}</strong>. Say “switch to redline” anytime.`);
    }
  }

  function paintCanvas(t) {
    const frame = document.getElementById('frame');
    const body = document.querySelector('.canvas-body');
    if (!frame || !body) return;
    body.style.background = `radial-gradient(circle at 30% 20%, ${t.bg}88 0%, transparent 45%), linear-gradient(180deg, ${t.bg}, #0e1016)`;
    const w = Number(t.weight || 3);
    const label = state.designProject === 'kitchen' ? 'Kitchen concept' : 'SD set · Lobby plan';
    frame.innerHTML = `${label}<br/><span style="opacity:.85">${esc(t.label)} · ${esc(t.line)} · ${esc(t.type)} · ${w}px</span>
      <div style="margin-top:14px;width:70%;height:${w}px;border-radius:2px;background-image:repeating-linear-gradient(90deg, ${t.line} 0, ${t.line} ${t.type==='dashed'?6:w}px, transparent ${t.type==='dashed'?6:w}px, transparent ${t.type==='dashed'?14:w}px);background-color:${t.type==='solid'?t.line:'transparent'};"></div>`;
  }

  /* init */
  seedCoS();
  updateLobbyChip();
  renderPhaseRail(1);
