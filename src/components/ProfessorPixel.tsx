import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const ProfessorPixel: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Scale mouse position to restrict follow bounds
      const x = (e.clientX - window.innerWidth * 0.25) / 45;
      const y = (e.clientY - window.innerHeight * 0.5) / 45;
      setMousePos({
        x: Math.max(-6, Math.min(6, x)),
        y: Math.max(-6, Math.min(6, y)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none">
      {/* Dynamic ambient soft shadow below the mascot */}
      <motion.div
        animate={{
          scale: [1, 0.92, 1],
          opacity: [0.15, 0.08, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-1 w-32 h-3.5 bg-primary/10 rounded-full blur-md"
      />

      <motion.svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10"
      >
        {/* Owl Ears/Horns */}
        <path d="M40 30 L55 45 L35 55 Z" fill="#2563EB" />
        <path d="M120 30 L105 45 L125 55 Z" fill="#2563EB" />

        {/* Owl Body */}
        <rect x="35" y="45" width="90" height="95" rx="45" fill="#3B82F6" />
        
        {/* Owl Chest (White feathered section) */}
        <path d="M50 85 C50 65, 110 65, 110 85 C110 115, 50 115, 50 85 Z" fill="#FFFFFF" opacity="0.9" />

        {/* Chest Feather Accents */}
        <path d="M72 82 Q80 87 88 82" stroke="#DBEAFE" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M68 93 Q80 98 92 93" stroke="#DBEAFE" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M74 104 Q80 108 86 104" stroke="#DBEAFE" strokeWidth="2.5" strokeLinecap="round" />

        {/* Head Group (Slightly tracks cursor parallax) */}
        <motion.g
          animate={{
            x: mousePos.x * 0.4,
            y: mousePos.y * 0.4,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
          {/* Eyes Surrounds (Glass Circles) */}
          <circle cx="60" cy="65" r="22" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />
          <circle cx="100" cy="65" r="22" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />

          {/* Glasses Frame Bridge */}
          <line x1="82" y1="65" x2="78" y2="65" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

          {/* Pupils Group (Tracks cursor, scales down for blink) */}
          <motion.g
            animate={{
              x: mousePos.x,
              y: mousePos.y,
              scaleY: isBlinking ? 0.1 : 1,
            }}
            transition={{
              scaleY: { duration: 0.08 },
              x: { type: 'spring', damping: 15, stiffness: 250 },
              y: { type: 'spring', damping: 15, stiffness: 250 },
            }}
            style={{ transformOrigin: '80px 65px' }}
          >
            {/* Left Pupil */}
            <circle cx="60" cy="65" r="8" fill="#111827" />
            <circle cx="57" cy="62" r="3" fill="#FFFFFF" />

            {/* Right Pupil */}
            <circle cx="100" cy="65" r="8" fill="#111827" />
            <circle cx="97" cy="62" r="3" fill="#FFFFFF" />
          </motion.g>

          {/* Owl Beak */}
          <polygon points="80,72 75,82 85,82" fill="#F59E0B" />
        </motion.g>

        {/* Left Wing (Tucked) */}
        <path d="M35 70 C28 80, 28 100, 35 110 C36 100, 36 80, 35 70 Z" fill="#1D4ED8" />

        {/* Right Wing (Waving Once on Mount) */}
        <motion.path
          d="M125 70 C132 80, 132 100, 125 110"
          stroke="#1D4ED8"
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ rotate: 0, originX: '125px', originY: '70px' }}
          animate={{
            rotate: [0, 45, 0, 45, 0],
          }}
          transition={{
            delay: 0.6,
            duration: 1.5,
            ease: 'easeInOut',
          }}
        />

        {/* Feet */}
        <circle cx="65" cy="142" r="4.5" fill="#F59E0B" />
        <circle cx="73" cy="142" r="4.5" fill="#F59E0B" />
        <circle cx="87" cy="142" r="4.5" fill="#F59E0B" />
        <circle cx="95" cy="142" r="4.5" fill="#F59E0B" />
      </motion.svg>
    </div>
  );
};

export default ProfessorPixel;
