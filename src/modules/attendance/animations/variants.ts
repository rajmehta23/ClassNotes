import type { Variants } from 'framer-motion';

export const bottomSheetVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  visible: {
    y: '0%',
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 250,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

export const cardContainerVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      damping: 20,
      stiffness: 200,
    },
  }),
};
