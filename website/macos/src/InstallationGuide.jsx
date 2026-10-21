import appIconUrl from '../public/assets/app-icon-preview.svg?url';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowClockwise, CaretLeft, CaretRight, Check } from '@phosphor-icons/react';
import { useTimeline, useVisible } from './hooks';

const steps = [
  { title: '安装并启动', caption: '打开 DMG，拖入 Applications，再从应用程序中启动。', duration: 5000 },
  { title: '允许录音和输入', caption: '分别打开麦克风和辅助功能中的 Vime 开关，再回到 Vime。', duration: 5400 },
  { title: '确认服务配置', caption: '默认服务可直接试用；有自己的 API Key 再填写。', duration: 5600 },
  { title: '用右 ⌘ 输入', caption: '点进输入框，按住右 Command 说话，松开后写入。', duration: 6400 }
];
const Icon = () => <img className="appicon" src={appIconUrl} alt=""/>;
const Pointer = () => <div className="cur"><svg viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.2 1.3L9.4 19z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/></svg></div>;
const Bar = ({ title }) => <div className="bar"><span className="dots"><i/><i/><i/></span><span className="t">{title}</span></div>;
// Menu-bar glyph follows the bar's text colour.
const MenuMark = () => <svg className="vm" viewBox="18 46 144 134" fill="currentColor" aria-hidden="true">
  {[[18,52,44],[39,62,60],[60,72,76],[108,72,76],[129,62,60],[150,52,44]].map(([x, y, h]) => <rect key={x} x={x} y={y} width="12" height={h} rx="6"/>)}
  <rect x="82" y="72" width="16" height="108" rx="8"/><circle cx="90" cy="56" r="10"/>
</svg>;
const dictation = [
  [null, '准备说话'],
  [<i className="rd" key="rec"/>, '正在听写'],
  [<span className="dt" key="dots"><i style={{ '--k': 0 }}/><i style={{ '--k': 1 }}/><i style={{ '--k': 2 }}/></span>, '正在整理'],
  [<Check key="ok"/>, '已写入']
];

function Scenes({ step, typing }) {
  return <>
    <div className={'sv s1' + (step === 0 ? ' on' : '')}>
      <div className="mwin" style={{ left: '10%', top: '10%', width: '80%', height: '80%' }}><Bar title="Vime 安装"/></div>
      <div className="ico" style={{ left: '30%', top: '42%' }}><Icon/><span>Vime</span></div>
      <div className="arrow" style={{ left: '50%', top: '40%' }}><svg viewBox="0 0 50 30"><path d="M4 15h40m-10-9 10 9-10 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>拖入</div>
      <div className="ico" style={{ left: '69%', top: '42%' }}><div className="folder">A</div><span>Applications</span></div>
      <div className="check" style={{ left: '74%', top: '35%' }}><Check weight="bold"/></div>
      <div className="launch"><span>应用程序</span><span>›</span><Icon/><span>Vime</span><span className="tag">双击启动</span></div>
      <div className="ghost"><Icon/></div>
      <span className="click a"/><span className="click b"/><Pointer/>
    </div>
    <div className={'sv s2' + (step === 1 ? ' on' : '')}>
      <div className="mwin" style={{ left: '6%', top: '8%', width: '88%', height: '86%' }}><Bar title="系统设置"/>
        <div className="side"><span>通用</span><span>外观</span><span>通知</span><span className="hl">隐私与安全性</span><span>键盘</span></div>
      </div>
      <div className="pane">
        <h4>隐私与安全性</h4>
        <div className="pcard"><div className="ph"><span>麦克风</span><span>录音</span></div><div className="prow"><Icon/>Vime<span className="tog t1"/></div></div>
        <div className="pcard"><div className="ph"><span>辅助功能</span><span>输入文字</span></div><div className="prow"><Icon/>Vime<span className="tog t2"/></div></div>
      </div>
      <div className="backhint"><Check/>两个开关都打开后，回到 Vime</div>
      <span className="click a"/><span className="click b"/><Pointer/>
    </div>
    <div className={'sv s3' + (step === 2 ? ' on' : '')}>
      <div className="mbar"><b/><span>访达</span><span>文件</span><span>编辑</span><span className="r"><span>Wi‑Fi</span><MenuMark/><span>周二 10:24</span></span></div>
      <div className="pop"><div className="hd"><i/>Vime 已就绪</div><span className="it">历史</span><span className="it set">设置</span><span className="it">退出</span></div>
      <div className="mwin swin"><Bar title="Vime 设置 · 服务配置"/>
        <div className="in">
          <div className="ready"><span className="ck"><Check weight="bold"/></span><div><b>默认云端服务</b><small>可直接试用</small></div></div>
          <div className="kfield"><div className="lb"><span>个人服务密钥</span><span>可选</span></div><div className="v"><code>••••••••••••</code><span className="save">保存</span></div></div>
          <div className="knote">→ 保存后优先使用个人服务</div>
        </div>
      </div>
      <span className="click a"/><span className="click b"/><span className="click c"/><Pointer/>
    </div>
    <div className={'sv s4' + (step === 3 ? ' on' : '')}>
      <div className="mwin twin"><Bar title="给团队的消息"/>
        <div className="txt"><span className="w">明天的评审改到下午三点，大家提前看一下文档。</span><i className="caret"/></div>
        <div className="tstat sline"><span className="st">{dictation[typing][0]}</span><span>{dictation[typing][1]}</span></div>
      </div>
      <div className="kc"><small>右</small>⌘</div>
      <span className="click a"/><Pointer/>
    </div>
  </>;
}

export default function InstallationGuide({ open, reduced }) {
  const screen = useRef(null);
  const visible = useVisible(screen, .35);
  const advance = useTimeline(), status = useTimeline();
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [typing, setTyping] = useState(3);
  const playing = open && visible && !reduced;
  const go = next => { setStep((next + steps.length) % steps.length); setRun(value => value + 1); };

  useEffect(() => { if (playing) setRun(value => value + 1); }, [playing]);
  useEffect(() => {
    advance.clear();
    if (playing) advance.later(() => go(step + 1), steps[step].duration + 1100);
  }, [step, run, playing]);
  // Step 4's status line follows the key press: listening, organizing, written.
  useEffect(() => {
    status.clear();
    if (step !== 3 || !playing) { setTyping(3); return; }
    setTyping(0);
    [.26, .63, .9].forEach((at, index) => status.later(() => setTyping(index + 1), steps[3].duration * at));
  }, [step, run, playing]);
  // Point the cursor at the real toggles, wherever the layout put them.
  useLayoutEffect(() => {
    if (step !== 1) return;
    const box = screen.current.getBoundingClientRect();
    ['.t1', '.t2'].forEach((selector, index) => {
      const toggle = screen.current.querySelector('.s2 ' + selector).getBoundingClientRect();
      screen.current.style.setProperty('--x' + (index + 1), ((toggle.left + toggle.width * .7 - box.left) / box.width * 100).toFixed(2) + '%');
      screen.current.style.setProperty('--y' + (index + 1), ((toggle.top + toggle.height / 2 - box.top) / box.height * 100).toFixed(2) + '%');
    });
  }, [step, run]);

  return <>
    <div className="gsteps" role="tablist" aria-label="安装步骤">
      {steps.map((item, index) => <button key={item.title} type="button" role="tab" aria-selected={index === step} tabIndex={index === step ? 0 : -1}
        className={index < step ? 'done' : index === step && playing ? 'run' : undefined} style={{ '--dur': item.duration + 'ms' }}
        onClick={() => go(index)}
        onKeyDown={event => {
          const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
          if (delta) { event.preventDefault(); go(index + delta); event.currentTarget.parentNode.children[(index + delta + steps.length) % steps.length].focus(); }
        }}>
        <span className="rg"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"/><circle className="fg" cx="18" cy="18" r="16" key={index === step ? run : 'idle'}/></svg><span className="n">{index + 1}</span></span>
        <b>{item.title}</b>
      </button>)}
    </div>
    <div className="scr" ref={screen} role="img" aria-label={'操作示意：' + steps[step].caption}>
      <div className="play" key={run} style={{ position: 'absolute', inset: 0 }}><Scenes step={step} typing={typing}/></div>
    </div>
    <div className="ghint"><span>{steps[step].caption}</span>
      <span className="ctrls">
        <button type="button" aria-label="上一步" onClick={() => go(step - 1)}><CaretLeft/></button>
        <button type="button" aria-label="重播这一步" onClick={() => go(step)}><ArrowClockwise/></button>
        <button type="button" aria-label="下一步" onClick={() => go(step + 1)}><CaretRight/></button>
      </span>
    </div>
  </>;
}
