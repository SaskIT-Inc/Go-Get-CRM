import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

export default function AnimatedNumber({ value, className }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const numeric = parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;
  const suffix = String(value).replace(/^[0-9]+/, '');

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });

  useEffect(() => {
    if (isInView) motionValue.set(numeric);
  }, [isInView, numeric, motionValue]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = `${Math.round(latest)}${suffix}`;
    });
  }, [spring, suffix]);

  return (
    <motion.span ref={ref} className={className}>
      0{suffix}
    </motion.span>
  );
}
