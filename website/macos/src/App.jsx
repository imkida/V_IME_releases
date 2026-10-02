import appIconUrl from '../public/assets/app-icon-preview.svg?url';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise, ArrowRight, ArrowUpRight, CaretDown, Check, Command, Copy,
  DownloadSimple, FileText, Microphone, Pause, Play,
  Question, ShieldCheck, ChatText, Translate, PencilSimple, Keyboard
} from '@phosphor-icons/react';
import releaseSnapshot from '../public/release.json';
import { MANIFEST_URL, readRelease } from './release-data.js';
import ReleaseNotes from './ReleaseNotes.jsx';
import { modes, originalText, outputStyles } from './product-content';
import InstallationGuide, { MenuBarGuide } from './InstallationGuide';

const initialRelease = readRelease(releaseSnapshot);
const modeIcons = [Microphone, ChatText, Translate, PencilSimple];
const appNames = ['飞书', '微信', 'Slack', 'Chrome', 'Safari', 'Notion', 'VS Code', '终端', '邮件', '备忘录'];
const faqs = [
  ['提示辅助功能未授权？', '按图开启 Vime 的辅助功能权限，再回到 Vime。如果仍提示未授权，完全退出后重新打开。'],
  ['文字没有写进输入框？', '先点一下要输入的位置，再试一次。无法写入时，Vime 会保留结果并提示复制。已开启本地历史时，也可以在「历史」找回保存的结果。'],
  ['默认服务不可用？', '先检查网络和应用内的服务状态，也可以在设置中填写自己的服务密钥。'],
  ['右 Command 和外接键盘冲突？', '部分外接键盘、远程桌面或改键工具可能拦截右 Command。可以在设置中配置备用快捷键。'],
  ['怎么反馈问题？', '可以发邮件到 kida.wong@gmail.com，请附上 macOS 和 Vime 版本、使用的 App、操作步骤及问题截图。不要发送密码、验证码或完整聊天记录。']
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = event => setReduced(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Tabs({ items, value, onChange, name, className = '', render }) {
  const refs = useRef([]);
  return <div className={'tabs ' + className} role="tablist" aria-label={name} style={{ '--active-index': value }}>
    {items.map((item, index) => <button
      key={item.name} ref={element => { refs.current[index] = element; }}
      type="button" role="tab" aria-selected={index === value} tabIndex={index === value ? 0 : -1}
      className={index === value ? 'active' : ''}
      onClick={() => onChange(index)}
      onKeyDown={event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = items.length - 1;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + items.length - 1) % items.length;
        if (next !== undefined) { event.preventDefault(); onChange(next); refs.current[next]?.focus(); }
      }}>{render ? render(item, index) : item.name}</button>)}
  </div>;
}

function DownloadButton({ dmg, compact = false }) {
  return <a className={'download-button' + (compact ? ' compact' : '')} href={dmg.url}>
    <DownloadSimple size={compact ? 16 : 20}/><span>下载 Mac 版</span>
  </a>;
}

function DownloadOptions({ release, refreshFailed, onNotice }) {
  const { channel, dmg, zip } = release;
  const [open, setOpen] = useState(false);
  const [fallback, setFallback] = useState('');
  const container = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); onNotice('已复制到剪贴板'); }
    catch { setFallback(value); onNotice('请选中下方内容手动复制'); }
  }
  return <div className={'download-options' + (open ? ' open' : '')} ref={container}>
    <button type="button" className="more-download" aria-expanded={open} aria-controls="download-menu" onClick={() => setOpen(!open)}>其他下载与校验 <CaretDown size={13}/></button>
    <div className="download-menu" id="download-menu" inert={!open}>
      <p>其他下载</p>
      {zip && <a href={zip.url}>ZIP 文件 <span>{(zip.sizeBytes / 1e6).toFixed(1)} MB <ArrowUpRight size={14}/></span></a>}
      {dmg.mirrorUrl && <a href={dmg.mirrorUrl}>备用下载 <ArrowUpRight size={14}/></a>}
      <p>文件校验</p>
      <button type="button" onClick={() => copy(dmg.sha256)}>复制 SHA-256 <Copy size={15}/></button>
      <button type="button" onClick={() => copy('shasum -a 256 ~/Downloads/' + dmg.name)}>复制校验命令 <Copy size={15}/></button>
      <small>v{channel.versionName} beta · build {channel.buildNumber}<br/>DMG · {(dmg.sizeBytes / 1e6).toFixed(1)} MB · 已通过 macOS 安全检查</small>
      {refreshFailed && <small>暂未获取到最新版本信息，当前为已发布版本。</small>}
      {fallback && <textarea readOnly value={fallback} aria-label="手动复制校验内容" onFocus={event => event.target.select()}/>}
    </div>
  </div>;
}

function Waveform({ active, compact = false }) {
  const heights = [9,15,23,13,29,38,20,13,30,43,27,18,34,24,14,29,39,17,10,22,14];
  return <span className={'waveform' + (active ? ' active' : '') + (compact ? ' small' : '')} aria-hidden="true">
    {heights.map((height, index) => <i key={index} style={{ '--bar-height': height + 'px', '--delay': index * -0.071 + 's' }}/>)}
  </span>;
}

function KeyScene({ mode, phase, listeningTime, stoppedTime }) {
  const starting = phase === 'listening' && listeningTime < 170;
  const secondTap = mode === 1 && phase === 'listening' && listeningTime >= 280 && listeningTime < 460;
  const ending = mode !== 0 && phase === 'stopped' && stoppedTime < 190;
  const pressed = mode === 0 ? phase === 'listening' : starting || secondTap || ending;
  const instruction = phase === 'listening' ? (mode === 0 ? '说完松开' : '再按一下，结束听写') : phase === 'stopped' ? (mode === 0 ? '松开，结束听写' : '单击，结束听写') : (mode === 0 ? '说完松开' : '说完再按一下');
  return <div className={'key-scene phase-' + phase + (pressed ? ' is-pressed' : '') + (mode > 1 && starting ? ' combo-pressed' : '')}>
    <div className="keys" aria-hidden="true">
      <div className="command-key"><span className="key-small">command</span><Command weight="regular"/><span className="key-side">右</span></div>
      {modes[mode].key && <><span className="key-plus">+</span><div className="punctuation-key" key={mode}>{modes[mode].key}</div></>}
      {mode === 1 && <span className="double-tap">× 2</span>}
    </div>
    <div className="key-instruction"><span className="key-caption">{modes[mode].gesture}</span><span className="key-phase">{instruction}</span></div>
  </div>;
}

function InputDemo({ reduced }) {
  const [mode, setMode] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const container = useRef(null);
  const sample = modes[mode];
  // Let the hero settle first; leave a readable hold after the last spoken word.
  const readyDuration = cycle === 0 ? 1600 : 450;
  const listeningDuration = Math.max(2400, sample.spoken.length * 90 + 1200);
  const stoppedAt = readyDuration + listeningDuration;
  const processingAt = stoppedAt + 650;
  const typingAt = processingAt + 900;
  const writingDuration = Math.max(1200, sample.output.length * 28);
  const totalDuration = typingAt + writingDuration;
  const done = reduced || elapsed >= totalDuration;
  const phase = done ? 'done' : elapsed < readyDuration ? 'ready' : elapsed < stoppedAt ? 'listening' : elapsed < processingAt ? 'stopped' : elapsed < typingAt ? 'processing' : 'typing';
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .25 });
    observer.observe(container.current);
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => {
    if (reduced || paused || !visible || !pageVisible || done) return;
    const start = performance.now();
    const initialElapsed = elapsed;
    const timer = setInterval(() => setElapsed(Math.min(initialElapsed + performance.now() - start, totalDuration)), 35);
    return () => clearInterval(timer);
  }, [reduced, paused, visible, pageVisible, cycle, done]);
  const status = phase === 'ready' ? '准备说话' : phase === 'listening' ? '正在听写' : phase === 'stopped' ? '听写已结束' : phase === 'processing' ? (mode === 2 ? '正在翻译' : mode === 3 ? '正在修改' : '正在整理') : phase === 'typing' ? '正在写入' : sample.resultLabel;
  const output = done ? sample.output : phase === 'typing' ? sample.output.slice(0, Math.ceil(sample.output.length * (elapsed - typingAt) / writingDuration)) : '';
  const speechProgress = Math.min(1, Math.max(0, (elapsed - readyDuration - 400) / (listeningDuration - 1200)));
  const spoken = phase === 'ready' ? '…' : phase === 'listening' ? sample.spoken.slice(0, Math.ceil(sample.spoken.length * speechProgress)) || '…' : sample.spoken;
  function choose(index) {
    setMode(index); setElapsed(0); setCycle(value => value + 1); setPaused(false);
    if (container.current.getBoundingClientRect().bottom > window.innerHeight) {
      container.current.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }
  }
  function replay() { choose(mode); }
  return <section className={'input-experience phase-' + phase} id="experience" ref={container} aria-labelledby="shortcut-title">
    <div className="experience-caption"><h2 id="shortcut-title">好用的快捷输入</h2>        <button type="button" className="play-control" onClick={() => done ? replay() : setPaused(!paused)} aria-label={done ? '重播演示' : paused ? '继续演示' : '暂停演示'}>
          {done ? <ArrowClockwise size={17}/> : paused ? <Play size={17}/> : <Pause size={17}/>}<span>{done ? '重播' : paused ? '继续' : '暂停'}</span>
        </button></div>
    <div className="stage-frame">
      <Tabs items={modes} value={mode} onChange={choose} name="快捷输入演示" className="mode-dock" render={(item, index) => {
        const Icon = modeIcons[index];
        return <><Icon size={20}/><span className="mode-name">{item.name}</span></>;
      }}/>
      <div className="stage-main">
        <KeyScene mode={mode} phase={phase} listeningTime={elapsed - readyDuration} stoppedTime={elapsed - stoppedAt}/>
        <div className="editor-scene">
          <div className="speech-panel">
            <div className="speech-heading"><span><Microphone size={15}/>你说</span><Waveform active={phase === 'listening' && !paused} compact/></div>
            <div className={'speech-copy' + (phase === 'ready' ? ' waiting' : '')} aria-live="off">
              {modes.map(item => <p className="measure-copy" aria-hidden="true" key={item.name}>{item.spoken}</p>)}
              <p>{spoken}</p>
            </div>
          </div>
          <div className="editor-window">
            <div className="editor-top"><div className="window-dots" aria-hidden="true"><i/><i/><i/></div><span key={mode}>{mode === 3 ? (['typing','done'].includes(phase) ? '修改后的文字' : '选中的文字') : sample.context}</span></div>
            <div className="editor-body">
              <div className={'editor-copy' + (phase === 'processing' ? ' processing' : '')} aria-live="off">
                {modes.map((item, index) => <span className="measure-copy" aria-hidden="true" key={index}>{item.output}</span>)}
                {['ready','listening','stopped','processing'].includes(phase) && <span className={mode === 3 ? 'selected-copy' : 'editor-placeholder'}>{mode === 3 && sample.selected}<i className="text-caret"/></span>}
                {(phase === 'typing' || done) && <span className="editor-result" key={mode}>{output}<i className={'text-caret' + (done ? ' resting' : '')}/></span>}
              </div>
              <div className="editor-bottom"><span className="hud-status" role="status">{done ? <Check size={16} weight="bold"/> : phase === 'processing' ? <span className="processing-ring"/> : <span className={'result-dot' + (phase === 'listening' ? ' recording' : '')}/>}<span>{status}</span></span><span className="editor-return" aria-hidden="true">↵</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="scene-progress" aria-hidden="true"><span style={{ transform: 'scaleX(' + (done ? 1 : elapsed / totalDuration) + ')' }}/></div>
    </div>
    <p className="demo-note">页面演示，不会录音</p>
  </section>;
}

function OutputStyles() {
  const [style, setStyle] = useState(0);
  const active = outputStyles[style];
  const parts = active.focus ? active.output.split(active.focus) : [active.output];
  return <section className="styles-section" id="styles" aria-labelledby="styles-title">
    <div className="section-heading" data-reveal><h2 id="styles-title">智能整理，<br/><span>但保持你的表达风格</span></h2></div>
    <div className="style-workspace" data-reveal>
      <div className="original-copy"><span className="field-label"><Microphone size={17}/>你说</span><p>{originalText}</p></div>
      <div className="style-result-layout">
        <div className="style-controls">
          <Tabs items={outputStyles} value={style} onChange={setStyle} name="输出风格" className="style-tabs" render={item => <><span>{item.name}</span><small>{item.short}</small><ArrowRight size={18}/></>}/>
          <p className="style-shortcut"><span><Keyboard size={16}/>右 ⌘ + 右 ⌥</span><span>快速切换表达风格</span></p>
        </div>
        <div className="result-copy">
          <span className="field-label"><ArrowRight size={16}/>Vime</span>
          <div className="style-output" aria-live="polite">
            {outputStyles.map((item,index) => <p className="measure-copy" aria-hidden="true" key={index}>{item.output}</p>)}
            <p className="style-output-text">{parts[0]}{active.focus && <><mark key={style}>{active.focus}</mark>{parts[1]}</>}</p>
          </div>

        </div>
      </div>
    </div>
  </section>;
}

function Accordion({ id, title, summary, Icon, open, onToggle, children, className = '' }) {
  return <section className={'accordion ' + className + (open ? ' open' : '')} id={id}>
    <h3><button type="button" className="accordion-trigger" aria-expanded={open} aria-controls={id + '-content'} onClick={onToggle}>
      {Icon && <Icon className="row-icon" size={21}/>}<span className="accordion-title">{title}</span>
      {summary && <span className="accordion-summary">{summary}</span>}<CaretDown className="chevron" size={17}/>
    </button></h3>
    <div className="accordion-grid" inert={!open}><div><div className="accordion-content" id={id + '-content'}>{children}</div></div></div>
  </section>;
}

export function App() {
  const [release, setRelease] = useState(initialRelease);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const { channel, dmg, minSystemVersion, date, notes } = release;
  useEffect(() => {
    const controller = new AbortController();
    fetch(MANIFEST_URL, { cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Release manifest unavailable');
        return response.json();
      })
      .then(manifest => setRelease(readRelease(manifest)))
      .catch(() => { if (!controller.signal.aborted) setRefreshFailed(true); });
    return () => controller.abort();
  }, []);
  const reduced = useReducedMotion();
  const [support, setSupport] = useState('');
  const [step, setStep] = useState(0);
  const [faq, setFaq] = useState(-1);
  const [notice, setNotice] = useState('');
  const [showNavDownload, setShowNavDownload] = useState(false);
  const action = useRef(null);
  const supportPanel = useRef(null);
  const toastTimer = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setShowNavDownload(!entry.isIntersecting));
    observer.observe(action.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (reduced) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('entered'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [reduced]);
  useEffect(() => {
    const update = () => { const hash = location.hash.slice(1); if (hash === 'whats-new') setSupport('updates'); else if (['guide','updates','help','privacy'].includes(hash)) setSupport(hash); };
    update(); addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    if (support === 'updates' && ['updates', 'whats-new'].includes(location.hash.slice(1))) {
      document.getElementById('updates').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [support]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function notify(message) { setNotice(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setNotice(''), 3000); }
  function openSupport(event, id) {
    event.preventDefault();
    setSupport(id);
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    supportPanel.current.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }
  function showGuide(event, index) {
    setStep(index);
    openSupport(event, 'guide');
    requestAnimationFrame(() => document.getElementById('guide-step-' + index).focus({ preventScroll: true }));
  }
  return <>
    <a className="skip-link" href="#main">跳至主要内容</a>
    <header className="header"><div className="nav-wrap">
      <a className="brand" href="#top" aria-label="Vime 首页"><img src={appIconUrl} alt=""/><span>Vime</span></a>
      <nav aria-label="页面导航"><a href="#experience">快捷输入</a><a href="#styles">智能整理</a><a href="#guide" onClick={event => openSupport(event, 'guide')}>初次使用</a></nav>
      <div className={'nav-download' + (showNavDownload ? ' visible' : '')} inert={!showNavDownload}><DownloadButton dmg={dmg} compact/></div>
    </div></header>
    <main id="main">
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-topline"><span><i/>Vime for macOS</span></div>
        <div className="hero-composition">
          <h1 id="hero-title"><span className="headline-mask"><span>把想法，</span></span><span className="headline-mask"><span>整理成<span className="hero-accent">清晰的表达<i aria-hidden="true"/></span></span></span></h1>
          <div className="hero-intro"><div className="hero-action" ref={action}><DownloadButton dmg={dmg}/><span className="release-meta">v{channel.versionName} beta · {(dmg.sizeBytes / 1e6).toFixed(1)} MB<span>macOS {minSystemVersion} 及以上</span></span><DownloadOptions release={release} refreshFailed={refreshFailed} onNotice={notify}/></div></div>
        </div>
        <InputDemo reduced={reduced}/>
        <div className="app-context" data-reveal><p>日常应用均已支持</p><div>{appNames.map(name => <span key={name}>{name}</span>)}</div></div>
      </section>
      <OutputStyles/>
      <section className="support" aria-label="安装与使用帮助" ref={supportPanel}>
        <div className="support-heading" data-reveal><h2>初次使用</h2></div>
        <div className="support-rows" data-reveal>
          <Accordion id="guide" title="安装与设置" summary="四步开始听写" Icon={Play} open={support === 'guide'} onToggle={() => setSupport(support === 'guide' ? '' : 'guide')}>
            <InstallationGuide step={step} onStepChange={setStep} open={support === 'guide'}/>
          </Accordion>
          <span id="whats-new" className="release-anchor" aria-hidden="true"/>
          <Accordion id="updates" title="最新更新" summary={'v' + channel.versionName + ' beta · 清单更新 ' + date} Icon={FileText} open={support === 'updates'} onToggle={() => setSupport(support === 'updates' ? '' : 'updates')}>
            <ReleaseNotes notes={notes}/>
          </Accordion>
          <Accordion id="privacy" title="隐私与服务" summary="可使用自有 API，历史记录仅保存本地" Icon={ShieldCheck} open={support === 'privacy'} onToggle={() => setSupport(support === 'privacy' ? '' : 'privacy')}>
            <div className="privacy-detail">
              <p>以下说明适用于 Vime for macOS。</p>
              <h4>语音与文字如何处理</h4>
              <p>Vime 默认使用云端服务。本次录音会发送到当前启用的识别服务；整理、翻译或编辑时，所需的识别文字、选中文本和修改要求会发送到文本处理服务。保存个人服务密钥后，会优先使用个人服务，可在设置中查看和调整。</p>
              <p>使用 Apple Speech 备用识别时，音频可能由 Apple 处理。是否能在本机完成识别，取决于系统、语言和相关设置。</p>
              <h4>保存在这台 Mac 上的信息</h4>
              <p>本地历史默认关闭。开启后，识别文字、最终结果、使用时间和目标应用等信息保存在本机，历史记录不保存录音文件。点击菜单栏的 Vime 图标，进入「历史」即可查看、复制或删除。</p>
              <p>在设置中关闭本地历史后，不再新增记录；已有记录需另行删除。个人服务密钥保存在 macOS 钥匙串中，用于向所选服务鉴权。</p>
              <h4>系统权限与你的选择</h4>
              <p>麦克风用于你主动发起的听写；辅助功能用于读取选中文本和写入结果。使用 Apple Speech 时还需要语音识别权限。识别到密码等敏感输入框时，Vime 会阻止自动写入。</p>
              <p>你可以随时停止听写，也可以在「系统设置 → 隐私与安全性」管理这些权限。</p>
              <h4>联系作者</h4>
              <p>对数据处理有疑问，可发送邮件至 <a href="mailto:kida.wong@gmail.com">kida.wong@gmail.com</a>。</p>
            </div>
          </Accordion>
          <Accordion id="help" title="常见问题" summary="权限、服务与输入问题" Icon={Question} open={support === 'help'} onToggle={() => setSupport(support === 'help' ? '' : 'help')}>
            <div className="faq-list">{faqs.map(([question,answer],index) =>
              <Accordion key={question} id={'faq-' + index} title={question} open={faq === index} onToggle={() => setFaq(faq === index ? -1 : index)} className="faq-item">
                <p>{answer}</p>
                {index === 0 && <a href="#guide" onClick={event => showGuide(event, 1)}>查看权限示意 <ArrowRight size={14}/></a>}
                {index === 1 && <MenuBarGuide historyHint/>}
                {index === 2 && <a href="#guide" onClick={event => showGuide(event, 2)}>查看服务配置示意 <ArrowRight size={14}/></a>}
                {index === faqs.length - 1 && <a href="mailto:kida.wong@gmail.com">联系作者 <ArrowUpRight size={14}/></a>}
              </Accordion>
            )}</div>
          </Accordion>
        </div>
      </section>
      <section className="closing" aria-labelledby="closing-title"><div data-reveal><img src={appIconUrl} alt="" className="closing-icon"/><h2 id="closing-title">有想法，<br/><span>Vime 帮你<wbr/><span className="closing-phrase">自然表达</span></span></h2><div className="closing-action"><DownloadButton dmg={dmg}/><p>macOS {minSystemVersion}+ · 公开测试版</p></div></div></section>
    </main>
    <footer className="footer"><div className="footer-brand"><a href="#top">Vime</a><span>由个人开发维护</span></div><div className="footer-links"><a href="#privacy" onClick={event => openSupport(event, 'privacy')}>隐私说明</a><a href="#help" onClick={event => openSupport(event, 'help')}>帮助与支持</a><a href="mailto:kida.wong@gmail.com">联系作者</a><a href="#updates" onClick={event => openSupport(event, 'updates')}>最新更新</a></div></footer>
    <div className={'toast' + (notice ? ' visible' : '')} role="status">{notice && <><Check size={16}/>{notice}</>}</div>
  </>;
}
