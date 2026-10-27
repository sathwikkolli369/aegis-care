/* ==========================================================================
   AEGIS CARE - Next-Generation Hospital Infrastructure
   Team: AEGIS NEXUS
   Interactive Engine: Background Grid, ECG Simulator, Command Center & Audio
   ========================================================================== */

// --- Audio Synthesizer (Zero-dependency Web Audio API) ---
class HospitalAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playBeep(freq = 880, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  playHeartbeat() {
    this.playBeep(640, 'sine', 0.06, 0.03);
    setTimeout(() => this.playBeep(520, 'sine', 0.08, 0.02), 80);
  }

  playAlert() {
    this.playBeep(980, 'triangle', 0.12, 0.06);
    setTimeout(() => this.playBeep(1200, 'triangle', 0.14, 0.06), 140);
  }

  playClick() {
    this.playBeep(1200, 'sine', 0.03, 0.015);
  }
}

const sfx = new HospitalAudioEngine();

// --- Background Mesh Particle Canvas ---
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const particleCount = 45;
  const maxDistance = 140;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  class NodeParticle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.45;
      this.vy = (Math.random() - 0.5) * 0.45;
      this.radius = Math.random() * 2 + 1;
      this.isHospitalHub = Math.random() > 0.85;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += 0.04;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
      ctx.beginPath();
      const currentRadius = this.isHospitalHub 
        ? this.radius + Math.sin(this.pulse) * 1.5 
        : this.radius;
      
      ctx.arc(this.x, this.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
      ctx.fillStyle = this.isHospitalHub ? '#00f2fe' : 'rgba(148, 163, 184, 0.35)';
      ctx.shadowBlur = this.isHospitalHub ? 12 : 0;
      ctx.shadowColor = '#00f2fe';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new NodeParticle());
  }

  let mouse = { x: null, y: null };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const alpha = (1 - dist / maxDistance) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particles[i].isHospitalHub || particles[j].isHospitalHub 
            ? `rgba(0, 242, 254, ${alpha * 1.5})` 
            : `rgba(148, 163, 184, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Mouse interactive link
      if (mouse.x !== null) {
        const mdx = particles[i].x - mouse.x;
        const mdy = particles[i].y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 160) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(0, 242, 254, ${(1 - mdist / 160) * 0.25})`;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// --- Live Hero ECG Monitor Simulator ---
function initHeroECG() {
  const canvas = document.getElementById('ecg-hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.parentElement.clientWidth || 320;
  let height = canvas.height = 70;

  window.addEventListener('resize', () => {
    if (canvas.parentElement) {
      width = canvas.width = canvas.parentElement.clientWidth || 320;
      height = canvas.height = 70;
    }
  });

  let x = 0;
  let points = new Array(Math.floor(width)).fill(height / 2);
  let step = 0;

  function getEcgY(t) {
    const cycle = t % 85;
    const mid = height / 2;
    // P wave
    if (cycle > 12 && cycle < 20) {
      return mid - Math.sin((cycle - 12) / 8 * Math.PI) * 7;
    }
    // Q dip
    if (cycle >= 24 && cycle < 28) {
      return mid + 6;
    }
    // R spike
    if (cycle >= 28 && cycle < 34) {
      return mid - 32;
    }
    // S dip
    if (cycle >= 34 && cycle < 38) {
      return mid + 12;
    }
    // T wave
    if (cycle > 46 && cycle < 60) {
      return mid - Math.sin((cycle - 46) / 14 * Math.PI) * 11;
    }
    return mid + (Math.random() - 0.5) * 1.2;
  }

  function draw() {
    step++;
    const newY = getEcgY(step);
    points.push(newY);
    if (points.length > width) {
      points.shift();
    }

    ctx.clearRect(0, 0, width, height);

    // Glow line
    ctx.beginPath();
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f2fe';

    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(i, points[i]);
      else ctx.lineTo(i, points[i]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glowing scan head
    const lastX = points.length - 1;
    const lastY = points[lastX];
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;

    requestAnimationFrame(draw);
  }

  draw();
}

// --- Hospital Bed Data & Simulation State ---
const mockBeds = [
  { id: 'ICU-01', ward: 'ICU', patient: 'Elena Vance', age: 58, diagnosis: 'Post-CABG Hemodynamic Stabilization', spo2: 98, hr: 74, bp: '120/78', news2: 1, status: 'occupied', telemetry: 'Synchronized', doc: 'Dr. Sterling, MD' },
  { id: 'ICU-02', ward: 'ICU', patient: 'Marcus Chen', age: 64, diagnosis: 'Severe ARDS / Vent Mode PRVC', spo2: 91, hr: 112, bp: '95/62', news2: 6, status: 'critical', telemetry: 'Continuous', doc: 'Dr. Sterling, MD' },
  { id: 'ICU-03', ward: 'ICU', patient: 'Sarah Jenkins', age: 49, diagnosis: 'Neuro-Trauma Subdural Monitoring', spo2: 99, hr: 68, bp: '128/82', news2: 2, status: 'occupied', telemetry: 'Synchronized', doc: 'Dr. Aris, Neuro' },
  { id: 'ICU-04', ward: 'ICU', patient: null, age: null, diagnosis: 'Ready for Admission / Sanitized', spo2: null, hr: null, bp: null, news2: 0, status: 'available', telemetry: 'Online Standby', doc: 'Unassigned' },
  { id: 'ER-T01', ward: 'ER', patient: 'David Kowalski', age: 34, diagnosis: 'Acute Polytrauma / Shock Protocol', spo2: 94, hr: 128, bp: '88/54', news2: 7, status: 'critical', telemetry: 'Continuous Waveform', doc: 'Dr. T. Ramos, Trauma' },
  { id: 'ER-T02', ward: 'ER', patient: 'Priya Sharma', age: 29, diagnosis: 'Suspected Appendicitis / Ultrasound Pending', spo2: 99, hr: 82, bp: '118/74', news2: 2, status: 'occupied', telemetry: 'Periodic 5m', doc: 'Dr. T. Ramos, Trauma' },
  { id: 'ER-T03', ward: 'ER', patient: null, age: null, diagnosis: 'Cleaned & UV-C Disinfected', spo2: null, hr: null, bp: null, news2: 0, status: 'available', telemetry: 'Online Standby', doc: 'Unassigned' },
  { id: 'SURG-01', ward: 'SURG', patient: 'Arthur Pendelton', age: 71, diagnosis: 'Post-Op Knee Arthroplasty (PACU-2)', spo2: 97, hr: 64, bp: '132/80', news2: 1, status: 'occupied', telemetry: 'Telemetry Tagged', doc: 'Dr. H. Vance, Ortho' },
  { id: 'SURG-02', ward: 'SURG', patient: 'Maria Santos', age: 42, diagnosis: 'Laparoscopic Cholecystectomy Post-Op', spo2: 98, hr: 72, bp: '114/70', news2: 1, status: 'occupied', telemetry: 'Telemetry Tagged', doc: 'Dr. H. Vance, Ortho' },
  { id: 'ISOL-01', ward: 'ISOL', patient: 'Tariq Al-Mansoor', age: 53, diagnosis: 'Negative-Pressure Aerosol Isolation', spo2: 95, hr: 86, bp: '122/80', news2: 3, status: 'isolation', telemetry: 'Negative Pressure -28Pa', doc: 'Dr. S. Kim, ID' },
  { id: 'ISOL-02', ward: 'ISOL', patient: null, age: null, diagnosis: 'HEPA Flush Complete / Ready', spo2: null, hr: null, bp: null, news2: 0, status: 'available', telemetry: 'Negative Pressure -30Pa', doc: 'Unassigned' },
  { id: 'GEN-104', ward: 'GEN', patient: 'Chloe Dubois', age: 38, diagnosis: 'Pneumonia IV Antibiotics - Day 3', spo2: 96, hr: 76, bp: '116/74', news2: 2, status: 'occupied', telemetry: 'Smart Patch Wireless', doc: 'Dr. O. Zhao, Internal' },
];

let activeFilter = 'ALL';

function renderBedMatrix() {
  const container = document.getElementById('bed-matrix-grid');
  if (!container) return;

  const filteredBeds = activeFilter === 'ALL' 
    ? mockBeds 
    : mockBeds.filter(b => b.ward === activeFilter);

  container.innerHTML = '';

  filteredBeds.forEach(bed => {
    const card = document.createElement('div');
    let statusClass = 'bed-available';
    let statusBadge = '<span class="badge-tag bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Available</span>';
    let beaconColor = 'beacon-green';

    if (bed.status === 'occupied') {
      statusClass = 'bed-occupied';
      statusBadge = '<span class="badge-tag bg-sky-500/20 text-sky-400 border border-sky-500/30">Occupied</span>';
      beaconColor = 'beacon-cyan';
    } else if (bed.status === 'critical') {
      statusClass = 'bed-critical';
      statusBadge = '<span class="badge-tag bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL NEWS2</span>';
      beaconColor = 'beacon-rose';
    } else if (bed.status === 'isolation') {
      statusClass = 'bed-isolation';
      statusBadge = '<span class="badge-tag bg-amber-500/20 text-amber-400 border border-amber-500/30">Bio-Isolation</span>';
      beaconColor = 'beacon-amber';
    }

    card.className = `bed-item p-4 rounded-xl flex flex-col justify-between ${statusClass}`;
    card.onclick = () => openBedModal(bed);

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="status-beacon ${beaconColor}"></span>
            <span class="font-mono font-bold text-sm tracking-wide text-white">${bed.id}</span>
          </div>
          ${statusBadge}
        </div>
        
        ${bed.patient ? `
          <h4 class="font-semibold text-sm text-slate-100">${bed.patient} <span class="text-xs text-slate-400 font-normal">(${bed.age}y)</span></h4>
          <p class="text-xs text-slate-400 mt-1 line-clamp-1">${bed.diagnosis}</p>
        ` : `
          <h4 class="font-semibold text-sm text-slate-300">Sanitized & Standby</h4>
          <p class="text-xs text-slate-400 mt-1">${bed.diagnosis}</p>
        `}
      </div>

      <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
        ${bed.patient ? `
          <div class="flex items-center gap-2 font-mono">
            <span class="text-sky-300">SpO2: <strong class="${bed.spo2 < 93 ? 'text-rose-400' : 'text-emerald-400'}">${bed.spo2}%</strong></span>
            <span class="text-slate-400">•</span>
            <span class="text-sky-300">HR: <strong>${bed.hr}</strong></span>
          </div>
          <span class="font-mono text-xs px-2 py-0.5 rounded ${bed.news2 >= 5 ? 'bg-rose-500/30 text-rose-300 font-bold' : 'bg-slate-800 text-slate-300'}">
            NEWS2: ${bed.news2}
          </span>
        ` : `
          <span class="text-emerald-400 font-mono flex items-center gap-1.5 text-[11px]">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Ready for Dispatch
          </span>
          <span class="text-slate-400 font-mono text-[11px]">Turnaround: 4m</span>
        `}
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Modal handling
function openBedModal(bed) {
  sfx.playClick();
  const modal = document.getElementById('bed-details-modal');
  const title = document.getElementById('modal-bed-title');
  const body = document.getElementById('modal-bed-content');

  if (!modal || !title || !body) return;

  title.innerText = `Unit Details — ${bed.id} (${bed.ward})`;

  if (bed.patient) {
    body.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-700/50">
          <div class="text-xs text-slate-400">Patient Name</div>
          <div class="text-base font-bold text-white mt-0.5">${bed.patient}</div>
          <div class="text-xs text-cyan-400 font-mono mt-1">MRN: #AEG-${Math.floor(100000 + Math.random() * 900000)}</div>
        </div>
        <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-700/50">
          <div class="text-xs text-slate-400">Diagnosis & Protocol</div>
          <div class="text-sm font-semibold text-slate-200 mt-0.5">${bed.diagnosis}</div>
          <div class="text-xs text-slate-400 mt-1">${bed.doc}</div>
        </div>
        <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-700/50">
          <div class="text-xs text-slate-400">Clinical Deterioration Risk</div>
          <div class="text-lg font-bold font-mono ${bed.news2 >= 5 ? 'text-rose-400' : 'text-emerald-400'} mt-0.5">
            NEWS2 Score: ${bed.news2} ${bed.news2 >= 5 ? '(HIGH RISK)' : '(LOW)'}
          </div>
          <div class="text-xs text-slate-400 mt-1">AI Early Warning: Stable</div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 mb-5">
        <div class="flex items-center justify-between mb-3">
          <div class="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <span class="status-beacon beacon-green"></span> Live Medical Telemetry Stream
          </div>
          <div class="text-xs font-mono text-slate-400">HL7 / FHIR R4 Pipeline: 2ms sync</div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="p-2.5 rounded bg-slate-800/80">
            <div class="text-[11px] text-slate-400">O2 Saturation</div>
            <div class="text-xl font-mono font-bold ${bed.spo2 < 93 ? 'text-rose-400' : 'text-sky-300'}">${bed.spo2}%</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Venturi Mask 4L</div>
          </div>
          <div class="p-2.5 rounded bg-slate-800/80">
            <div class="text-[11px] text-slate-400">Heart Rate</div>
            <div class="text-xl font-mono font-bold text-emerald-400">${bed.hr} <span class="text-xs">BPM</span></div>
            <div class="text-[10px] text-slate-400 mt-0.5">Normal Sinus</div>
          </div>
          <div class="p-2.5 rounded bg-slate-800/80">
            <div class="text-[11px] text-slate-400">Blood Pressure</div>
            <div class="text-xl font-mono font-bold text-slate-100">${bed.bp}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">MAP: 84 mmHg</div>
          </div>
          <div class="p-2.5 rounded bg-slate-800/80">
            <div class="text-[11px] text-slate-400">Telemetry Link</div>
            <div class="text-sm font-mono font-bold text-cyan-300 mt-1">${bed.telemetry}</div>
            <div class="text-[10px] text-emerald-400 mt-0.5">100% Packet Integrity</div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-end">
        <button onclick="simulateOrderMedication('${bed.id}')" class="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition flex items-center gap-1.5">
          <i data-lucide="file-plus" class="w-3.5 h-3.5 text-cyan-400"></i> Dispatch Smart CPOE Order
        </button>
        <button onclick="dischargeBed('${bed.id}')" class="px-3.5 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition flex items-center gap-1.5">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Authorize Bed Turnover / Discharge
        </button>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="text-center py-8">
        <div class="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="check-check" class="w-7 h-7"></i>
        </div>
        <h4 class="text-lg font-bold text-white">Bed Is Cleaned, Sanitized & Calibrated</h4>
        <p class="text-slate-400 text-sm max-w-md mx-auto mt-1 mb-5">
          Air sterilization cycle complete. Telemetry monitors calibrated and awaiting automated trauma intake or elective admission dispatch.
        </p>
        <button onclick="admitToSpecificBed('${bed.id}')" class="btn-primary text-xs mx-auto">
          <i data-lucide="user-plus" class="w-4 h-4"></i> Dispatch Patient From ER Queue To This Bed
        </button>
      </div>
    `;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) window.lucide.createIcons();
}

function closeBedModal() {
  sfx.playClick();
  const modal = document.getElementById('bed-details-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function dischargeBed(bedId) {
  const bed = mockBeds.find(b => b.id === bedId);
  if (bed) {
    showToastNotification(`Bed ${bedId} Turnover Initiated. Patient discharged to Care Coordination.`);
    bed.status = 'available';
    bed.patient = null;
    bed.age = null;
    bed.diagnosis = 'Sterilizing & UV-C Disinfection in progress';
    bed.news2 = 0;
    renderBedMatrix();
    updateCommandCenterKPIs();
    closeBedModal();
    sfx.playBeep(780, 'sine', 0.1);
  }
}

function admitToSpecificBed(bedId) {
  const bed = mockBeds.find(b => b.id === bedId);
  if (bed) {
    bed.status = 'occupied';
    bed.patient = 'Alexander Petrov';
    bed.age = 45;
    bed.diagnosis = 'Post-Operative Acute Observation';
    bed.spo2 = 98;
    bed.hr = 78;
    bed.bp = '122/80';
    bed.news2 = 1;
    bed.telemetry = 'Continuous Bio-Patch';
    bed.doc = 'Dr. S. Chen, Surgery';
    showToastNotification(`Patient admitted to ${bedId} via Intelligent Clinical Flow`);
    renderBedMatrix();
    updateCommandCenterKPIs();
    closeBedModal();
    sfx.playBeep(940, 'sine', 0.12);
  }
}

function simulateOrderMedication(bedId) {
  showToastNotification(`CPOE Order sent to Automated In-Hospital Pharmacy Robot for ${bedId}`);
  sfx.playBeep(1100, 'triangle', 0.08);
}

// Quick Admit to any open bed
function admitNewPatient() {
  const openBed = mockBeds.find(b => b.status === 'available');
  if (!openBed) {
    showToastNotification('Alert: All acute beds occupied! Dynamic overflow protocol triggered.', 'warning');
    sfx.playAlert();
    return;
  }
  admitToSpecificBed(openBed.id);
}

// Emergency Mass Casualty / Trauma Influx Simulator
function triggerEmergencyInflux() {
  sfx.playAlert();
  showToastNotification('🚨 CODE ORANGE INFLUX: 3 Critical Trauma Arrivals via Helicopter Transports!', 'critical');

  const banner = document.getElementById('trauma-banner');
  if (banner) {
    banner.classList.remove('hidden');
  }

  // Auto allocate
  setTimeout(() => {
    let allocated = 0;
    mockBeds.forEach(bed => {
      if (bed.status === 'available' && allocated < 2) {
        bed.status = 'critical';
        bed.patient = `Emergency Trauma #${104 + allocated}`;
        bed.age = 28 + allocated * 7;
        bed.diagnosis = 'Blunt Polytrauma / Immediate Surgical Staging';
        bed.spo2 = 92 - allocated;
        bed.hr = 124 + allocated * 5;
        bed.bp = '90/58';
        bed.news2 = 7;
        bed.doc = 'Trauma Response Alpha';
        allocated++;
      }
    });
    renderBedMatrix();
    updateCommandCenterKPIs();
    showToastNotification('AEGIS AI Auto-Reserved 2 Surgical Suites & Pre-Warmed Blood Bank units.', 'success');
  }, 1200);
}

function dismissTraumaBanner() {
  const banner = document.getElementById('trauma-banner');
  if (banner) banner.classList.add('hidden');
}

// --- Live KPI Counters & State ---
function updateCommandCenterKPIs() {
  const occupiedCount = mockBeds.filter(b => b.status !== 'available').length;
  const criticalCount = mockBeds.filter(b => b.status === 'critical').length;
  const totalBeds = mockBeds.length;
  const rate = Math.round((occupiedCount / totalBeds) * 100);

  const bedOccupancyEl = document.getElementById('kpi-occupancy');
  const criticalEl = document.getElementById('kpi-critical');

  if (bedOccupancyEl) bedOccupancyEl.innerText = `${rate}%`;
  if (criticalEl) criticalEl.innerText = `${criticalCount}`;
}

// --- Dynamic Dashboard Tabs ---
function setupDashboardTabs() {
  const tabs = document.querySelectorAll('.dashboard-tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sfx.playClick();
      const target = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      panels.forEach(p => {
        if (p.id === `tab-panel-${target}`) {
          p.classList.remove('hidden');
          // GSAP fade in
          if (window.gsap) {
            window.gsap.fromTo(p, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
          }
        } else {
          p.classList.add('hidden');
        }
      });
    });
  });
}

// Ward Filter Buttons
function setupWardFilters() {
  const filters = document.querySelectorAll('.ward-filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      filters.forEach(b => {
        b.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
        b.classList.add('bg-slate-800/80', 'text-slate-400', 'border-slate-700/50');
      });
      btn.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
      btn.classList.remove('bg-slate-800/80', 'text-slate-400');

      activeFilter = btn.getAttribute('data-ward');
      renderBedMatrix();
    });
  });
}

// --- Role Switcher (Persona Personalization) ---
function setupRoleSwitcher() {
  const select = document.getElementById('role-selector');
  if (!select) return;

  const roleTitle = document.getElementById('role-summary-title');
  const roleDesc = document.getElementById('role-summary-desc');
  const roleKpi1 = document.getElementById('role-kpi-1-val');
  const roleKpi1Lbl = document.getElementById('role-kpi-1-lbl');
  const roleKpi2 = document.getElementById('role-kpi-2-val');
  const roleKpi2Lbl = document.getElementById('role-kpi-2-lbl');

  select.addEventListener('change', (e) => {
    sfx.playClick();
    const role = e.target.value;

    if (role === 'director') {
      if (roleTitle) roleTitle.innerText = 'Hospital Operations Director Focus';
      if (roleDesc) roleDesc.innerText = 'Optimizing bed throughput, discharge lounge transitions, and multi-campus resource allocation.';
      if (roleKpi1) roleKpi1.innerText = '$2.4M';
      if (roleKpi1Lbl) roleKpi1Lbl.innerText = 'Annual Infrastructure Savings';
      if (roleKpi2) roleKpi2.innerText = '22 mins';
      if (roleKpi2Lbl) roleKpi2Lbl.innerText = 'Avg Bed Turnover Latency';
    } else if (role === 'cmo') {
      if (roleTitle) roleTitle.innerText = 'Chief Medical Officer Focus';
      if (roleDesc) roleDesc.innerText = 'Zero-miss clinical deterioration protocols, AI early sepsis detection, and physician order harmony.';
      if (roleKpi1) roleKpi1.innerText = '0.00%';
      if (roleKpi1Lbl) roleKpi1Lbl.innerText = 'Delayed Sepsis Interventions';
      if (roleKpi2) roleKpi2.innerText = '4.2 hrs';
      if (roleKpi2Lbl) roleKpi2Lbl.innerText = 'Avg Early Warning Lead Time';
    } else if (role === 'nursing') {
      if (roleTitle) roleTitle.innerText = 'Chief Nursing Officer Focus';
      if (roleDesc) roleDesc.innerText = 'Balancing nurse-to-patient acuity ratios, eliminating documentation friction, and instant RTLS crash cart tracking.';
      if (roleKpi1) roleKpi1.innerText = '45 sec';
      if (roleKpi1Lbl) roleKpi1Lbl.innerText = 'RTLS Crash Cart Locate Time';
      if (roleKpi2) roleKpi2.innerText = '-72%';
      if (roleKpi2Lbl) roleKpi2Lbl.innerText = 'Manual Nurse Charting Load';
    } else if (role === 'it') {
      if (roleTitle) roleTitle.innerText = 'Chief Healthcare IT Architect Focus';
      if (roleDesc) roleDesc.innerText = 'Zero-trust edge security, microsecond HL7/FHIR telemetry ingest, and 99.999% fault tolerance.';
      if (roleKpi1) roleKpi1.innerText = '1.2ms';
      if (roleKpi1Lbl) roleKpi1Lbl.innerText = 'FHIR R4 Telemetry Ingest Latency';
      if (roleKpi2) roleKpi2.innerText = '99.999%';
      if (roleKpi2Lbl) roleKpi2Lbl.innerText = 'Multi-Campus Grid Availability';
    }

    showToastNotification(`Perspective changed: ${select.options[select.selectedIndex].text}`);
  });
}

// --- Interactive ROI & Capacity Calculator ---
function setupCapacityCalculator() {
  const bedsSlider = document.getElementById('calc-beds');
  const erSlider = document.getElementById('calc-er');
  const bedsVal = document.getElementById('calc-beds-val');
  const erVal = document.getElementById('calc-er-val');

  const outHours = document.getElementById('calc-out-hours');
  const outBeds = document.getElementById('calc-out-beds');
  const outSavings = document.getElementById('calc-out-savings');

  function calculate() {
    if (!bedsSlider || !erSlider) return;
    const beds = parseInt(bedsSlider.value, 10);
    const er = parseInt(erSlider.value, 10);

    if (bedsVal) bedsVal.innerText = `${beds} Beds`;
    if (erVal) erVal.innerText = `${er} Patients/Day`;

    // Calculations based on AEGIS infrastructure metrics:
    // 35 minutes saved per patient bed transition
    // 2.2 nurse hours saved per shift per 10 beds
    const hoursSavedYearly = Math.round((beds * 2.2 * 365) / 10 + er * 0.7 * 365);
    const bottleneckDrop = Math.min(88, Math.round(55 + (beds / 1000) * 20));
    const annualSavingsM = ((beds * 2800 + er * 1200) / 1000000).toFixed(2);

    if (outHours) outHours.innerText = `${hoursSavedYearly.toLocaleString()} hrs/yr`;
    if (outBeds) outBeds.innerText = `-${bottleneckDrop}%`;
    if (outSavings) outSavings.innerText = `$${annualSavingsM}M`;
  }

  if (bedsSlider && erSlider) {
    bedsSlider.addEventListener('input', calculate);
    erSlider.addEventListener('input', calculate);
    calculate();
  }
}

// --- Telemetry IoT Interactive Sandbox ---
function setupTelemetrySandbox() {
  const o2Btn = document.getElementById('sim-o2-leak');
  const o2Val = document.getElementById('telemetry-o2-val');
  const o2Status = document.getElementById('telemetry-o2-status');

  if (o2Btn) {
    o2Btn.addEventListener('click', () => {
      sfx.playAlert();
      if (o2Val) o2Val.innerText = '84.2 PSI';
      if (o2Status) {
        o2Status.innerHTML = '<span class="status-beacon beacon-rose"></span> Micro-drop detected — Automated Secondary Bulk Valve Switched (Failover: 0.14s)';
        o2Status.className = 'text-xs text-rose-400 mt-2 flex items-center gap-1.5';
      }
      showToastNotification('IoT Telemetry: Medical O2 Reserve Failover engaged automatically.', 'critical');

      setTimeout(() => {
        if (o2Val) o2Val.innerText = '99.8 PSI';
        if (o2Status) {
          o2Status.innerHTML = '<span class="status-beacon beacon-green"></span> Mainline Restored via Auxiliary Cryogenic Loop';
          o2Status.className = 'text-xs text-emerald-400 mt-2 flex items-center gap-1.5';
        }
        showToastNotification('Medical O2 Pressure back to nominal (99.8 PSI).', 'success');
      }, 4000);
    });
  }
}

// --- Predictive Sepsis Intervention Simulator ---
function setupPredictiveNEWS2() {
  const btn = document.getElementById('btn-resolve-sepsis');
  const statusBadge = document.getElementById('sepsis-status-badge');
  const scoreVal = document.getElementById('sepsis-score-val');
  const vitalsText = document.getElementById('sepsis-vitals-text');

  if (btn) {
    btn.addEventListener('click', () => {
      sfx.playBeep(980, 'sine', 0.1);
      btn.disabled = true;
      btn.innerText = 'Executing Sepsis-3 Clinical Bundle...';

      setTimeout(() => {
        if (statusBadge) {
          statusBadge.className = 'badge-tag bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
          statusBadge.innerText = 'Stabilized via AEGIS Early Protocol';
        }
        if (scoreVal) {
          scoreVal.className = 'text-3xl font-mono font-bold text-emerald-400';
          scoreVal.innerText = '2 (Low Risk)';
        }
        if (vitalsText) {
          vitalsText.innerHTML = 'MAP: 74 mmHg ↑ • Lactate: 1.4 mmol/L ↓ • Blood cultures drawn & IV Piperacillin/Tazobactam logged.';
        }
        btn.innerText = 'Intervention Completed Successfully';
        btn.className = 'px-4 py-2 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-default';
        showToastNotification('Clinical Protocol Completed: Patient vitals recovering.', 'success');
      }, 1500);
    });
  }
}

// --- Toast Notification System ---
function showToastNotification(message, type = 'info') {
  const toast = document.getElementById('app-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;

  if (toastIcon) {
    if (type === 'critical') {
      toastIcon.innerHTML = '<span class="status-beacon beacon-rose"></span>';
    } else if (type === 'warning') {
      toastIcon.innerHTML = '<span class="status-beacon beacon-amber"></span>';
    } else if (type === 'success') {
      toastIcon.innerHTML = '<span class="status-beacon beacon-green"></span>';
    } else {
      toastIcon.innerHTML = '<span class="status-beacon beacon-cyan"></span>';
    }
  }

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4200);
}

// --- Request Demo Modal ---
function setupDemoModal() {
  const openButtons = document.querySelectorAll('.btn-open-demo');
  const modal = document.getElementById('demo-modal');
  const form = document.getElementById('demo-form');
  const successState = document.getElementById('demo-success');

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      sfx.playClick();
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (form) form.classList.remove('hidden');
        if (successState) successState.classList.add('hidden');
      }
    });
  });

  const closeBtn = document.getElementById('btn-close-demo');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      sfx.playClick();
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sfx.playAlert();
      form.classList.add('hidden');
      if (successState) successState.classList.remove('hidden');
      showToastNotification('VIP Sandbox credentials generated & sent to your terminal.', 'success');
    });
  }
}

// --- Scroll-Driven Animations & Progress Engine ---
function initScrollAnimations() {
  const progressBar = document.getElementById('scroll-progress');

  // 1. Scroll Progress Bar Update
  function updateScrollProgress() {
    if (!progressBar) return;
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight > 0) {
      const progress = (window.scrollY / totalHeight) * 100;
      progressBar.style.width = `${progress}%`;
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress();

  // 2. IntersectionObserver for Smooth Element Reveals
  const revealElements = document.querySelectorAll(
    '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale'
  );

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        animateCountersInElement(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // 3. Counter Animation on Scroll Entry
  function animateCountersInElement(container) {
    const counters = container.querySelectorAll('[data-counter]');
    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-counter'));
      const prefix = counter.getAttribute('data-prefix') || '';
      const suffix = counter.getAttribute('data-suffix') || '';
      const decimals = parseInt(counter.getAttribute('data-decimals') || '0', 10);
      const duration = 1400; // ms
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // EaseOutQuart easing
        const easeVal = 1 - Math.pow(1 - progress, 4);
        const currentVal = target * easeVal;

        if (decimals > 0) {
          counter.innerText = `${prefix}${currentVal.toFixed(decimals)}${suffix}`;
        } else {
          counter.innerText = `${prefix}${Math.round(currentVal).toLocaleString()}${suffix}`;
        }

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          if (decimals > 0) {
            counter.innerText = `${prefix}${target.toFixed(decimals)}${suffix}`;
          } else {
            counter.innerText = `${prefix}${target.toLocaleString()}${suffix}`;
          }
        }
      }

      requestAnimationFrame(updateCounter);
    });
  }

  // 4. GSAP & ScrollTrigger Enhancements (if available)
  if (window.gsap && window.ScrollTrigger) {
    try {
      gsap.registerPlugin(ScrollTrigger);

      // Subtle parallax on ambient glow orbs
      gsap.to('.ambient-glow-orb.orb-1', {
        y: 200,
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2
        }
      });

      gsap.to('.ambient-glow-orb.orb-2', {
        y: -160,
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2
        }
      });

      // Smooth parallax on hero terminal card
      gsap.to('.radar-scanner', {
        y: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: '.radar-scanner',
          start: 'top 80%',
          end: 'bottom top',
          scrub: 1
        }
      });
    } catch (err) {
      console.warn('GSAP ScrollTrigger initialization note:', err);
    }
  }

  // 5. Active Navigation Link Highlighting on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('header nav a[href^="#"]');

  function highlightActiveNav() {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('text-cyan-400', 'font-semibold');
            link.classList.remove('text-slate-300');
          } else {
            link.classList.remove('text-cyan-400', 'font-semibold');
            link.classList.add('text-slate-300');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightActiveNav, { passive: true });
}

// --- Sound Mute Toggle ---
function setupAudioToggle() {
  const toggleBtn = document.getElementById('audio-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    sfx.muted = !sfx.muted;
    if (sfx.muted) {
      toggleBtn.innerHTML = '<i data-lucide="volume-x" class="w-4 h-4 text-slate-400"></i><span class="text-xs text-slate-400">Muted</span>';
      showToastNotification('Hospital Ambient Telemetry Audio Muted');
    } else {
      sfx.init();
      sfx.playClick();
      toggleBtn.innerHTML = '<i data-lucide="volume-2" class="w-4 h-4 text-cyan-400"></i><span class="text-xs text-cyan-300">Audio Active</span>';
      showToastNotification('Hospital Ambient Telemetry Audio Enabled');
    }
    if (window.lucide) window.lucide.createIcons();
  });
}

// --- Initialize On Load ---
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  initHeroECG();
  renderBedMatrix();
  updateCommandCenterKPIs();
  setupDashboardTabs();
  setupWardFilters();
  setupRoleSwitcher();
  setupCapacityCalculator();
  setupTelemetrySandbox();
  setupPredictiveNEWS2();
  setupDemoModal();
  setupAudioToggle();
  initScrollAnimations();

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Periodic heartbeat sound & simulated subtle telemetry flutter
  setInterval(() => {
    if (!sfx.muted && Math.random() > 0.6) {
      sfx.playHeartbeat();
    }
  }, 4500);

  // Periodic subtle vital flutter
  setInterval(() => {
    const randomBed = mockBeds[Math.floor(Math.random() * mockBeds.length)];
    if (randomBed && randomBed.patient && randomBed.status !== 'critical') {
      const deltaHr = (Math.random() > 0.5 ? 1 : -1);
      randomBed.hr = Math.max(58, Math.min(108, randomBed.hr + deltaHr));
      const hrElement = document.getElementById('live-monitored-hr');
      if (hrElement) hrElement.innerText = `${randomBed.hr} BPM`;
    }
  }, 2800);
});
