import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

export default function RatingStars({ rating = 0, size = 'sm', showCount = false, count = 0, dark = false }) {
  const sizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-xl' };
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyColor = dark ? 'text-white/20' : 'text-gray-300 dark:text-gray-600';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) stars.push(<FaStar key={i} className="text-amber-400" />);
    else if (i === fullStars && hasHalf) stars.push(<FaStarHalfAlt key={i} className="text-amber-400" />);
    else stars.push(<FaRegStar key={i} className={emptyColor} />);
  }

  return (
    <div className={`flex items-center gap-1 ${sizes[size]}`}>
      {stars}
      {showCount && <span className={`ml-1 text-xs ${dark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>({count})</span>}
    </div>
  );
}
