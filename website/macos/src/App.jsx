import appIconUrl from '../public/assets/app-icon-preview.svg?url';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CaretDown, Check, CircleHalf, Clock, Copy, DeviceMobile, DeviceTablet,
  DownloadSimple, FileText, Laptop, Lock, Microphone, Moon, PaperPlaneTilt, Question, ShieldCheck, Sun
} from '@phosphor-icons/react';
import releaseSnapshot from '../public/release.json';
import { MANIFEST_URL, readRelease } from './release-data.js';
import ReleaseNotes from './ReleaseNotes.jsx';
import InstallationGuide from './InstallationGuide.jsx';
import InputDemo from './InputDemo.jsx';
import { OutputStyles } from './OutputStyles.jsx';
import VoiceLines from './VoiceLines.jsx';
import { useReducedMotion } from './hooks.js';
import { isAndroidDevice, isMobileDevice } from './device.js';

const initialRelease = readRelease(releaseSnapshot);
const faqs = [
  ['提示辅助功能未授权？', '按图开启 Vime 的辅助功能权限，再回到 Vime。如果仍提示未授权，完全退出后重新打开。'],
  ['文字没有写进输入框？', '先点一下要输入的位置，再试一次。无法写入时，Vime 会保留结果并提示复制。已开启本地历史时，也可以在「历史」找回保存的结果。'],
  ['默认服务不可用？', '先检查网络和应用内的服务状态，也可以在设置中填写自己的服务密钥。'],
  ['右 Command 和外接键盘冲突？', '部分外接键盘、远程桌面或改键工具可能拦截右 Command。可以在设置中配置备用快捷键。'],
  ['怎么反馈问题？', '可以发邮件到 kida.wong@gmail.com，请附上 macOS 和 Vime 版本、使用的 App、操作步骤及问题截图。不要发送密码、验证码或完整聊天记录。']
];
const themes = ['auto', 'light', 'dark'];
const themeNames = { auto: '跟随系统', light: '浅色', dark: '深色' };
const themeIcons = { auto: CircleHalf, light: Sun, dark: Moon };
const megabytes = bytes => (bytes / 1e6).toFixed(1);
const SITE_URL = 'https://vimebot.ai/';
const RELEASES_URL = 'https://github.com/imkida/V_IME_releases/releases';
// Sections that can be reached by hash; #whats-new is the release notes' long-standing alias.
const SUPPORT_TARGETS = { guide: 'guide', updates: 'updates', 'whats-new': 'updates', privacy: 'privacy', help: 'help' };

function readDevice() {
  if (typeof navigator === 'undefined') return { mobile: false, android: false };
  return { mobile: isMobileDevice(navigator.userAgent, navigator.maxTouchPoints), android: isAndroidDevice(navigator.userAgent) };
}

function readTheme() {
  try { return themes.includes(localStorage.getItem('vime-theme')) ? localStorage.getItem('vime-theme') : 'auto'; } catch { return 'auto'; }
}

function DownloadButton({ dmg, compact = false, className = '' }) {
  return <a className={'dl' + (compact ? ' compact' : '') + (className ? ' ' + className : '')} href={dmg.url}>
    <DownloadSimple/>下载 Mac 版
  </a>;
}

function DownloadOptions({ release, refreshFailed, onNotice }) {
  const { channel, dmg, zip } = release;
  const [fallback, setFallback] = useState('');
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); onNotice('已复制到剪贴板'); }
    catch { setFallback(value); onNotice('请选中下方内容手动复制'); }
  }
  return <details className="more">
    <summary>其他下载与校验 <CaretDown/></summary>
    <div className="menu">
      <p>其他下载</p>
      {zip && <a href={zip.url}>ZIP 文件 <span className="k">{megabytes(zip.sizeBytes)} MB <ArrowUpRight size={12}/></span></a>}
      {dmg.mirrorUrl && <a href={dmg.mirrorUrl}>备用下载 <span className="k"><ArrowUpRight size={12}/></span></a>}
      <p>文件校验</p>
      <button type="button" onClick={() => copy(dmg.sha256)}>复制 SHA-256 <span className="k"><Copy size={13}/></span></button>
      <button type="button" onClick={() => copy('shasum -a 256 ~/Downloads/' + dmg.name)}>复制校验命令 <span className="k"><Copy size={13}/></span></button>
      <small>v{channel.versionName} beta · build {channel.buildNumber}<br/>DMG · {megabytes(dmg.sizeBytes)} MB · 已通过 macOS 安全检查</small>
      {refreshFailed && <small>暂未获取到最新版本信息，当前为已发布版本。</small>}
      {fallback && <textarea readOnly value={fallback} aria-label="手动复制校验内容" onFocus={event => event.target.select()}/>}
    </div>
  </details>;
}

function SendToMac({ dmg, android, onNotice }) {
  async function send() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Vime for Mac', url: SITE_URL }); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(SITE_URL); onNotice('链接已复制，在 Mac 上打开即可下载'); }
    catch { onNotice('请在 Mac 上访问 vimebot.ai 下载'); }
  }
  return <div className="send">
    <button type="button" className="dl" onClick={send}><PaperPlaneTilt/>发送到 Mac</button>
    <p className="send-note">Vime 是 Mac 应用，请在 Mac 上下载安装</p>
    <a className="send-alt" href={dmg.url}>仍然下载安装包</a>
    {android && <a className="send-alt" href="/android/">在用 Android？查看 Android 版<ArrowRight/></a>}
  </div>;
}

export function App() {
  const showIcpFiling = typeof window !== 'undefined'
    && ['vimebot.com', 'www.vimebot.com'].includes(window.location.hostname.toLowerCase());
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
  const level = useRef(0);
  const [device] = useState(readDevice);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesCut, setNotesCut] = useState(false);
  const notesBody = useRef(null);
  const [faq, setFaq] = useState(-1);
  const [notice, setNotice] = useState('');
  const [showNavDownload, setShowNavDownload] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const action = useRef(null);
  const toastTimer = useRef(null);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setShowNavDownload(!entry.isIntersecting));
    observer.observe(action.current);
    return () => observer.disconnect();
  }, []);
  // Sections arrive with a short lift; anything already on screen stays put.
  useEffect(() => {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (reduced || element.getBoundingClientRect().top < innerHeight) element.classList.add('in');
      else observer.observe(element);
    });
    return () => observer.disconnect();
  }, [reduced]);
  // The page renders after load, so the browser cannot honour an initial hash on its own.
  useEffect(() => {
    const reveal = () => {
      const hash = location.hash.slice(1);
      const target = SUPPORT_TARGETS[hash];
      if (!target) return;
      if (target === 'updates') setNotesOpen(true);
      requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    };
    reveal(); addEventListener('hashchange', reveal);
    return () => removeEventListener('hashchange', reveal);
  }, []);
  // Long notes start clipped with a fade; short ones show in full without a toggle.
  // Re-measured when the card width changes (breakpoints, window resize, late font loading).
  useEffect(() => {
    const element = notesBody.current;
    if (!element) return;
    const measure = () => setNotesCut(element.scrollHeight > 340);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [notes]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function notify(message) { setNotice(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setNotice(''), 3000); }

  function nextTheme() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    try { localStorage.setItem('vime-theme', next); } catch {}
    notify('外观：' + themeNames[next]);
  }
  const soon = () => notify('iOS 版即将推出，上线后在这里下载');
  const ThemeIcon = themeIcons[theme];
  return <>
    <a className="skip-link" href="#main">跳至主要内容</a>
    <header className="header"><div className="wrap">
      <a className="brand" href="#top" aria-label="Vime 首页"><img className="appicon" src={appIconUrl} alt=""/><span>Vime</span></a>
      <div className="plat" aria-label="选择平台"><a href="/" aria-current="page">Mac</a><a href="/android/">Android</a><button type="button" className="soon" onClick={soon}>iOS<em>即将推出</em></button></div>
      <nav className="sections" aria-label="页面导航"><a href="#experience">快捷输入</a><a href="#styles">智能整理</a><a href="#support">初次使用</a><a href="#platforms">其他平台</a></nav>
      <button className="theme" type="button" onClick={nextTheme} aria-label={'切换外观：' + themeNames[theme]} title={'外观：' + themeNames[theme]}><ThemeIcon/></button>
      {!device.mobile && <span className={'nav-dl' + (showNavDownload ? ' show' : '')} inert={!showNavDownload}><DownloadButton dmg={dmg} compact/></span>}
    </div></header>
    <main id="main">
      <div className="hero" id="top">
        <div className="glow a"/>
        <VoiceLines level={level} reduced={reduced}/>
        <div className="wrap">
          <div className="topline"><i/>Vime for macOS<span className="new">{channel.versionName} 已更新</span></div>
          <div className="composition">
            <div className="headline">
              <h1 id="hero-title"><span className="mask"><span>把想法，</span></span><span className="mask"><span>整理成<span className="accent">清晰的表达<span className="ul"/><i aria-hidden="true"/></span></span></span></h1>
              <p className="lede">按住右 ⌘ 说话，松开就得到整理好的文字，直接写进正在用的 App。</p>
            </div>
            <div className="intro" ref={action}>
              {device.mobile ? <SendToMac dmg={dmg} android={device.android} onNotice={notify}/> : <DownloadButton dmg={dmg}/>}
              <p className="meta">v{channel.versionName} beta · {megabytes(dmg.sizeBytes)} MB<br/>macOS {minSystemVersion} 及以上</p>
              {!device.mobile && <DownloadOptions release={release} refreshFailed={refreshFailed} onNotice={notify}/>}
            </div>
          </div>
          <InputDemo reduced={reduced} level={level}/>
        </div>
      </div>
      <OutputStyles reduced={reduced}/>
      <section className="sec" id="support" aria-labelledby="support-title">
        <div className="wrap">
          <div className="shead support-head" data-reveal><h2 id="support-title">初次使用</h2><p>四步开始听写</p></div>
          <div className="help-grid">
            <div className="guide-block" id="guide" data-reveal>
              <InstallationGuide open reduced={reduced}/>
            </div>
            <div className="help-side">
              <div className="card rel" id="updates" data-reveal>
                <span id="whats-new" className="release-anchor" aria-hidden="true"/>
                <h3><FileText className="i"/>最新更新</h3>
                <p className="card-sub">v{channel.versionName} beta · 清单更新 {date}</p>
                <div className={'clamp' + (notesOpen ? ' open' : '') + (notesCut ? ' cut' : '')} id="release-notes" ref={notesBody}>
                  <ReleaseNotes notes={notes}/>
                </div>
                <div className="card-foot">
                  {notesCut && <button type="button" aria-expanded={notesOpen} aria-controls="release-notes" onClick={() => setNotesOpen(!notesOpen)}>{notesOpen ? '收起' : '展开全部'}<CaretDown className={notesOpen ? 'up' : ''}/></button>}
                  <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">查看历史版本<ArrowUpRight/></a>
                </div>
              </div>
              <div className="card" id="privacy" data-reveal>
                <h3><ShieldCheck className="i"/>隐私与服务</h3>
                <p className="plead">默认使用云端服务，也可以换成你自己的。</p>
                <div className="chips"><span><Clock/>本地历史默认关闭</span><span><Microphone/>历史不含录音</span><span><Lock/>密码框不自动写入</span></div>
                <div className="fine">
                  <p>录音发送到当前启用的识别服务；整理、翻译或编辑时，所需文字发送到文本处理服务。</p>
                  <p>保存个人服务密钥后，优先使用你的服务；密钥存放在 macOS 钥匙串。</p>
                  <p>使用 Apple Speech 备用识别时，音频可能由 Apple 处理。</p>
                  <p>有疑问可发邮件至 <a href="mailto:kida.wong@gmail.com">kida.wong@gmail.com</a>。</p>
                </div>
                <p className="card-foot"><a href="/macos/privacy/">阅读隐私政策<ArrowRight/></a></p>
              </div>
            </div>
          </div>
          <div className="card faq" id="help" data-reveal>
            <h3><Question className="i"/>常见问题</h3>
            <div className="faq-list">{faqs.map(([question, answer], index) => <div className={'q' + (faq === index ? ' open' : '')} key={question}>
              <button type="button" aria-expanded={faq === index} aria-controls={'faq-' + index} onClick={() => setFaq(faq === index ? -1 : index)}>{question}<span className="pm" aria-hidden="true"/></button>
              <div className="a" id={'faq-' + index} inert={faq !== index}><div><p>{answer}</p></div></div>
            </div>)}</div>
            <p className="card-foot"><a href="/macos/support/">查看帮助与支持<ArrowRight/></a></p>
          </div>
        </div>
      </section>
      <section className="sec" id="platforms" aria-labelledby="plat-title">
        <div className="wrap">
          <div className="shead" data-reveal><h2 id="plat-title">Mac、Android <span className="nw">都能用，</span><br/><span>iOS 也在路上</span></h2></div>
          <div className="pgrid" data-reveal>
            <a className="pc here" href="/" aria-current="page"><Laptop className="dev" weight="light"/><b>Mac</b><p>macOS {minSystemVersion} 及以上 · 公开测试版</p><span className="go">你正在看</span></a>
            <a className="pc" href="/android/"><DeviceMobile className="dev" weight="light"/><b>Android<span className="tag">已发布</span></b><p>Android 8.0 及以上 · 语音输入法键盘</p><span className="go">了解 Android 版<ArrowRight/></span></a>
            <div className="pc off"><DeviceTablet className="dev" weight="light"/><b>iPhone 与 iPad<span className="tag mute">即将推出</span></b><p>上线后在这里下载</p></div>
          </div>
        </div>
      </section>
      <section className="closing" aria-labelledby="closing-title">
        <div className="cbars" aria-hidden="true">{Array.from({ length: 48 }, (_, index) =>
          <i key={index} style={{ '--h': 30 + Math.abs(Math.sin(index * .47)) * 70 + '%', '--d': -index * .13 + 's' }}/>)}</div>
        <div className="wrap" data-reveal>
          <img className="big" src={appIconUrl} alt=""/>
          <h2 id="closing-title">有想法，<br/><span>Vime 帮你自然表达</span></h2>
          <div className="act">{device.mobile ? <SendToMac dmg={dmg} android={device.android} onNotice={notify}/> : <DownloadButton dmg={dmg}/>}<p>macOS {minSystemVersion}+ · 公开测试版</p></div>
        </div>
      </section>
    </main>
    <footer><div className="wrap">
      <div className="fb"><a href="#top">Vime</a><span>由个人开发维护</span></div>
      <div className="links">
        <a href="/android/">Android 版</a>
        <a href="/macos/privacy/">隐私政策</a>
        <a href="/macos/support/">帮助与支持</a>
        <a href="mailto:kida.wong@gmail.com">联系作者</a>
        <a href="#updates" onClick={() => setNotesOpen(true)}>最新更新</a>
        {showIcpFiling && <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">京ICP备2026046839号-2</a>}
      </div>
    </div></footer>
    <div className={'toast' + (notice ? ' on' : '')} role="status">{notice && <><Check size={16}/> {notice}</>}</div>
  </>;
}
