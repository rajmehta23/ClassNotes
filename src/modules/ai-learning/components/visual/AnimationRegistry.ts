export interface AnimationContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  time: number; // in seconds
  params: {
    val1: number;
    val2: number;
  };
  isDark: boolean;
}

export interface AnimationTopicDef {
  id: string;
  title: string;
  category: string;
  description: string;
  param1Label: string;
  param1Min: number;
  param1Max: number;
  param1Default: number;
  param2Label: string;
  param2Min: number;
  param2Max: number;
  param2Default: number;
  render: (ctx: AnimationContext) => void;
}

export const ANIMATION_REGISTRY: Record<string, AnimationTopicDef> = {
  projectile_motion: {
    id: 'projectile_motion',
    title: 'Projectile Motion Simulator',
    category: 'Physics - Kinematics',
    description: 'Simulates classical parabolic trajectory under uniform gravitational acceleration.',
    param1Label: 'Initial Velocity (m/s)',
    param1Min: 10,
    param1Max: 80,
    param1Default: 40,
    param2Label: 'Launch Angle (deg)',
    param2Min: 15,
    param2Max: 75,
    param2Default: 45,
    render: ({ canvas, ctx, time, params, isDark }) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const v0 = params.val1;
      const angleDeg = params.val2;
      const angleRad = (angleDeg * Math.PI) / 180;
      const g = 9.8;

      const originX = 50;
      const originY = height - 50;

      // Trajectory scale
      const scale = Math.min((width - 100) / 300, (height - 100) / 150);

      // Total flight time
      const tTotal = (2 * v0 * Math.sin(angleRad)) / g;
      const tCurrent = (time % (tTotal + 1));

      // Calculate path points
      ctx.beginPath();
      ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      for (let t = 0; t <= tTotal; t += 0.05) {
        const x = v0 * Math.cos(angleRad) * t;
        const y = v0 * Math.sin(angleRad) * t - 0.5 * g * t * t;
        const px = originX + x * scale;
        const py = originY - y * scale;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Projectile Position
      const currX = v0 * Math.cos(angleRad) * tCurrent;
      const currY = Math.max(0, v0 * Math.sin(angleRad) * tCurrent - 0.5 * g * tCurrent * tCurrent);
      const px = originX + currX * scale;
      const py = originY - currY * scale;

      // Draw ground line
      ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, originY);
      ctx.lineTo(width - 20, originY);
      ctx.stroke();

      // Projectile ball
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Velocity vectors
      const vx = v0 * Math.cos(angleRad);
      const vy = v0 * Math.sin(angleRad) - g * tCurrent;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + vx * 0.8, py - vy * 0.8);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  },

  force: {
    id: 'force',
    title: 'Force & Acceleration (Newton\'s 2nd Law)',
    category: 'Physics - Dynamics',
    description: 'Visualizes vector forces acting on a mass block (F = m * a).',
    param1Label: 'Applied Force F (N)',
    param1Min: 5,
    param1Max: 100,
    param1Default: 40,
    param2Label: 'Mass m (kg)',
    param2Min: 1,
    param2Max: 20,
    param2Default: 5,
    render: ({ canvas, ctx, time, params, isDark }) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const force = params.val1;
      const mass = params.val2;
      const accel = force / mass;

      const groundY = height - 60;
      const blockWidth = 60 + mass * 2;
      const blockHeight = 40;

      // Animated displacement
      const posX = 60 + ((0.5 * accel * (time % 4) * (time % 4) * 20) % (width - 150));

      // Ground
      ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, groundY);
      ctx.lineTo(width - 20, groundY);
      ctx.stroke();

      // Block
      ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.fillRect(posX, groundY - blockHeight, blockWidth, blockHeight);
      ctx.strokeRect(posX, groundY - blockHeight, blockWidth, blockHeight);

      // Mass label inside block
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${mass} kg`, posX + blockWidth / 2, groundY - blockHeight / 2 + 4);

      // Force Vector Arrow
      const arrowLen = Math.min(100, force * 1.2);
      const startX = posX + blockWidth;
      const startY = groundY - blockHeight / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + arrowLen, startY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(startX + arrowLen + 8, startY);
      ctx.lineTo(startX + arrowLen, startY - 6);
      ctx.lineTo(startX + arrowLen, startY + 6);
      ctx.closePath();
      ctx.fill();

      // Readout
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.fillText(`a = ${accel.toFixed(2)} m/s²`, startX + arrowLen / 2, startY - 10);
    },
  },

  gravity: {
    id: 'gravity',
    title: 'Gravitational Attraction & Orbit',
    category: 'Astrophysics',
    description: 'Visualizes gravitational attraction vectors between two bodies (F = G*m1*m2 / r²).',
    param1Label: 'Primary Mass M1',
    param1Min: 10,
    param1Max: 100,
    param1Default: 50,
    param2Label: 'Orbit Radius r',
    param2Min: 40,
    param2Max: 120,
    param2Default: 80,
    render: ({ canvas, ctx, time, params, isDark }) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = params.val2 || 80;

      // Orbit path
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Central Mass M1
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + params.val1 * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();

      // Orbiting Planet M2
      const angle = time * 1.5;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      // Gravity vector toward center
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (cx - px) * 0.4, py + (cy - py) * 0.4);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  },

  momentum: {
    id: 'momentum',
    title: 'Conservation of Momentum (Collision)',
    category: 'Physics - Mechanics',
    description: 'Visualizes elastic collision between two masses (m1*v1 + m2*v2 = constant).',
    param1Label: 'Mass 1 (kg)',
    param1Min: 1,
    param1Max: 10,
    param1Default: 3,
    param2Label: 'Mass 2 (kg)',
    param2Min: 1,
    param2Max: 10,
    param2Default: 5,
    render: ({ canvas, ctx, time, params, isDark }) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const m1 = params.val1;
      const m2 = params.val2;
      const groundY = height - 50;

      const cycle = time % 4;
      let x1 = 50 + cycle * 60;
      let x2 = width - 50 - cycle * 30;

      if (x1 + 30 >= x2 - 30) {
        // Post collision
        const overlap = (x1 + 30) - (x2 - 30);
        x1 -= overlap / 2;
        x2 += overlap / 2;
      }

      // Ground
      ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, groundY);
      ctx.lineTo(width - 20, groundY);
      ctx.stroke();

      // Mass 1
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x1, groundY - 20, 15 + m1, 0, Math.PI * 2);
      ctx.fill();

      // Mass 2
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x2, groundY - 20, 15 + m2, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  electricity: {
    id: 'electricity',
    title: 'Electric Circuit & Current (Ohm\'s Law)',
    category: 'Electronics',
    description: 'Visualizes electron drift and current flow in closed circuit (V = I * R).',
    param1Label: 'Voltage V (Volts)',
    param1Min: 1,
    param1Max: 24,
    param1Default: 12,
    param2Label: 'Resistance R (Ohms)',
    param2Min: 1,
    param2Max: 50,
    param2Default: 10,
    render: ({ canvas, ctx, time, params, isDark }) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const voltage = params.val1;
      const resistance = params.val2;
      const current = voltage / resistance;

      const left = 60;
      const right = width - 60;
      const top = 50;
      const bottom = height - 50;

      // Wire rectangle
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top, right - left, bottom - top);

      // Battery on left
      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.fillRect(left - 10, (top + bottom) / 2 - 20, 20, 40);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`+ ${voltage}V`, left - 35, (top + bottom) / 2 + 4);

      // Electrons moving along circuit
      const electronSpeed = current * 40;
      const totalPerimeter = 2 * (right - left + bottom - top);

      for (let i = 0; i < 16; i++) {
        const offset = ((time * electronSpeed + (i * totalPerimeter) / 16) % totalPerimeter);
        let ex = 0, ey = 0;

        if (offset < right - left) {
          ex = left + offset;
          ey = top;
        } else if (offset < (right - left) + (bottom - top)) {
          ex = right;
          ey = top + (offset - (right - left));
        } else if (offset < 2 * (right - left) + (bottom - top)) {
          ex = right - (offset - (right - left) - (bottom - top));
          ey = bottom;
        } else {
          ex = left;
          ey = bottom - (offset - 2 * (right - left) - (bottom - top));
        }

        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#eab308';
        ctx.fill();
      }

      // Current readout
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Current I = ${current.toFixed(2)} A`, (left + right) / 2, (top + bottom) / 2);
    },
  },

  magnetism: {
    id: 'magnetism',
    title: 'Magnetic Field Lines & Dipole',
    category: 'Electromagnetism',
    description: 'Visualizes magnetic field lines around a dipole magnet.',
    param1Label: 'Field Strength B (Tesla)',
    param1Min: 1,
    param1Max: 10,
    param1Default: 5,
    param2Label: 'Dipole Distance',
    param2Min: 20,
    param2Max: 80,
    param2Default: 40,
    render: ({ canvas, ctx, time, params, isDark }) => {
      void time;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const distance = params.val2;

      // Magnet bar
      ctx.fillStyle = '#ef4444'; // North
      ctx.fillRect(cx - distance, cy - 12, distance, 24);
      ctx.fillStyle = '#3b82f6'; // South
      ctx.fillRect(cx, cy - 12, distance, 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', cx - distance / 2, cy + 4);
      ctx.fillText('S', cx + distance / 2, cy + 4);

      // Magnetic field curves
      for (let r = 20; r <= 80; r += 15) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, distance + r, r, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
  },

  friction: {
    id: 'friction',
    title: 'Friction Force & Normal Load',
    category: 'Physics - Mechanics',
    description: 'Visualizes normal force vs static and kinetic friction vectors.',
    param1Label: 'Normal Force N',
    param1Min: 10,
    param1Max: 100,
    param1Default: 50,
    param2Label: 'Friction Coeff μ',
    param2Min: 0.1,
    param2Max: 0.9,
    param2Default: 0.4,
    render: ({ canvas, ctx, time, params, isDark }) => {
      void time;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const N = params.val1;
      const mu = params.val2;
      const fFriction = mu * N;

      const groundY = height - 50;
      const bx = width / 2 - 30;
      const by = groundY - 40;

      // Surface
      ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, groundY);
      ctx.lineTo(width - 20, groundY);
      ctx.stroke();

      // Block
      ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
      ctx.strokeStyle = '#3b82f6';
      ctx.fillRect(bx, by, 60, 40);
      ctx.strokeRect(bx, by, 60, 40);

      // Friction Arrow (Left)
      ctx.beginPath();
      ctx.moveTo(bx, groundY);
      ctx.lineTo(bx - fFriction * 1.5, groundY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Labels
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`F_friction = ${fFriction.toFixed(1)} N`, width / 2, by - 15);
    },
  },
};
