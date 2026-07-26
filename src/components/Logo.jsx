import logo from '@/assets/goget-mark.png';

export default function Logo({ className = 'w-11 h-11', logoUrl }) {
  return (
    <div className={`${className} rounded-xl bg-white flex items-center justify-center shadow-lg p-1.5 flex-shrink-0`}>
      <img src={logoUrl || logo} alt="Company logo" className="w-full h-full object-contain" />
    </div>
  );
}
