import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatText, Check, Microphone, Pause, PencilSimple, Play, Translate } from '@phosphor-icons/react';
import { appNames, modes } from './product-content';
import { useTimeline, useVisible } from './hooks';

const modeIcons = [Microphone, ChatText, Translate, PencilSimple];
const waveHeights = [9,15,23,13,29,38,20,13,30,43,27,18,34,24,14,29,39,17,10,22,14];
const busyLabel = mode => mode === 2 ? '正在翻译' : mode === 3 ? '正在修改' : '正在整理';

// The right-Command demo. It plays each mode in turn while on screen; the on-screen key
// and the real right Command key (with , or .) drive it by hand.
export default function InputDemo({ reduced, level }) {
  const stage = useRef(null), tabs = useRef([]), progress = useRef(null), stream = useRef(0), user = useRef(false);
  const visible = useVisible(stage);
  const timeline = useTimeline();
  const [mode, setMode] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [said, setSaid] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [app, setApp] = useState(0);
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });
  const live = useRef({});
  live.current = { mode, phase, paused, visible };

  function setProgress(ms) {
    const bar = progress.current;
    bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)';
    if (ms) { void bar.offsetWidth; bar.style.transition = `transform ${ms}ms linear`; bar.style.transform = 'scaleX(1)'; }
  }
  function stop() { timeline.clear(); clearInterval(stream.current); level.current = 0; }
  function reset(next) {
    stop(); setMode(next); setPhase('ready'); setSaid(0); setPressed(false); setDoubled(false); setProgress(0);
  }
  function listen(next) {
    const total = [...modes[next].spoken].length;
    let shown = 0;
    setPhase('listening');
    stream.current = setInterval(() => {
      shown = Math.min(total, shown + 1); setSaid(shown); level.current = .55 + Math.random() * .45;
    }, 90);
  }
  function finish(next) {
    clearInterval(stream.current); level.current = 0; setSaid(Infinity); setPhase('processing');
    timeline.later(() => {
      setPhase('done'); setApp(value => (value + 1) % appNames.length);
      if (!user.current) timeline.later(() => play((next + 1) % modes.length), Math.max(2600, [...modes[next].output].length * 20 + 2000));
    }, 950);
  }
  function play(next, resume = false) {
    reset(next); user.current = false;
    if ((live.current.paused && !resume) || !live.current.visible) return;
    if (reduced) { setPhase('done'); setSaid(Infinity); return; }
    const sample = modes[next], listenMs = [...sample.spoken].length * 90 + 900;
    setProgress(700 + listenMs + 950 + Math.max(2600, [...sample.output].length * 20 + 2000));
    timeline.later(() => {
      if (next === 1) {
        setPressed(true); timeline.later(() => setPressed(false), 140);
        timeline.later(() => { setPressed(true); setDoubled(true); }, 300); timeline.later(() => setPressed(false), 440);
      } else setPressed(true);
      listen(next);
      timeline.later(() => {
        if (next === 0) setPressed(false); else { setPressed(true); timeline.later(() => setPressed(false), 180); }
        finish(next);
      }, listenMs);
    }, 700);
  }

  // Hands-on: hold for "按住说话"; the other modes start and stop with a press.
  const toggles = () => live.current.mode !== 0;
  const listeningByHand = () => user.current && live.current.phase === 'listening';
  function userDown(next = live.current.mode) { reset(next); user.current = true; setPressed(true); listen(next); }
  function userUp() { if (!listeningByHand()) return; setPressed(false); finish(live.current.mode); }

  useEffect(() => {
    if (visible) {
      if (!user.current && !live.current.paused && !['listening', 'processing'].includes(live.current.phase)) play(live.current.mode);
    } else if (!user.current) stop();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let meta = false;
    const down = event => {
      if (event.repeat) return;
      if (event.code === 'MetaRight') { meta = true; if (toggles() && listeningByHand()) userUp(); else userDown(0); }
      else if (meta && (event.code === 'Comma' || event.code === 'Period')) { event.preventDefault(); userDown(event.code === 'Comma' ? 2 : 3); }
    };
    const up = event => { if (event.code === 'MetaRight') { meta = false; if (toggles()) setPressed(false); else userUp(); } };
    const blur = () => { if (meta) { meta = false; userUp(); } };
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); };
  }, [visible]);

  useLayoutEffect(() => {
    const place = () => { const tab = tabs.current[mode]; setIndicator({ x: tab.offsetLeft + tab.offsetWidth * .15, width: tab.offsetWidth * .7 }); };
    place(); addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, [mode]);

  function togglePause() {
    const next = !paused;
    setPaused(next);
    if (next) { stop(); setPressed(false); setProgress(0); } else play(mode, true);
  }

  const sample = modes[mode];
  const idle = phase === 'idle';
  const spoken = phase === 'ready' ? '…' : phase === 'listening' ? [...sample.spoken].slice(0, said).join('') : sample.spoken;
  const caption = phase === 'listening' ? (mode === 0 ? '说完松开' : '再按一下，结束听写')
    : phase === 'processing' ? (mode === 0 ? '松开，结束听写' : '单击，结束听写')
    : phase === 'done' ? '完成' : mode === 0 ? '说完松开' : '说完再按一下';
  const caret = <i className="caret"/>;
  const editor = idle ? sample.output
    : phase === 'done' ? <>{[...sample.output].map((char, index) => <span className="tk" style={{ '--i': index }} key={index}>{char === ' ' ? ' ' : char}</span>)}{caret}</>
    : sample.selected ? <><span className="sel">{sample.selected}</span>{caret}</>
    : phase === 'ready' ? <><span className="ph">点一下输入框，再说话</span>{caret}</> : caret;
  const status = idle || phase === 'done' ? [<Check key="ok"/>, idle ? '已写入' : sample.resultLabel]
    : phase === 'listening' ? [<i className="rd" key="rec"/>, '正在听写']
    : phase === 'processing' ? [<span className="dt" key="dots"><i style={{ '--k': 0 }}/><i style={{ '--k': 1 }}/><i style={{ '--k': 2 }}/></span>, busyLabel(mode)]
    : [null, '准备说话'];

  return <section className="exp" id="experience" aria-labelledby="exp-title">
    <div className="cap">
      <h2 id="exp-title">好用的快捷输入</h2>
      <span className="hint">在 Mac 上？按住键盘上的 <kbd>右 ⌘</kbd> 也能试</span>
      <button className="ctl" type="button" onClick={togglePause}>{paused ? <Play/> : <Pause/>}<span>{paused ? '继续' : '暂停'}</span></button>
    </div>
    <div className="stage" ref={stage}>
      <div className="dock" role="tablist" aria-label="快捷输入演示">
        {modes.map((item, index) => {
          const Icon = modeIcons[index];
          return <button key={item.name} ref={element => { tabs.current[index] = element; }} type="button" role="tab"
            aria-selected={index === mode} tabIndex={index === mode ? 0 : -1}
            onClick={() => { setPaused(false); play(index, true); }}
            onKeyDown={event => {
              const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              if (step) { event.preventDefault(); const next = (index + step + modes.length) % modes.length; tabs.current[next].focus(); setPaused(false); play(next, true); }
            }}><Icon/>{item.name}</button>;
        })}
        <span className="ind" style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}/>
      </div>
      <div className="smain">
        <div className="keys">
          <div className="keyrow">
            <button className={'key' + (pressed ? ' down' : '')} type="button" aria-label="右 Command 键，按住开始演示"
              onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); if (toggles() && listeningByHand()) userUp(); else userDown(); }}
              onPointerUp={() => { if (toggles()) setPressed(false); else userUp(); }}
              onPointerCancel={() => { if (!toggles()) userUp(); }}
              onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); if (toggles() && listeningByHand()) userUp(); else userDown(); } }}
              onKeyUp={event => { if ((event.key === ' ' || event.key === 'Enter') && !toggles()) userUp(); }}>
              <span className="ring"/><span className="s">command</span><span className="c">⌘</span><span className="r">右</span>
              <span className={'x2' + (doubled ? ' on' : '')}>× 2</span>
            </button>
            {sample.key && <><span className="plus">+</span><span className={'key sm' + (pressed ? ' down' : '')}><span className="c">{sample.key}</span></span></>}
          </div>
          <div className="kcap"><b>{sample.gesture}</b><span>{caption}</span></div>
        </div>
        <div className="scene">
          <div>
            <div className="speech-h"><Microphone className="i"/>你说
              <span className={'wave' + (phase === 'listening' ? ' on' : '')}>{waveHeights.map((height, index) =>
                <i key={index} style={{ '--h': Math.round(height * .6) + 'px', '--d': index * -.071 + 's' }}/>)}</span>
            </div>
            <p className="spoken">{spoken}{phase === 'listening' && <span className="dotc"/>}</p>
          </div>
          <div className="win">
            <div className="win-top"><span className="dots"><i/><i/><i/></span><span className="t">{sample.context}</span>
              <span className="roll">在 <b><span key={app}>{appNames[app]}</span></b> 里</span></div>
            <div className="wbody">
              <div className={'editor' + (phase === 'processing' ? ' think' : '')}>{editor}</div>
              <div className="hud" role="status"><span className="sline"><span className="st">{status[0]}</span><span>{status[1]}</span></span><span className="ret">↵</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="sprog"><i ref={progress}/></div>
    </div>
    <p className="demo-note">页面演示，不会录音</p>
    <div className="apps"><span className="lab">日常应用均已支持</span>{appNames.map((name, index) => <span className={index === app ? 'on' : undefined} key={name}>{name}</span>)}</div>
  </section>;
}
