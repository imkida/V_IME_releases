import { useEffect, useRef } from 'react';

// Hero background: thin voice lines that swell while the shortcut demo is listening.
export default function VoiceLines({ level, reduced }) {
  const canvas = useRef(null);
  useEffect(() => {
    const cv = canvas.current, hero = cv.parentElement, ctx = cv.getContext('2d');
    let width = 0, height = 0, dpr = 1, visible = true, frame = 0, current = 0;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      width = hero.clientWidth; height = Math.min(hero.clientHeight, 560);
      cv.style.height = height + 'px'; cv.width = width * dpr; cv.height = height * dpr;
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(hero);
    size(); addEventListener('resize', size);
    const draw = now => {
      current += (level.current - current) * .06;
      if (visible && !reduced) {
        const style = getComputedStyle(document.documentElement);
        const wave = style.getPropertyValue('--wave').trim(), alpha = parseFloat(style.getPropertyValue('--line-alpha')) || .16;
        const t = now / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'transparent'); gradient.addColorStop(.25, wave); gradient.addColorStop(.85, wave); gradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = gradient; ctx.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) {
          ctx.globalAlpha = alpha * (1 - i * .09);
          ctx.beginPath();
          const base = height * .5 + (i - 3) * 9, amplitude = (14 + i * 4) * (1 + current * 2.2);
          for (let x = 0; x <= width; x += 6) {
            const u = x / width, envelope = Math.pow(Math.sin(Math.PI * u), 1.4);
            const y = base + Math.sin(u * (7 + i * .6) - t * (.7 + i * .08) + i) * amplitude * envelope
              + Math.sin(u * 23 - t * 2.2) * 9 * envelope * current;
            if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('resize', size); };
  }, [level, reduced]);
  return <canvas ref={canvas} id="waves" aria-hidden="true"/>;
}
