import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Microphone } from '@phosphor-icons/react';
import { originalText, outputStyles } from './product-content';
import { useTimeline, useVisible } from './hooks';

// Character diff between what was said and what Vime wrote.
function diffOps(said, written) {
  const a = [...said], b = [...written], n = a.length, m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) ops.push(['-', a[i++]]);
    else ops.push(['+', b[j++]]);
  }
  while (i < n) ops.push(['-', a[i++]]);
  while (j < m) ops.push(['+', b[j++]]);
  return ops;
}

// Three beats with no dead air: the original breathes while Vime works, a reading pass marks
// deletions and opens insert points, then deletions fold, insertions type in and the key sentence is marked.
function schedule(ops) {
  const scanned = ops.filter(([op]) => op !== '+').length;
  const per = Math.min(24, 950 / ops.length), scan = 420;
  let j = 0, x = 0, n = 0;
  const items = ops.map(([op, char], index) => {
    const item = { op, char, head: op === '+' && ops[index - 1]?.[0] !== '+', at: scan + j * per };
    if (op === '+') item.insertIndex = n++; else { j++; if (op === '-') item.deleteIndex = x++; }
    return item;
  });
  const fold = scan + scanned * per + 380, type = fold + x * 18 + 260, settle = type + n * 42 + 380;
  return { items, scan, fold, type, settle, end: settle + 320, deleted: x, inserted: n };
}

export function OutputStyles({ reduced }) {
  const box = useRef(null), tabs = useRef([]), hover = useRef(false), userAt = useRef(0);
  const visible = useVisible(box, .4);
  const timeline = useTimeline();
  const [style, setStyle] = useState(0);
  const [elapsed, setElapsed] = useState(Infinity);
  const [marked, setMarked] = useState(true);
  const played = useRef(false);
  const live = useRef({});
  live.current = { style, visible };
  const plan = useMemo(() => schedule(diffOps(originalText, outputStyles[style].output)), [style]);

  function show(next, animate) {
    timeline.clear(); setStyle(next); setMarked(false);
    if (!animate || reduced) { setElapsed(Infinity); setMarked(true); return; }
    setElapsed(0);
  }
  // Advance the clock while a run is in progress.
  useEffect(() => {
    if (elapsed === Infinity) return;
    const start = performance.now() - elapsed;
    let frame = requestAnimationFrame(function tick(now) {
      const time = now - start;
      if (time >= plan.end) { setElapsed(Infinity); return; }
      setElapsed(time); frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [elapsed === Infinity, plan]);
  // Once settled: sweep the key-sentence highlight, then move on unless the reader is busy here.
  useEffect(() => {
    if (elapsed !== Infinity || marked) return;
    const frame = requestAnimationFrame(() => setMarked(true));
    const advance = () => timeline.later(() => {
      if (live.current.visible && !hover.current && Date.now() - userAt.current > 12000) show((live.current.style + 1) % outputStyles.length, true);
      else advance();
    }, 2000);
    timeline.later(advance, 3200);
    return () => cancelAnimationFrame(frame);
  }, [elapsed, marked]);
  useEffect(() => { if (visible && !played.current) { played.current = true; show(0, true); } }, [visible]);

  const choose = next => { userAt.current = Date.now(); show(next, true); };
  const active = outputStyles[style];
  const done = elapsed === Infinity;
  const doneText = plan.deleted || plan.inserted ? `已整理 · 删 ${plan.deleted} 字 · 补 ${plan.inserted} 字` : '原话保留，一字未改';
  const parts = active.focus ? active.output.split(active.focus) : [active.output];
  const classes = item => {
    if (item.op === '+') {
      const typed = elapsed >= plan.type + item.insertIndex * 42;
      if (typed) return 'n in' + (elapsed >= plan.settle ? ' settle' : '');
      return 'n' + (item.head && elapsed >= item.at ? ' slot' : '');
    }
    const lit = elapsed >= item.at && elapsed < item.at + 550 && elapsed < plan.fold ? ' lit' : '';
    if (item.op === '-') return 'x' + lit + (elapsed >= item.at ? ' mark' : '') + (elapsed >= plan.fold + item.deleteIndex * 18 ? ' gone' : '');
    return 'e' + lit;
  };

  return <section className="sec" id="styles" aria-labelledby="styles-title">
    <div className="wrap">
      <div className="shead" data-reveal><h2 id="styles-title">智能整理，<br/><span>但保持你的表达风格</span></h2></div>
      <div data-reveal>
        <div className="orig-row"><span className="flabel"><Microphone/>你说</span><p>{originalText}</p></div>
        <div className="res" onPointerEnter={() => { hover.current = true; }} onPointerLeave={() => { hover.current = false; }}>
          <div>
            <div className="stabs" role="tablist" aria-label="输出风格">
              {outputStyles.map((item, index) => <button key={item.name} ref={element => { tabs.current[index] = element; }} type="button" role="tab"
                aria-selected={index === style} tabIndex={index === style ? 0 : -1} onClick={() => choose(index)}
                onKeyDown={event => {
                  const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 0;
                  if (step) { event.preventDefault(); const next = (index + step + outputStyles.length) % outputStyles.length; tabs.current[next].focus(); choose(next); }
                }}><span>{item.name}</span><small>{item.short}</small><ArrowRight className="ar" size={18}/></button>)}
            </div>
            <p className="sshort"><kbd>右 ⌘</kbd> + <kbd>右 ⌥</kbd><br/>快速切换表达风格</p>
          </div>
          <div className="sout" ref={box}>
            <div className="ohead"><span className="flabel"><ArrowRight/>Vime</span>
              <span className="legend"><span><i className="lx"/>删掉</span><span><i className="li"/>补上</span></span>
              <Status done={done} text={done ? doneText : active.busy}/>
            </div>
            {done
              ? <p className="otext">{parts[0]}{active.focus && <><mark className={marked ? 'on' : undefined}>{active.focus}</mark>{parts[1]}</>}</p>
              : <p className={'otext' + (elapsed < plan.scan ? ' breath' : '')} aria-label={active.output}>
                  {plan.items.map((item, index) => <span className={classes(item)} key={style + '-' + index}>{item.char}</span>)}
                </p>}
          </div>
        </div>
      </div>
      <AbbreviationCard reduced={reduced}/>
    </div>
  </section>;
}

function Status({ done, idle = false, text }) {
  return <span className={'proc' + (done ? ' ok' : idle ? ' idle' : '')} role="status">
    <span className="dt"><i style={{ '--k': 0 }}/><i style={{ '--k': 1 }}/><i style={{ '--k': 2 }}/></span>
    <Check className="okc" weight="bold"/><span>{text}</span>
  </span>;
}

// 1.9.1: letters spoken one by one are merged into API / SDK. Loops while on screen.
function AbbreviationCard({ reduced }) {
  const card = useRef(null);
  const visible = useVisible(card, .5);
  const timeline = useTimeline();
  const [beat, setBeat] = useState(4);
  useEffect(() => {
    timeline.clear();
    if (!visible || reduced) { setBeat(4); return; }
    const loop = () => {
      setBeat(0);
      [1100, 1600, 2500, 3500].forEach((ms, index) => timeline.later(() => setBeat(index + 1), ms));
      timeline.later(loop, 8000);
    };
    loop();
  }, [visible, reduced]);
  const spoken = beat < 3;
  const line = ['aline', beat === 1 && 'wait', beat >= 2 && 'scan cut', beat >= 3 && 'merge', beat >= 4 && 'done'].filter(Boolean).join(' ');
  const letters = (text, offset) => <span className="ab">{[...text].map((letter, index) =>
    <Fragment key={letter}>{index > 0 && <span className="sp">、</span>}<span className="l" style={{ '--k': offset + index }}>{letter}</span></Fragment>)}</span>;
  return <div className="newcard" ref={card} data-reveal>
    <div>
      <span className="badge"><i/>1.9.1 新变化</span>
      <h3>逐个念出的字母，也能整理成 API、SDK</h3>
      <p className="lead">1.9.1 修复了这种说法下，整理结果可能退回原话的问题。</p>
    </div>
    <div className="abbr-demo" aria-label="示例：你说“那个，帮我看一下 A、P、I 文档，然后把 S、D、K 升级到最新版。”，Vime 写下“帮我看一下 API 文档，然后把 SDK 升级到最新版。”">
      <div className="row">{spoken ? <Microphone size={15}/> : <ArrowRight size={15}/>}<span>{spoken ? '你说' : 'Vime'}</span>
        <span style={{ marginLeft: 'auto' }}><Status done={beat >= 4} idle={beat === 0} text={beat === 0 ? '识别原文' : beat >= 4 ? '已整理' : '正在整理'}/></span>
      </div>
      <p className={line} aria-hidden="true"><span className="fill">那个，</span>帮我看一下 {letters('API', 0)} 文档，然后把 {letters('SDK', 3)} 升级到最新版。</p>
      <div className="foot"><Check/>字母合并为规范缩写，口头禅一并去掉</div>
    </div>
  </div>;
}
