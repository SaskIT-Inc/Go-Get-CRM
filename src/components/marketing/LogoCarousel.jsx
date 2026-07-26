import { motion } from 'framer-motion';
import atlanticTax from '@/assets/Atlantic Tax.png';
import canESL from '@/assets/canESL.png';
import cpaMapple from '@/assets/CPA Mapple.png';
import guideMeImmigration from '@/assets/Guide Me Immigration.png';
import northLedger from '@/assets/North Ledger.png';
import studyCanada from '@/assets/Study Canada.png';

const PARTNERS = [
  { name: 'Atlantic Tax', src: atlanticTax },
  { name: 'canESL', src: canESL },
  { name: 'CPA Mapple', src: cpaMapple },
  { name: 'Guide Me Immigration', src: guideMeImmigration },
  { name: 'North Ledger', src: northLedger },
  { name: 'Study Canada', src: studyCanada },
];

// Duplicated so the track can loop from -50% back to 0% seamlessly.
const TRACK = [...PARTNERS, ...PARTNERS];

export default function LogoCarousel() {
  return (
    <div className="relative overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <motion.div
        className="flex items-center gap-16 sm:gap-24 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
      >
        {TRACK.map((p, i) => (
          <motion.div
            key={`${p.name}-${i}`}
            className="flex-shrink-0"
            initial={{ opacity: 0.6, filter: 'grayscale(1)' }}
            whileHover={{ opacity: 1, filter: 'grayscale(0)', scale: 1.1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <img
              src={p.src}
              alt={p.name}
              draggable={false}
              className="h-16 sm:h-20 w-auto object-contain select-none"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
