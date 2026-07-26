'use client';
import { motion } from 'framer-motion';

const variants = {
  up: { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -32 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 32 }, visible: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: .94 }, visible: { opacity: 1, scale: 1 } },
};

export default function MotionReveal({ children, variant = 'up', delay = 0, className = '' }) {
  return <motion.div className={className} variants={variants[variant]} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} transition={{ duration: .65, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
