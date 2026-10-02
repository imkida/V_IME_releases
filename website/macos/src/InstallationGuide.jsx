import appIconUrl from '../public/assets/app-icon-preview.svg?url';
import { useState } from 'react';
import {
  AppStoreLogo, ArrowClockwise, ArrowRight, CaretRight, Check, Command, Cursor,
  Folder, GearSix, Microphone, ShieldCheck
} from '@phosphor-icons/react';
import './InstallationGuide.css';

const steps = [
  { title: '安装并启动', window: 'Vime 安装', caption: '打开 DMG，拖入 Applications，再从应用程序中启动。' },
  { title: '允许录音和输入', window: '系统设置', caption: '分别打开麦克风和辅助功能中的 Vime 开关，再回到 Vime。' },
  { title: '确认服务配置', window: 'Vime 设置', caption: '默认服务可直接试用；有自己的 API Key 再填写。' },
  { title: '用右 ⌘ 输入', window: '给团队的消息', caption: '点进输入框，按住右 Command 说话，松开后写入。' }
];

export function MenuBarGuide({ historyHint = false }) {
  return <figure className={'menu-entry' + (historyHint ? ' history-hint' : '')}>
    <figcaption>{historyHint ? '从菜单栏打开「历史」' : '启动后，在菜单栏找到 Vime'}</figcaption>
    <div className="menu-entry-picture" role="img" aria-label="点击屏幕顶部菜单栏的 Vime 图标，展开的面板底部有历史、设置和退出入口。">
      <div className="menu-entry-bar"><span>菜单栏</span><span className="menu-entry-trigger"><span className="menu-entry-logo" aria-hidden="true"/></span></div>
      <div className="menu-entry-popover"><span className={historyHint ? 'highlight' : ''}>历史</span><span className={!historyHint ? 'highlight' : ''}>设置</span><span>退出</span></div>
    </div>
  </figure>;
}

function InstallScene() {
  return <div className="install-scene" role="img" aria-label="将左侧 Vime 应用拖到右侧 Applications 文件夹，然后从应用程序中启动。">
    <div className="install-drag-row" aria-hidden="true">
      <div className="install-item"><img className="install-app" src={appIconUrl} alt=""/><span>Vime</span></div>
      <div className="install-direction"><ArrowRight size={31} weight="light"/><span>拖入</span></div>
      <div className="install-item install-destination"><span className="install-folder"><Folder size={72} weight="fill"/><AppStoreLogo className="folder-app-mark" size={28}/><Check className="install-done" size={21} weight="bold"/></span><span>Applications</span></div>
      <div className="install-drag-copy"><img src={appIconUrl} alt=""/><Cursor size={24} weight="fill"/></div>
    </div>
    <div className="install-launch" aria-hidden="true"><Folder size={15}/><span>应用程序</span><CaretRight size={12}/><img src={appIconUrl} alt=""/><span>Vime</span><span className="install-launch-label">双击启动</span></div>
  </div>;
}

function PermissionScene() {
  return <div className="permission-scene" role="img" aria-label="在系统设置的隐私与安全性中，分别进入麦克风和辅助功能，开启各自的 Vime 开关。">
    <div className="guide-location" aria-hidden="true"><ShieldCheck size={15}/>隐私与安全性</div>
    <div className="permission-pages" aria-hidden="true">
      {[{ name: '麦克风', purpose: '录音', Icon: Microphone }, { name: '辅助功能', purpose: '输入文字', Icon: ShieldCheck }].map(({ name, purpose, Icon }) => <div className="permission-page" key={name}>
        <div className="permission-page-title"><span><Icon size={14}/>{name}</span><small>{purpose}</small></div>
        <div className="permission-app"><img src={appIconUrl} alt=""/><span>Vime</span><span className="permission-toggle"><i/></span></div>
      </div>)}
    </div>
  </div>;
}

function ServiceScene() {
  return <div className="service-scene" role="img" aria-label="从菜单栏打开设置，确认默认云端服务；个人 API Key 为可选项，保存后优先使用个人服务。">
    <div className="guide-location" aria-hidden="true"><GearSix size={15}/>服务配置</div>
    <div className="guide-service-ready" aria-hidden="true"><span className="guide-ready-icon"><Check size={17} weight="bold"/></span><div><strong>默认云端服务</strong><span>可直接试用</span></div></div>
    <div className="guide-personal-service" aria-hidden="true">
      <div className="guide-field-label">个人服务密钥<span>可选</span></div>
      <div className="guide-key-field"><span><small>API Key</small>••••••••••••</span><span className="guide-save-key">保存</span></div>
      <div className="guide-key-note"><ArrowRight size={13}/>保存后优先使用个人服务</div>
    </div>
  </div>;
}

function DictationScene() {
  return <div className="guide-dictation" role="img" aria-label="先点进输入框，按住右 Command 说话，松开后，Vime 将明天的评审改到下午三点写入输入框。">
    <div className="guide-gesture" aria-hidden="true">
      <kbd className="guide-command"><small>command</small><Command size={28}/><span>右</span></kbd>
      <div className="guide-hold"><span className="guide-wave">{[11,21,16,30,23,34,19,27,14,22,12].map((height,index) => <i key={index} style={{ '--height': height + 'px', '--delay': index * -.07 + 's' }}/>)}</span><span>按住说话</span></div>
      <ArrowRight className="guide-release-arrow" size={21}/><span className="guide-release">松开</span>
    </div>
    <div className="guide-message" aria-hidden="true"><p>明天的评审改到下午三点。</p><span><Check size={14}/>已写入</span></div>
  </div>;
}

const scenes = [InstallScene, PermissionScene, ServiceScene, DictationScene];

export default function InstallationGuide({ step, onStepChange, open }) {
  const [replay, setReplay] = useState(0);
  const Scene = scenes[step];
  return <div className="guide-layout">
    <div className="guide-steps" role="tablist" aria-label="安装步骤" aria-orientation="vertical">
      {steps.map((item, index) => <button type="button" role="tab" id={'guide-step-' + index} aria-label={index === 3 ? '04 用右 Command 输入' : undefined} aria-controls="guide-step-panel" aria-selected={step === index} tabIndex={step === index ? 0 : -1} className={'step' + (step === index ? ' active' : '')} key={item.title} onClick={() => onStepChange(index)} onKeyDown={event => {
        let next;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % steps.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + steps.length - 1) % steps.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = steps.length - 1;
        if (next !== undefined) { event.preventDefault(); onStepChange(next); event.currentTarget.parentNode.children[next].focus(); }
      }}><span>{String(index + 1).padStart(2,'0')}</span>{item.title}<ArrowRight size={15}/></button>)}
    </div>
    <MenuBarGuide/>
    <div className="guide-detail" role="tabpanel" id="guide-step-panel" aria-labelledby={'guide-step-' + step} tabIndex={0}>
      <div className="guide-window">
        <div className="guide-window-bar"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span>{steps[step].window}</span><span className="guide-window-tag">操作示意</span></div>
        <div className="guide-window-content" key={step + '-' + replay + '-' + open}>{open && <Scene/>}</div>
      </div>
      <div className="guide-caption"><p>{steps[step].caption}</p>{step !== 2 && <button type="button" className="guide-replay" onClick={() => setReplay(value => value + 1)} aria-label="重播操作示意"><ArrowClockwise size={15}/><span>重播</span></button>}</div>
    </div>
  </div>;
}
