import { useEffect, useRef, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = event => setReduced(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

// True while the element is on screen; animations start and stop with it.
export function useVisible(ref, threshold = .3) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return visible;
}

// One timeline of timeouts that can be cancelled together; callbacks from a cancelled run never fire.
export function useTimeline() {
  const timers = useRef([]);
  const run = useRef(0);
  const api = useRef(null);
  if (!api.current) {
    api.current = {
      later(fn, ms) {
        const id = run.current;
        timers.current.push(setTimeout(() => { if (id === run.current) fn(); }, ms));
      },
      clear() {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        run.current += 1;
      }
    };
  }
  useEffect(() => () => api.current.clear(), []);
  return api.current;
}
